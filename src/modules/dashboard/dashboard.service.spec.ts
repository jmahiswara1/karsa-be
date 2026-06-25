import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      note: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      plannerEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new DashboardService(mockPrisma);
  });

  describe('getSummary', () => {
    it('should return all six summary sections', async () => {
      const result = await service.getSummary('user-1');

      expect(result).toHaveProperty('todayTasks');
      expect(result).toHaveProperty('taskSummary');
      expect(result).toHaveProperty('activeProjects');
      expect(result).toHaveProperty('upcomingDeadlines');
      expect(result).toHaveProperty('recentNotes');
      expect(result).toHaveProperty('todaySchedule');
    });

    it('should query todayTasks with correct filters', async () => {
      await service.getSummary('user-1');

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            status: { notIn: ['DONE', 'CANCELLED'] },
          }),
          take: 10,
        }),
      );
    });

    it('should return taskSummary with correct counts', async () => {
      mockPrisma.task.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(5) // inProgress
        .mockResolvedValueOnce(10) // done
        .mockResolvedValueOnce(3); // overdue

      const result = await service.getSummary('user-1');

      expect(result.taskSummary).toEqual({
        total: 20,
        inProgress: 5,
        done: 10,
        overdue: 3,
      });
    });

    it('should compute activeProjects progress correctly', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Project A',
          status: 'ACTIVE',
          _count: { tasks: 10 },
          tasks: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
        },
      ]);

      const result = await service.getSummary('user-1');

      expect(result.activeProjects).toEqual([
        {
          id: 'p1',
          title: 'Project A',
          status: 'ACTIVE',
          taskCount: 7,
          progress: 30,
        },
      ]);
    });

    it('should return zero progress when project has no tasks', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Empty Project',
          status: 'ACTIVE',
          _count: { tasks: 0 },
          tasks: [],
        },
      ]);

      const result = await service.getSummary('user-1');

      expect(result.activeProjects[0].progress).toBe(0);
      expect(result.activeProjects[0].taskCount).toBe(0);
    });

    it('should query upcomingDeadlines with 7-day range', async () => {
      await service.getSummary('user-1');

      const deadlineCall = mockPrisma.task.findMany.mock.calls.find(
        (c: any) => c[0]?.where?.deadline?.gt !== undefined,
      );
      expect(deadlineCall).toBeDefined();
      expect(deadlineCall![0].take).toBe(5);
      expect(deadlineCall![0].where.status).toEqual({ not: 'DONE' });
    });

    it('should query recentNotes ordered by updatedAt desc', async () => {
      await service.getSummary('user-1');

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: { project: { select: { title: true } } },
        }),
      );
    });

    it('should query todaySchedule for today date range', async () => {
      await service.getSummary('user-1');

      const scheduleCall = mockPrisma.plannerEntry.findMany.mock.calls[0][0];
      expect(scheduleCall.where.userId).toBe('user-1');
      expect(scheduleCall.where.date.gte).toBeInstanceOf(Date);
      expect(scheduleCall.where.date.lte).toBeInstanceOf(Date);
      expect(scheduleCall.orderBy).toEqual({ startTime: 'asc' });
    });

    it('should return empty arrays when no data exists', async () => {
      const result = await service.getSummary('user-1');

      expect(result.todayTasks).toEqual([]);
      expect(result.activeProjects).toEqual([]);
      expect(result.upcomingDeadlines).toEqual([]);
      expect(result.recentNotes).toEqual([]);
      expect(result.todaySchedule).toEqual([]);
    });
  });
});
