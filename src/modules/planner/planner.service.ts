import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface PlannerEntryData {
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  category?: string;
  taskId?: string;
  isAiGenerated?: boolean;
  aiReason?: string;
  color?: string;
}

interface AiTimeBlock {
  date?: string;
  task_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  reason: string;
}

interface AiPlanResponse {
  focus_message: string;
  blocks: AiTimeBlock[];
  workload_level: string;
}

const CALM_COLORS = [
  '#818cf8',
  '#6366f1',
  '#4f46e5',
  '#2dd4bf',
  '#0ea5e9',
  '#a78bfa',
];

@Injectable()
export class PlannerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: PlannerEntryData) {
    return this.prisma.plannerEntry.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        category: dto.category ?? 'FOCUS',
        taskId: dto.taskId ?? null,
        isAiGenerated: dto.isAiGenerated ?? false,
        aiReason: dto.aiReason ?? null,
        color:
          dto.color ??
          CALM_COLORS[Math.floor(Math.random() * CALM_COLORS.length)],
      },
    });
  }

  async findAll(
    userId: string,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Record<string, unknown> = { userId };

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      where.date = {
        gte: d,
        lt: new Date(d.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      where.date = {
        gte: start,
        lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    return this.prisma.plannerEntry.findMany({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: where as any,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        task: {
          select: { id: true, title: true, priority: true, status: true },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const entry = await this.prisma.plannerEntry.findFirst({
      where: { id, userId },
      include: {
        task: {
          select: { id: true, title: true, priority: true, status: true },
        },
      },
    });
    if (!entry) throw new NotFoundException('Planner entry not found');
    return entry;
  }

  async update(userId: string, id: string, dto: Partial<PlannerEntryData>) {
    const entry = await this.prisma.plannerEntry.findFirst({
      where: { id, userId },
    });
    if (!entry) throw new NotFoundException('Planner entry not found');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.taskId !== undefined) data.taskId = dto.taskId;
    if (dto.isAiGenerated !== undefined) data.isAiGenerated = dto.isAiGenerated;
    if (dto.aiReason !== undefined) data.aiReason = dto.aiReason;
    if (dto.color !== undefined) data.color = dto.color;

    // Reset googleEventId when title/date/time changes so next sync updates Google Calendar
    if (
      dto.title !== undefined ||
      dto.date !== undefined ||
      dto.startTime !== undefined ||
      dto.endTime !== undefined
    ) {
      data.googleEventId = null;
    }

    return this.prisma.plannerEntry.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: data as any,
      include: {
        task: {
          select: { id: true, title: true, priority: true, status: true },
        },
      },
    });
  }

  async remove(userId: string, id: string) {
    const entry = await this.prisma.plannerEntry.findFirst({
      where: { id, userId },
    });
    if (!entry) throw new NotFoundException('Planner entry not found');

    await this.prisma.plannerEntry.delete({ where: { id } });
    return { deleted: true, googleEventId: entry.googleEventId };
  }

  async generate(
    userId: string,
    energyLevel: string,
    mood: string,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
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
        estimate: true,
        project: { select: { title: true } },
      },
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
    });

    if (tasks.length === 0) {
      return { blocks: [], focus_message: null, workload_level: 'NONE' };
    }

    const aiResult = await this.callAiService(
      energyLevel,
      mood,
      tasks,
      startDate,
      endDate,
    );

    // Delete previous AI-generated entries
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      await this.prisma.plannerEntry.deleteMany({
        where: {
          userId,
          date: {
            gte: start,
            lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
          },
          isAiGenerated: true,
        },
      });
    } else {
      const planDate = date ? new Date(date) : this.startOfToday();
      await this.prisma.plannerEntry.deleteMany({
        where: {
          userId,
          date: planDate,
          isAiGenerated: true,
        },
      });
    }

    // Create new entries from AI blocks
    const rangeDays =
      startDate && endDate
        ? Math.max(
            1,
            Math.round(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                (24 * 60 * 60 * 1000),
            ) + 1,
          )
        : 1;
    const created = await Promise.all(
      aiResult.blocks.map((block, i) => {
        let blockDate: Date;
        if (block.date) {
          blockDate = new Date(block.date);
        } else if (startDate && endDate) {
          const rangeStart = new Date(startDate);
          rangeStart.setHours(0, 0, 0, 0);
          blockDate = new Date(
            rangeStart.getTime() + (i % rangeDays) * 24 * 60 * 60 * 1000,
          );
        } else if (date) {
          blockDate = new Date(date);
        } else {
          blockDate = this.startOfToday();
        }
        return this.prisma.plannerEntry.create({
          data: {
            userId,
            title: block.title,
            description: block.reason,
            date: blockDate,
            startTime: block.start_time,
            endTime: block.end_time,
            taskId: block.task_id,
            isAiGenerated: true,
            aiReason: block.reason,
            color: CALM_COLORS[i % CALM_COLORS.length],
          },
          include: {
            task: {
              select: { id: true, title: true, priority: true, status: true },
            },
          },
        });
      }),
    );

    return {
      blocks: created,
      focusMessage: aiResult.focus_message,
      workloadLevel: aiResult.workload_level,
    };
  }

  private async callAiService(
    energyLevel: string,
    mood: string,
    tasks: Array<{
      id: string;
      title: string;
      priority: string;
      deadline: Date | null;
      status: string;
      estimate: number | null;
      project: { title: string } | null;
    }>,
    startDate?: string,
    endDate?: string,
  ): Promise<AiPlanResponse> {
    let aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    aiUrl = aiUrl.replace('localhost', '127.0.0.1');
    const aiToken = process.env.AI_SERVICE_TOKEN || 'gadangganteng';

    const taskList = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      deadline: t.deadline,
      status: t.status,
      estimate: t.estimate,
      project: t.project?.title ?? null,
    }));

    try {
      const response = await fetch(`${aiUrl}/api/planner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiToken}`,
        },
        body: JSON.stringify({
          energy_level: energyLevel,
          mood,
          tasks: taskList,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with ${response.status}`);
      }

      const result = (await response.json()) as { data: AiPlanResponse };
      return result.data;
    } catch (error) {
      console.error('Error calling AI planner service:', error);
      throw new InternalServerErrorException('Failed to generate daily plan');
    }
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async setGoogleEventId(
    userId: string,
    entryId: string,
    eventId: string | null,
  ) {
    const entry = await this.prisma.plannerEntry.findFirst({
      where: { id: entryId, userId },
    });
    if (!entry) throw new NotFoundException('Planner entry not found');

    return this.prisma.plannerEntry.update({
      where: { id: entryId },
      data: { googleEventId: eventId },
    });
  }

  async clearAllGoogleEventIds(userId: string) {
    const result = await this.prisma.plannerEntry.updateMany({
      where: { userId, googleEventId: { not: null } },
      data: { googleEventId: null },
    });
    return result.count;
  }
}
