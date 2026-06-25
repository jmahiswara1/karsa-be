import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(userId: string, createTaskDto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        ...createTaskDto,
        userId,
      },
    });

    await this.activityLog.log(userId, 'CREATE', 'Task', task.id, {
      title: task.title,
    });

    return task;
  }

  async findAll(userId: string, query: TaskQueryDto) {
    const { status, priority, projectId, deadline, search, columnId } = query;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      userId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(projectId && { projectId }),
      ...(columnId && { columnId }),
      ...(deadline && this.buildDeadlineFilter(deadline)),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        // Order by columnId, then order, then createdAt
        orderBy: [{ columnId: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
        include: {
          project: {
            select: { id: true, title: true },
          },
          column: {
            select: { id: true, name: true, isSystem: true },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildDeadlineFilter(deadline: string): Prisma.TaskWhereInput {
    if (deadline === 'today') {
      return {
        status: { notIn: ['DONE', 'CANCELLED'] },
        column: { isSystem: true },
        OR: [{ deadline: { lte: new Date() } }, { deadline: null }],
      };
    }

    if (deadline === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfDay = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
      );
      const endOfDay = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        23,
        59,
        59,
        999,
      );
      return {
        deadline: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    if (deadline === 'overdue') {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      return {
        deadline: {
          lt: startOfDay,
        },
      };
    }

    // Default: treat as a specific date (before this date)
    return {
      deadline: {
        lte: new Date(deadline),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: {
        project: {
          select: { id: true, title: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(userId: string, id: string, updateTaskDto: UpdateTaskDto) {
    await this.findOne(userId, id); // Ensure it exists and belongs to user
    const task = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });

    await this.activityLog.log(userId, 'UPDATE', 'Task', id, {
      title: task.title,
      changes: Object.keys(updateTaskDto),
    });

    return task;
  }

  async remove(userId: string, id: string) {
    const task = await this.findOne(userId, id); // Ensure it exists and belongs to user
    await this.prisma.task.delete({
      where: { id },
    });

    await this.activityLog.log(userId, 'DELETE', 'Task', id, {
      title: task.title,
    });

    return task;
  }

  async reorder(
    userId: string,
    tasks: { id: string; order: number; columnId?: string; status?: string }[],
  ) {
    // Reorder bulk update
    const updates = tasks.map((task) => {
      const data: Record<string, unknown> = { order: task.order };
      if (task.columnId !== undefined) data.columnId = task.columnId;
      if (task.status !== undefined) data.status = task.status;
      return this.prisma.task.update({
        where: { id: task.id, userId },
        data,
      });
    });
    await this.prisma.$transaction(updates);
  }

  async setGoogleEventId(
    userId: string,
    taskId: string,
    eventId: string | null,
  ) {
    const task = await this.findOne(userId, taskId);
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        googleEventId: eventId,
        googleSyncedAt: eventId ? new Date() : null,
      },
    });
  }

  async clearAllGoogleEventIds(userId: string) {
    const result = await this.prisma.task.updateMany({
      where: { userId, googleEventId: { not: null } },
      data: { googleEventId: null, googleSyncedAt: null },
    });
    return result.count;
  }

  async findForSync(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.task.findMany({
      where: {
        userId,
        deadline: { gte: start, lte: end },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        priority: true,
        googleEventId: true,
        project: { select: { id: true, title: true } },
      },
      orderBy: [{ deadline: 'asc' }, { priority: 'desc' }],
    });
  }
}
