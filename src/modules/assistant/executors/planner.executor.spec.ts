/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { PlannerExecutor } from './planner.executor';
import { ExecutorContext } from './base.executor';
import { PrismaService } from '../../../database/prisma.service';
import { EntityType, EntityStatus } from '../dto/action-result.dto';

describe('PlannerExecutor', () => {
  let executor: PlannerExecutor;
  let mockPrisma: any;
  let context: ExecutorContext;

  beforeEach(() => {
    executor = new PlannerExecutor();
    mockPrisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      plannerEntry: { create: jest.fn() },
    };
    context = {
      prisma: mockPrisma as PrismaService,
      userId: 'user-1',
      recentProjectNames: new Map(),
      recentFolderNames: new Map(),
      recentTaskNames: new Map(),
    };
  });

  it('has type planner_entry', () => {
    expect(executor.type).toBe(EntityType.PLANNER_ENTRY);
  });

  it('creates planner entry with required fields', async () => {
    mockPrisma.plannerEntry.create.mockResolvedValue({
      id: 'plan-1',
      title: 'Morning standup',
      date: new Date('2026-06-20'),
      startTime: '09:00',
      endTime: '09:30',
    });

    const result = await executor.execute(
      {
        title: 'Morning standup',
        date: '2026-06-20',
        startTime: '09:00',
        endTime: '09:30',
      },
      context,
    );

    expect(result.type).toBe(EntityType.PLANNER_ENTRY);
    expect(result.status).toBe(EntityStatus.PENDING_CONFIRMATION);
    expect(result.id).toBe('plan-1');
  });

  it('returns failed on missing required fields', async () => {
    const result = await executor.execute(
      { title: 'X', date: '2026-06-20' },
      context,
    );
    expect(result.status).toBe(EntityStatus.FAILED);
  });

  it('returns failed when endTime <= startTime', async () => {
    const result = await executor.execute(
      {
        title: 'X',
        date: '2026-06-20',
        startTime: '10:00',
        endTime: '09:00',
      },
      context,
    );
    expect(result.status).toBe(EntityStatus.FAILED);
    expect(result.error).toContain('endTime');
  });

  it('resolves taskTitle to taskId', async () => {
    mockPrisma.task.findMany.mockResolvedValue([
      { id: 'task-1', title: 'Design homepage' },
    ]);
    mockPrisma.plannerEntry.create.mockResolvedValue({
      id: 'plan-1',
      title: 'X',
    });

    await executor.execute(
      {
        title: 'Design',
        date: '2026-06-20',
        startTime: '09:00',
        endTime: '10:00',
        taskTitle: 'design homepage',
      },
      context,
    );

    expect(mockPrisma.plannerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taskId: 'task-1' }),
      }),
    );
  });
});
