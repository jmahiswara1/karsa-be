/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { ProjectExecutor } from './project.executor';
import { ExecutorContext } from './base.executor';
import { PrismaService } from '../../../database/prisma.service';
import { EntityType, EntityStatus } from '../dto/action-result.dto';

describe('ProjectExecutor', () => {
  let executor: ProjectExecutor;
  let mockPrisma: any;
  let context: ExecutorContext;

  beforeEach(() => {
    executor = new ProjectExecutor();
    mockPrisma = {
      project: { create: jest.fn() },
    };
    context = {
      prisma: mockPrisma as PrismaService,
      userId: 'user-1',
      recentProjectNames: new Map(),
      recentFolderNames: new Map(),
      recentTaskNames: new Map(),
    };
  });

  it('has type project', () => {
    expect(executor.type).toBe(EntityType.PROJECT);
  });

  it('creates project with title', async () => {
    mockPrisma.project.create.mockResolvedValue({
      id: 'proj-1',
      title: 'New Project',
      priority: 'MEDIUM',
      status: 'PLANNING',
    });

    const result = await executor.execute({ title: 'New Project' }, context);

    expect(result.type).toBe(EntityType.PROJECT);
    expect(result.status).toBe(EntityStatus.PENDING_CONFIRMATION);
    expect(result.title).toBe('New Project');
    expect(result.id).toBe('proj-1');
  });

  it('tracks project name in batch context', async () => {
    mockPrisma.project.create.mockResolvedValue({
      id: 'proj-1',
      title: 'Website Redesign',
    });

    await executor.execute({ title: 'Website Redesign' }, context);

    expect(context.recentProjectNames.get('website redesign')).toBe('proj-1');
  });

  it('returns failed on empty title', async () => {
    const result = await executor.execute({ title: '' }, context);
    expect(result.status).toBe(EntityStatus.FAILED);
  });

  it('returns failed on database error', async () => {
    mockPrisma.project.create.mockRejectedValue(new Error('DB error'));

    const result = await executor.execute({ title: 'X' }, context);

    expect(result.status).toBe(EntityStatus.FAILED);
    expect(result.error).toContain('DB error');
  });
});
