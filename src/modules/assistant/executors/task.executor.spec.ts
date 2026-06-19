/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { TaskExecutor } from './task.executor';
import { ExecutorContext } from './base.executor';
import { PrismaService } from '../../../database/prisma.service';
import { EntityType, EntityStatus } from '../dto/action-result.dto';

describe('TaskExecutor', () => {
  let executor: TaskExecutor;
  let mockPrisma: any;
  let context: ExecutorContext;

  beforeEach(() => {
    executor = new TaskExecutor();
    mockPrisma = {
      project: { findMany: jest.fn().mockResolvedValue([]) },
      task: { create: jest.fn() },
    };
    context = {
      prisma: mockPrisma as PrismaService,
      userId: 'user-1',
      recentProjectNames: new Map(),
      recentFolderNames: new Map(),
      recentTaskNames: new Map(),
    };
  });

  it('has type task', () => {
    expect(executor.type).toBe(EntityType.TASK);
  });

  it('creates task with title only', async () => {
    mockPrisma.task.create.mockResolvedValue({
      id: 'task-1',
      title: 'Test task',
      priority: 'MEDIUM',
      status: 'TODO',
    });

    const result = await executor.execute({ title: 'Test task' }, context);

    expect(result.type).toBe(EntityType.TASK);
    expect(result.status).toBe(EntityStatus.PENDING_CONFIRMATION);
    expect(result.title).toBe('Test task');
    expect(result.id).toBe('task-1');
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Test task',
          userId: 'user-1',
        }),
      }),
    );
  });

  it('parses priority enum', async () => {
    mockPrisma.task.create.mockResolvedValue({
      id: 'task-1',
      title: 'Urgent task',
    });

    await executor.execute(
      { title: 'Urgent task', priority: 'URGENT' },
      context,
    );

    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priority: 'URGENT' }),
      }),
    );
  });

  it('resolves projectName to projectId', async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', title: 'Website Redesign' },
    ]);
    mockPrisma.task.create.mockResolvedValue({ id: 'task-1', title: 'Design' });

    await executor.execute(
      { title: 'Design', projectName: 'website' },
      context,
    );

    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: 'proj-1' }),
      }),
    );
  });

  it('returns failed status on empty title', async () => {
    const result = await executor.execute({ title: '' }, context);
    expect(result.status).toBe(EntityStatus.FAILED);
    expect(result.error).toContain('Title is required');
  });

  it('returns failed status on database error', async () => {
    mockPrisma.task.create.mockRejectedValue(new Error('DB error'));

    const result = await executor.execute({ title: 'X' }, context);

    expect(result.status).toBe(EntityStatus.FAILED);
    expect(result.error).toContain('DB error');
  });
});
