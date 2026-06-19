import { Injectable } from '@nestjs/common';
import { BaseExecutor, ExecutorContext } from './base.executor';
import { ActionResultDto, EntityType } from '../dto/action-result.dto';

@Injectable()
export class PlannerExecutor extends BaseExecutor {
  readonly type = EntityType.PLANNER_ENTRY;

  async execute(
    args: Record<string, unknown>,
    context: ExecutorContext,
  ): Promise<ActionResultDto> {
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const date = typeof args.date === 'string' ? args.date : '';
    const startTime = typeof args.startTime === 'string' ? args.startTime : '';
    const endTime = typeof args.endTime === 'string' ? args.endTime : '';

    if (!title || !date || !startTime || !endTime) {
      return this.fail(
        title || 'Untitled entry',
        'title, date, startTime, endTime are required',
      );
    }

    // Validate endTime > startTime
    if (endTime <= startTime) {
      return this.fail(title, 'endTime must be after startTime');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return this.fail(title, 'date must be YYYY-MM-DD');
    }

    try {
      const taskId = await this.resolveTaskId(args.taskTitle, context);

      const created = await context.prisma.plannerEntry.create({
        data: {
          title,
          description:
            typeof args.description === 'string' ? args.description : undefined,
          date: new Date(date),
          startTime,
          endTime,
          taskId,
          userId: context.userId,
        },
      });

      return this.ok(created.id, created.title, {
        date: created.date,
        startTime: created.startTime,
        endTime: created.endTime,
        taskId: created.taskId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.fail(title, message);
    }
  }
}
