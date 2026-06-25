import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userPreference: {
        upsert: jest.fn(),
      },
    };
    service = new UsersService(mockPrisma);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'u-1', email: 'test@test.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('u-1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u-1' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = { id: 'u-1', email: 'a@b.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('a@b.com');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
    });

    it('should return null when email not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('missing@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should return user when found by googleId', async () => {
      const mockUser = { id: 'u-1', googleId: 'g-123' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByGoogleId('g-123');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'g-123' },
      });
    });

    it('should return null when googleId not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByGoogleId('unknown');

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should return user count', async () => {
      mockPrisma.user.count.mockResolvedValue(42);

      const result = await service.count();

      expect(result).toBe(42);
      expect(mockPrisma.user.count).toHaveBeenCalled();
    });

    it('should return 0 when no users exist', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.count();

      expect(result).toBe(0);
    });
  });

  describe('createFromGoogle', () => {
    it('should create user with provided fields', async () => {
      const input = {
        email: 'g@test.com',
        name: 'Google User',
        googleId: 'g-999',
        avatarUrl: 'https://avatar.url',
      };
      const mockUser = { id: 'u-new', ...input, status: 'PENDING' };
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.createFromGoogle(input);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'g@test.com',
          name: 'Google User',
          googleId: 'g-999',
          avatarUrl: 'https://avatar.url',
          status: 'PENDING',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should default status to PENDING when not provided', async () => {
      const input = { email: 'a@b.com', name: 'A', googleId: 'g-1' };
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-1',
        ...input,
        status: 'PENDING',
      });

      await service.createFromGoogle(input);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should use provided status when given', async () => {
      const input = {
        email: 'a@b.com',
        name: 'A',
        googleId: 'g-1',
        status: 'ACTIVE' as any,
      };
      mockPrisma.user.create.mockResolvedValue({ id: 'u-1', ...input });

      await service.createFromGoogle(input);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should set avatarUrl to undefined when not provided', async () => {
      const input = { email: 'a@b.com', name: 'A', googleId: 'g-1' };
      mockPrisma.user.create.mockResolvedValue({ id: 'u-1' });

      await service.createFromGoogle(input);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ avatarUrl: undefined }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const mockUser = { id: 'u-1', status: 'ACTIVE' };
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.updateStatus('u-1', 'ACTIVE');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { status: 'ACTIVE' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should propagate prisma errors', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Not found'));

      await expect(
        service.updateStatus('bad', 'ACTIVE' as any),
      ).rejects.toThrow('Not found');
    });
  });

  describe('updateHashedRefreshToken', () => {
    it('should set hashed refresh token', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateHashedRefreshToken('u-1', 'hashed-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { hashedRefreshToken: 'hashed-token' },
      });
    });

    it('should clear hashed refresh token when null', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateHashedRefreshToken('u-1', null);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { hashedRefreshToken: null },
      });
    });

    it('should return void', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateHashedRefreshToken('u-1', 'hash');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update name', async () => {
      const mockUser = { id: 'u-1', name: 'New Name' };
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.update('u-1', { name: 'New Name' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { name: 'New Name' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should update avatarUrl', async () => {
      const mockUser = { id: 'u-1', avatarUrl: 'https://new.url' };
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.update('u-1', {
        avatarUrl: 'https://new.url',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { avatarUrl: 'https://new.url' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should update both name and avatarUrl', async () => {
      const mockUser = { id: 'u-1', name: 'N', avatarUrl: 'U' };
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await service.update('u-1', { name: 'N', avatarUrl: 'U' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { name: 'N', avatarUrl: 'U' },
      });
    });

    it('should handle empty update data', async () => {
      const mockUser = { id: 'u-1' };
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.update('u-1', {});

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: {},
      });
      expect(result).toEqual(mockUser);
    });
  });
});
