import { Injectable } from '@nestjs/common';
import { BaseExecutor, ExecutorContext } from './base.executor';
import { ActionResultDto, EntityType } from '../dto/action-result.dto';
import { Priority } from '@prisma/client';

@Injectable()
export class ProjectExecutor extends BaseExecutor {
  readonly type = EntityType.PROJECT;

  async execute(
    args: Record<string, unknown>,
    context: ExecutorContext,
  ): Promise<ActionResultDto> {
    const title = typeof args.title === 'string' ? args.title.trim() : '';

    if (!title) {
      return this.fail(title || 'Untitled project', 'Title is required');
    }

    try {
      const priority = this.parsePriority(args.priority);
      const deadline = this.parseDeadline(args.deadline);

      const created = await context.prisma.project.create({
        data: {
          title,
          description:
            typeof args.description === 'string' ? args.description : undefined,
          priority,
          deadline,
          userId: context.userId,
          status: 'PLANNING',
        },
      });

      // Track nama project yang baru dibuat untuk batch linking
      context.recentProjectNames.set(title.toLowerCase(), created.id);

      return this.ok(created.id, created.title, {
        description: created.description,
        priority: created.priority,
        deadline: created.deadline,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.fail(title, message);
    }
  }

  private parsePriority(raw: unknown): Priority {
    if (typeof raw !== 'string') return Priority.MEDIUM;
    const upper = raw.toUpperCase();
    if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(upper)) {
      return upper as Priority;
    }
    return Priority.MEDIUM;
  }
}
