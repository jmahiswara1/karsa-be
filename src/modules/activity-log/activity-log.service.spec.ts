import { ActivityLogService } from './activity-log.service';
import { Prisma } from '@prisma/client';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      activityLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new ActivityLogService(mockPrisma);
  });

  describe('log', () => {
    it('should create an activity log entry', async () => {
      mockPrisma.activityLog.create.mockResolvedValue({ id: 'log-1' });

      await service.log('user-1', 'CREATE', 'task', 'task-1');

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'task',
          entityId: 'task-1',
          details: expect.anything(),
        },
      });
    });

    it('should include details when provided', async () => {
      mockPrisma.activityLog.create.mockResolvedValue({ id: 'log-2' });
      const details = { title: 'New Task', priority: 'high' };

      await service.log('user-1', 'UPDATE', 'task', 'task-1', details);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ details }),
      });
    });

    it('should use Prisma.JsonNull when details is null', async () => {
      mockPrisma.activityLog.create.mockResolvedValue({ id: 'log-3' });

      await service.log('user-1', 'DELETE', 'task', 'task-1', null);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: Prisma.JsonNull,
        }),
      });
    });

    it('should use Prisma.JsonNull when details is undefined', async () => {
      mockPrisma.activityLog.create.mockResolvedValue({ id: 'log-4' });

      await service.log('user-1', 'READ', 'task', 'task-1');

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: Prisma.JsonNull,
        }),
      });
    });

    it('should swallow errors and not throw', async () => {
      mockPrisma.activityLog.create.mockRejectedValue(
        new Error('DB connection lost'),
      );
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(
        service.log('user-1', 'CREATE', 'task', 'task-1'),
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log activity:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('listByUser', () => {
    it('should return items and total for a user', async () => {
      const mockItems = [
        { id: 'log-1', action: 'CREATE', createdAt: new Date() },
        { id: 'log-2', action: 'UPDATE', createdAt: new Date() },
      ];
      mockPrisma.activityLog.findMany.mockResolvedValue(mockItems);
      mockPrisma.activityLog.count.mockResolvedValue(2);

      const result = await service.listByUser('user-1');

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(2);
    });

    it('should pass skip and take to findMany', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.count.mockResolvedValue(0);

      await service.listByUser('user-1', 10, 25);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 10,
          take: 25,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should cap take at 100', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.count.mockResolvedValue(0);

      await service.listByUser('user-1', 0, 500);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should use default skip=0 and take=20 when not provided', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.count.mockResolvedValue(0);

      await service.listByUser('user-1');

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should return empty items when user has no logs', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.count.mockResolvedValue(0);

      const result = await service.listByUser('user-1');

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
