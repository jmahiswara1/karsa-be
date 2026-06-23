import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTaskDto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        userId,
      },
    });
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
      ...(deadline && {
        deadline: {
          lte: new Date(deadline), // example for 'before this deadline'
        },
      }),
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
    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Ensure it exists and belongs to user
    return this.prisma.task.delete({
      where: { id },
    });
  }

  async reorder(
    userId: string,
    tasks: { id: string; order: number; columnId?: string; status?: string }[],
  ) {
    // Reorder bulk update
    const updates = tasks.map((task) =>
      this.prisma.task.update({
        where: { id: task.id, userId },
        data: {
          order: task.order,
          ...(task.columnId !== undefined && { columnId: task.columnId }),
          ...(task.status !== undefined && { status: task.status }),
        },
      }),
    );
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
