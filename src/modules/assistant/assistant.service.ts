import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExecuteActionsDto } from './dto/execute-actions.dto';
import {
  ActionResultDto,
  CreateEntitiesResponseDto,
  EntityStatus,
  EntityType,
} from './dto/action-result.dto';
import { TaskExecutor } from './executors/task.executor';
import { ProjectExecutor } from './executors/project.executor';
import { NoteExecutor } from './executors/note.executor';
import { PlannerExecutor } from './executors/planner.executor';
import { ExecutorContext } from './executors/base.executor';
import { validateAIOutput } from './utils/output-validation.util';

interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface AiResponse {
  reply: string;
  tool_calls: AiToolCall[];
}

@Injectable()
export class AssistantService {
  private readonly executors: Map<
    EntityType,
    TaskExecutor | ProjectExecutor | NoteExecutor | PlannerExecutor
  >;
  private readonly toolToEntityMap: Record<string, EntityType>;

  constructor(private readonly prisma: PrismaService) {
    this.executors = new Map();
    this.executors.set(EntityType.TASK, new TaskExecutor());
    this.executors.set(EntityType.PROJECT, new ProjectExecutor());
    this.executors.set(EntityType.NOTE, new NoteExecutor());
    this.executors.set(EntityType.PLANNER_ENTRY, new PlannerExecutor());

    // Map AI tool names to entity types
    this.toolToEntityMap = {
      create_task: EntityType.TASK,
      create_project: EntityType.PROJECT,
      create_note: EntityType.NOTE,
      create_planner_entry: EntityType.PLANNER_ENTRY,
    };
  }

  async chat(userId: string, prompt: string) {
    // Gather context: active tasks and projects
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        deadline: true,
        status: true,
      },
    });

    const projects = await this.prisma.project.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PLANNING'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        deadline: true,
      },
    });

    const context = { tasks, projects };

    let aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    aiUrl = aiUrl.replace('localhost', '127.0.0.1');
    const aiToken = process.env.AI_SERVICE_TOKEN || 'gadangganteng';

    try {
      const response = await fetch(`${aiUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiToken}`,
        },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with ${response.status}`);
      }

      const result = (await response.json()) as { data: unknown };
      const aiResponse = result.data; // Unwrap: return { reply, action, action_data } directly

      // Validate AI output to prevent hallucination
      const validation = validateAIOutput(aiResponse, prompt);
      if (!validation.isValid) {
        console.warn('AI output validation failed:', validation.reason);
        return {
          reply:
            validation.cleanedReply ||
            'Maaf, saya mengalami kesulitan memahami permintaan Anda. Bisa tolong jelaskan lebih spesifik tentang task atau proyek yang ingin Anda buat?',
          action: null,
          action_data: null,
        };
      }

      return aiResponse;
    } catch (error) {
      console.error('Error communicating with AI service:', error);
      throw new InternalServerErrorException(
        'Failed to communicate with AI Assistant',
      );
    }
  }

  async createEntities(
    userId: string,
    dto: ExecuteActionsDto,
  ): Promise<CreateEntitiesResponseDto> {
    // Gather context dari DB untuk fuzzy matching
    const [projects, folders, tasks] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId, status: { in: ['ACTIVE', 'PLANNING'] } },
        select: { id: true, title: true },
      }),
      this.prisma.noteFolder.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
      this.prisma.task.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        select: { id: true, title: true },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const aiContext = {
      projects: projects.map((p) => ({ id: p.id, title: p.title })),
      folders: folders.map((f) => ({ id: f.id, name: f.name })),
      recentTasks: tasks.map((t) => ({ id: t.id, title: t.title })),
      today: new Date().toISOString().split('T')[0],
    };

    let aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    aiUrl = aiUrl.replace('localhost', '127.0.0.1');
    const aiToken = process.env.AI_SERVICE_TOKEN || 'gadangganteng';

    let aiResponse: AiResponse;
    try {
      const response = await fetch(`${aiUrl}/api/assistant/create-entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiToken}`,
        },
        body: JSON.stringify({
          prompt: dto.prompt,
          context: aiContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with ${response.status}`);
      }

      const result = (await response.json()) as { data: AiResponse };
      aiResponse = result.data;

      // Validate AI output to prevent hallucination
      const validation = validateAIOutput(aiResponse, dto.prompt);
      if (!validation.isValid) {
        console.warn('AI output validation failed:', validation.reason);
        return {
          reply:
            validation.cleanedReply ||
            'Maaf, saya mengalami kesulitan memahami permintaan Anda. Bisa tolong jelaskan lebih spesifik tentang task atau proyek yang ingin Anda buat?',
          entities: [],
        };
      }
    } catch (error) {
      console.error('Error communicating with AI service:', error);
      throw new InternalServerErrorException(
        'Failed to communicate with AI Assistant',
      );
    }

    // Sort tool calls: project dulu, lalu entity lain (dependency order)
    const sortedCalls = this.sortByDependency(aiResponse.tool_calls || []);

    // Execute via executors
    const executorContext: ExecutorContext = {
      prisma: this.prisma,
      userId,
      recentProjectNames: new Map(),
      recentFolderNames: new Map(),
      recentTaskNames: new Map(),
    };

    const entities: ActionResultDto[] = [];
    for (const tc of sortedCalls) {
      const entityType = this.toolToEntityMap[tc.name];
      const executor = entityType ? this.executors.get(entityType) : undefined;

      if (!executor) {
        entities.push({
          type: entityType || EntityType.TASK,
          title: 'Unknown',
          status: EntityStatus.FAILED,
          error: `Unknown tool: ${tc.name}`,
        });
        continue;
      }

      try {
        const result = await executor.execute(tc.arguments, executorContext);
        entities.push(result);

        // Log ke ActivityLog kalau berhasil
        if (result.status === EntityStatus.PENDING_CONFIRMATION && result.id) {
          await this.logActivity(userId, result);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        entities.push({
          type: executor.type,
          title:
            typeof tc.arguments?.title === 'string'
              ? tc.arguments.title
              : 'Untitled',
          status: EntityStatus.FAILED,
          error: message,
        });
      }
    }

    return {
      reply: aiResponse.reply || '',
      entities,
    };
  }

  private sortByDependency(calls: AiToolCall[]): AiToolCall[] {
    // Project dulu, lalu sisanya (sesuai urutan aslinya)
    const projects = calls.filter((c) => c.name === 'create_project');
    const others = calls.filter((c) => c.name !== 'create_project');
    return [...projects, ...others];
  }

  private async logActivity(userId: string, result: ActionResultDto) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await (this.prisma as any).activityLog.create({
        data: {
          userId,
          action: 'AI_CREATE',
          entityType: result.type.toUpperCase(),
          entityId: result.id!,
          details: { pendingConfirmation: true },
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Non-blocking
    }
  }
}
