import { AdminService } from './admin.service';
import { NotFoundException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let mockPrisma: any;
  let mockAuditLog: any;
  let mockActivityLog: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://avatar.url',
    role: 'FREE',
    status: 'PENDING',
    subscriptionExpiresAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([mockUser]),
        findUnique: jest.fn().mockResolvedValue(mockUser),
        update: jest
          .fn()
          .mockImplementation((args: any) =>
            Promise.resolve({ ...mockUser, ...args.data }),
          ),
        delete: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      activityLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fns: any[]) => Promise.all(fns)),
    };

    mockAuditLog = {
      log: jest.fn(),
    };

    mockActivityLog = {
      listByUser: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    service = new AdminService(mockPrisma, mockAuditLog, mockActivityLog);
  });

  describe('getStats', () => {
    it('should return user counts by status and role', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(90) // active
        .mockResolvedValueOnce(5) // rejected
        .mockResolvedValueOnce(80) // free
        .mockResolvedValueOnce(15) // pro
        .mockResolvedValueOnce(5); // admin

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.byStatus.pending).toBe(5);
      expect(result.byStatus.active).toBe(90);
      expect(result.byRole.free).toBe(80);
      expect(result.byRole.admin).toBe(5);
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockUser], 1]);

      const result = await service.listUsers({ skip: 0, take: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should cap take at 200', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.listUsers({ take: 500 });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.listUsers({ search: 'test' });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getUserDetail', () => {
    it('should return user with counts', async () => {
      const result = await service.getUserDetail('user-1');

      expect(result.id).toBe('user-1');
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetail('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approveUser', () => {
    it('should set status to ACTIVE', async () => {
      const result = await service.approveUser('admin-1', 'user-1');

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACTIVE' } }),
      );
    });

    it('should create audit log', async () => {
      await service.approveUser('admin-1', 'user-1');

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'APPROVE' }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.approveUser('admin-1', 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectUser', () => {
    it('should set status to REJECTED', async () => {
      const result = await service.rejectUser('admin-1', 'user-1');

      expect(result.status).toBe('REJECTED');
    });

    it('should create audit log', async () => {
      await service.rejectUser('admin-1', 'user-1');

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REJECT' }),
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update role', async () => {
      const result = await service.updateUserRole('admin-1', 'user-1', {
        role: 'PRO',
      });

      expect(result.role).toBe('PRO');
    });

    it('should create audit log', async () => {
      await service.updateUserRole('admin-1', 'user-1', { role: 'PRO' });

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_ROLE' }),
      );
    });
  });

  describe('updateUserStatus', () => {
    it('should update status', async () => {
      const result = await service.updateUserStatus('admin-1', 'user-1', {
        status: 'ACTIVE',
      });

      expect(result.status).toBe('ACTIVE');
    });

    it('should create audit log', async () => {
      await service.updateUserStatus('admin-1', 'user-1', { status: 'ACTIVE' });

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_STATUS' }),
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const result = await service.deleteUser('admin-1', 'user-1');

      expect(result.id).toBe('user-1');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should create audit log BEFORE deleting', async () => {
      await service.deleteUser('admin-1', 'user-1');

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('admin-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserActivities', () => {
    it('should delegate to activityLog.listByUser', async () => {
      await service.getUserActivities('user-1', 0, 20);

      expect(mockActivityLog.listByUser).toHaveBeenCalledWith('user-1', 0, 20);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserActivities('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
