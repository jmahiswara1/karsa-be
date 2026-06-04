import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateTaskColumnDto {
  name: string;
}

export interface UpdateTaskColumnDto {
  name?: string;
  order?: number;
}

export interface ReorderColumnsDto {
  columns: { id: string; order: number }[];
}

@Injectable()
export class TaskColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const columns = await this.prisma.taskColumn.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    if (columns.length === 0) {
      // Create default columns if none exist
      return this.initializeDefaultColumns(userId);
    }

    return columns;
  }

  async create(userId: string, data: CreateTaskColumnDto) {
    // get max order
    const lastCol = await this.prisma.taskColumn.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
    });

    const order = lastCol ? lastCol.order + 1000 : 0;

    return this.prisma.taskColumn.create({
      data: {
        ...data,
        order,
        userId,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateTaskColumnDto) {
    return this.prisma.taskColumn.update({
      where: { id, userId },
      data,
    });
  }

  async remove(id: string, userId: string) {
    // Find the 'TODO' or first column to move tasks to, or just let them be orphaned or deleted?
    // It's safer to just delete the column. Tasks will have columnId = null because of SetNull.
    return this.prisma.taskColumn.delete({
      where: { id, userId },
    });
  }

  async reorder(userId: string, data: ReorderColumnsDto) {
    const updates = data.columns.map((col) =>
      this.prisma.taskColumn.update({
        where: { id: col.id, userId },
        data: { order: col.order },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async initializeDefaultColumns(userId: string) {
    const defaults = ['To Do', 'In Progress', 'Done'];
    const columns = await this.prisma.$transaction(
      defaults.map((name, i) =>
        this.prisma.taskColumn.create({
          data: {
            name,
            order: i * 1000,
            userId,
          },
        }),
      ),
    );

    // Also try to migrate existing tasks to these default columns based on their status
    const tasks = await this.prisma.task.findMany({
      where: { userId, columnId: null },
    });

    if (tasks.length > 0) {
      const todoCol = columns[0].id;
      const progCol = columns[1].id;
      const doneCol = columns[2].id;

      await this.prisma.$transaction(
        tasks.map((task: any) => {
          let targetCol = todoCol;
          if (task.status === 'IN_PROGRESS') targetCol = progCol;
          else if (task.status === 'DONE') targetCol = doneCol;
          
          return this.prisma.task.update({
            where: { id: task.id },
            data: { columnId: targetCol },
          });
        })
      );
    }

    return columns;
  }
}
