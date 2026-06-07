import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // 1. Today's Tasks
    const todayTasksPromise = this.prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ['DONE', 'CANCELLED'] },
        OR: [
          { deadline: { lte: endOfToday } },
          { deadline: null },
          { status: 'IN_PROGRESS' },
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 10,
    });

    // 2. Task Summary counts
    const taskSummaryPromise = Promise.all([
      this.prisma.task.count({ where: { userId } }),
      this.prisma.task.count({ where: { userId, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { userId, status: 'DONE' } }),
      this.prisma.task.count({
        where: {
          userId,
          status: { not: 'DONE' },
          deadline: { lt: today },
        },
      }),
    ]).then(([total, inProgress, done, overdue]) => ({
      total,
      inProgress,
      done,
      overdue,
    }));

    // 3. Active Projects with progress
    const activeProjectsPromise = this.prisma.project.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: { tasks: true },
        },
        tasks: {
          where: { status: 'DONE' },
          select: { id: true },
        },
      },
      take: 5,
    }).then(projects =>
      projects.map(p => {
        const totalTasks = p._count.tasks;
        const doneTasks = p.tasks.length;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          taskCount: totalTasks - doneTasks, // tasks remaining
          progress,
        };
      })
    );

    // 4. Upcoming Deadlines (Tasks due in the next 7 days, excluding today and overdue)
    const upcomingDeadlinesPromise = this.prisma.task.findMany({
      where: {
        userId,
        status: { not: 'DONE' },
        deadline: {
          gt: endOfToday,
          lte: nextWeek,
        },
      },
      orderBy: { deadline: 'asc' },
      take: 5,
      include: { project: { select: { title: true } } },
    });

    // 5. Recent Notes
    const recentNotesPromise = this.prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { project: { select: { title: true } } },
    });

    // 6. Today's Schedule (Planner Entries)
    const todaySchedulePromise = this.prisma.plannerEntry.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lte: endOfToday,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const [
      todayTasks,
      taskSummary,
      activeProjects,
      upcomingDeadlines,
      recentNotes,
      todaySchedule,
    ] = await Promise.all([
      todayTasksPromise,
      taskSummaryPromise,
      activeProjectsPromise,
      upcomingDeadlinesPromise,
      recentNotesPromise,
      todaySchedulePromise,
    ]);

    return {
      todayTasks,
      taskSummary,
      activeProjects,
      upcomingDeadlines,
      recentNotes,
      todaySchedule,
    };
  }
}
