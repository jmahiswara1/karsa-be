import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...createProjectDto,
        userId,
      },
    });
  }

  async findAll(userId: string, query: ProjectQueryDto) {
    try {
      const { status, priority, search, sort, order, includeArchived } = query;
      const page = Number(query.page || 1);
      const limit = Number(query.limit || 10);
      const skip = (page - 1) * limit;

      const where: Prisma.ProjectWhereInput = {
        userId,
        ...(status
          ? { status }
          : !includeArchived
            ? { status: { not: 'ARCHIVED' } }
            : {}),
        ...(priority && { priority }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const orderBy: Prisma.ProjectOrderByWithRelationInput =
        sort === 'deadline'
          ? { deadline: order || 'asc' }
          : sort === 'priority'
            ? { priority: order || 'desc' }
            : sort === 'title'
              ? { title: order || 'asc' }
              : { createdAt: order || 'desc' };

      const [data, total] = await Promise.all([
        this.prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            _count: {
              select: { tasks: true },
            },
          },
        }),
        this.prisma.project.count({ where }),
      ]);

      const projectIds = data.map((p) => p.id);
      const completedCounts = await this.prisma.task.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: 'DONE' },
        _count: { _all: true },
      });
      const completedMap = new Map(
        completedCounts.map((c) => [c.projectId, c._count._all]),
      );

      const projectsWithProgress = data.map((project) => {
        const totalTasks = project._count?.tasks || 0;
        const completedTasks = completedMap.get(project.id) || 0;
        const progress =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        return { ...project, progress };
      });

      return {
        data: projectsWithProgress,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('[ProjectsService] findAll error:', error);
      throw error;
    }
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        tasks: true,
        notes: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const completedTasks = project.tasks.filter(
      (t) => t.status === 'DONE',
    ).length;
    const progress =
      project.tasks.length > 0
        ? Math.round((completedTasks / project.tasks.length) * 100)
        : 0;

    return { ...project, progress };
  }

  async update(userId: string, id: string, updateProjectDto: UpdateProjectDto) {
    await this.findOne(userId, id); // Ensure it exists and belongs to user
    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Ensure it exists and belongs to user
    return this.prisma.project.delete({
      where: { id },
    });
  }
}
