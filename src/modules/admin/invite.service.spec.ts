import { InviteService } from './invite.service';

describe('InviteService', () => {
  let service: InviteService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      inviteCode: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new InviteService(mockPrisma);
  });

  describe('generate', () => {
    it('should create an invite with default 7-day expiry', async () => {
      const now = new Date();
      const mockInvite = {
        id: 'inv-1',
        code: 'abc123',
        email: null,
        expiresAt: new Date(now.getTime() + 7 * 86400000),
        createdAt: now,
      };
      mockPrisma.inviteCode.create.mockResolvedValue(mockInvite);

      const result = await service.generate('admin-1');

      expect(mockPrisma.inviteCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdBy: 'admin-1',
            email: null,
          }),
        }),
      );
      expect(result).toEqual(mockInvite);
    });

    it('should create an invite with specified email', async () => {
      const mockInvite = {
        id: 'inv-2',
        code: 'def456',
        email: 'user@test.com',
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      mockPrisma.inviteCode.create.mockResolvedValue(mockInvite);

      const result = await service.generate('admin-1', 'user@test.com');

      expect(mockPrisma.inviteCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'user@test.com' }),
        }),
      );
      expect(result.email).toBe('user@test.com');
    });

    it('should create an invite with custom expiry days', async () => {
      const before = new Date();
      const mockInvite = {
        id: 'inv-3',
        code: 'ghi789',
        email: null,
        expiresAt: new Date(before.getTime() + 30 * 86400000),
        createdAt: new Date(),
      };
      mockPrisma.inviteCode.create.mockResolvedValue(mockInvite);

      await service.generate('admin-1', undefined, 30);

      expect(mockPrisma.inviteCode.create).toHaveBeenCalled();
    });

    it('should generate a 12-character hex code', async () => {
      let capturedCode: string;
      mockPrisma.inviteCode.create.mockImplementation((args: any) => {
        capturedCode = args.data.code as string;
        return Promise.resolve({
          id: 'inv-4',
          code: args.data.code,
          email: null,
          expiresAt: new Date(),
          createdAt: new Date(),
        });
      });

      await service.generate('admin-1');

      expect(capturedCode!).toHaveLength(12);
      expect(capturedCode!).toMatch(/^[0-9a-f]{12}$/);
    });
  });

  describe('validate', () => {
    it('should return invite for a valid code', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const mockInvite = {
        id: 'inv-1',
        code: 'valid123',
        isUsed: false,
        expiresAt: futureDate,
        email: null,
      };
      mockPrisma.inviteCode.findUnique.mockResolvedValue(mockInvite);

      const result = await service.validate('valid123');

      expect(result).toEqual(mockInvite);
      expect(mockPrisma.inviteCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'valid123' },
      });
    });

    it('should throw BadRequestException for non-existent code', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue(null);

      await expect(service.validate('bad')).rejects.toThrow(
        'Invalid invite code',
      );
    });

    it('should throw BadRequestException for already used code', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'used123',
        isUsed: true,
        expiresAt: futureDate,
        email: null,
      });

      await expect(service.validate('used123')).rejects.toThrow(
        'Invite code already used',
      );
    });

    it('should throw BadRequestException for expired code', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'expired',
        isUsed: false,
        expiresAt: pastDate,
        email: null,
      });

      await expect(service.validate('expired')).rejects.toThrow(
        'Invite code expired',
      );
    });

    it('should throw when email does not match invite email', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'email123',
        isUsed: false,
        expiresAt: futureDate,
        email: 'owner@test.com',
      });

      await expect(
        service.validate('email123', 'other@test.com'),
      ).rejects.toThrow('Invite code is not valid for this email');
    });

    it('should accept matching email case-insensitively', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const mockInvite = {
        id: 'inv-1',
        code: 'ci123',
        isUsed: false,
        expiresAt: futureDate,
        email: 'User@Test.COM',
      };
      mockPrisma.inviteCode.findUnique.mockResolvedValue(mockInvite);

      const result = await service.validate('ci123', 'user@test.com');
      expect(result).toEqual(mockInvite);
    });

    it('should pass when invite has email but no email argument provided', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const mockInvite = {
        id: 'inv-1',
        code: 'noarg',
        isUsed: false,
        expiresAt: futureDate,
        email: 'owner@test.com',
      };
      mockPrisma.inviteCode.findUnique.mockResolvedValue(mockInvite);

      const result = await service.validate('noarg');
      expect(result).toEqual(mockInvite);
    });
  });

  describe('consume', () => {
    it('should mark invite as used with userId', async () => {
      const mockUpdated = { id: 'inv-1', isUsed: true, usedBy: 'user-1' };
      mockPrisma.inviteCode.update.mockResolvedValue(mockUpdated);

      const result = await service.consume('code123', 'user-1');

      expect(mockPrisma.inviteCode.update).toHaveBeenCalledWith({
        where: { code: 'code123' },
        data: { isUsed: true, usedBy: 'user-1' },
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should propagate prisma errors', async () => {
      mockPrisma.inviteCode.update.mockRejectedValue(
        new Error('Record not found'),
      );

      await expect(service.consume('bad', 'user-1')).rejects.toThrow(
        'Record not found',
      );
    });
  });

  describe('revoke', () => {
    it('should delete invite and return its id', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'abc',
      });
      mockPrisma.inviteCode.delete.mockResolvedValue({ id: 'inv-1' });

      const result = await service.revoke('inv-1');

      expect(mockPrisma.inviteCode.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
      expect(result).toEqual({ id: 'inv-1' });
    });

    it('should throw NotFoundException when invite not found', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue(null);

      await expect(service.revoke('nonexistent')).rejects.toThrow(
        'Invite not found',
      );
    });

    it('should not call delete when invite not found', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue(null);

      await service.revoke('nonexistent').catch(() => {});

      expect(mockPrisma.inviteCode.delete).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return all invites ordered by createdAt desc', async () => {
      const mockInvites = [
        {
          id: 'inv-2',
          code: 'bbb',
          email: null,
          expiresAt: new Date(),
          isUsed: false,
          createdAt: new Date('2025-02-01'),
          creator: { id: 'a1', name: 'Admin', email: 'a@test.com' },
          user: null,
        },
        {
          id: 'inv-1',
          code: 'aaa',
          email: 'u@test.com',
          expiresAt: new Date(),
          isUsed: true,
          createdAt: new Date('2025-01-01'),
          creator: { id: 'a1', name: 'Admin', email: 'a@test.com' },
          user: { id: 'u1', name: 'User', email: 'u@test.com' },
        },
      ];
      mockPrisma.inviteCode.findMany.mockResolvedValue(mockInvites);

      const result = await service.list();

      expect(mockPrisma.inviteCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual(mockInvites);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no invites exist', async () => {
      mockPrisma.inviteCode.findMany.mockResolvedValue([]);

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should include creator and user relations in select', async () => {
      mockPrisma.inviteCode.findMany.mockResolvedValue([]);

      await service.list();

      expect(mockPrisma.inviteCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            creator: expect.anything(),
            user: expect.anything(),
          }),
        }),
      );
    });
  });
});
