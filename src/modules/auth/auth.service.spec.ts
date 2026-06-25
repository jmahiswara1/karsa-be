import { AuthService } from './auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-token'),
  verify: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockInviteService: any;
  let mockActivityLog: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    googleId: 'google-123',
    avatarUrl: 'https://avatar.url',
    role: 'FREE',
    status: 'ACTIVE',
    hashedRefreshToken: 'hashed-token',
    subscriptionExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfile = {
    id: 'google-123',
    emails: [{ value: 'test@example.com' }],
    displayName: 'Test User',
    photos: [{ value: 'https://avatar.url' }],
  };

  beforeEach(() => {
    mockUsersService = {
      findByGoogleId: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      createFromGoogle: jest.fn().mockResolvedValue(mockUser),
      updateCalendarTokens: jest.fn(),
      updateHashedRefreshToken: jest.fn(),
      findById: jest.fn().mockResolvedValue(mockUser),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('secret-value'),
    };

    mockInviteService = {
      validate: jest.fn().mockResolvedValue({ code: 'INVITE-123' }),
      consume: jest.fn(),
    };

    mockActivityLog = {
      log: jest.fn(),
    };

    service = new AuthService(
      mockUsersService,
      mockJwtService,
      mockConfigService,
      mockInviteService,
      mockActivityLog,
    );
  });

  describe('validateGoogleUser', () => {
    it('should return existing user found by googleId', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(mockUser);

      const result = await service.validateGoogleUser(mockProfile as any);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByGoogleId).toHaveBeenCalledWith(
        'google-123',
      );
      expect(mockUsersService.count).not.toHaveBeenCalled();
    });

    it('should auto-approve first user as ADMIN', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.count.mockResolvedValue(0);
      mockUsersService.createFromGoogle.mockResolvedValue({
        ...mockUser,
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const result = await service.validateGoogleUser(mockProfile as any);

      expect(mockUsersService.createFromGoogle).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ACTIVE',
        }),
      );
      expect(result.role).toBe('ADMIN');
    });

    it('should throw BadRequestException when no invite code for non-first user', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.count.mockResolvedValue(10);

      await expect(
        service.validateGoogleUser(mockProfile as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate invite code and create user for non-first user', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.count.mockResolvedValue(10);

      await service.validateGoogleUser(
        mockProfile as any,
        undefined,
        undefined,
        'INVITE-123',
      );

      expect(mockInviteService.validate).toHaveBeenCalledWith(
        'INVITE-123',
        'test@example.com',
      );
      expect(mockUsersService.createFromGoogle).toHaveBeenCalled();
      expect(mockInviteService.consume).toHaveBeenCalledWith(
        'INVITE-123',
        'user-1',
      );
    });

    it('should store calendar tokens when accessToken is provided', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(mockUser);

      await service.validateGoogleUser(
        mockProfile as any,
        'access-token',
        'refresh-token',
      );

      expect(mockUsersService.updateCalendarTokens).toHaveBeenCalledWith(
        'user-1',
        'access-token',
        'refresh-token',
      );
    });

    it('should log LOGIN activity', async () => {
      mockUsersService.findByGoogleId.mockResolvedValue(mockUser);

      await service.validateGoogleUser(mockProfile as any);

      expect(mockActivityLog.log).toHaveBeenCalledWith(
        'user-1',
        'LOGIN',
        'User',
        'user-1',
        expect.any(Object),
      );
    });
  });

  describe('generateTokens', () => {
    it('should return accessToken and refreshToken', async () => {
      const result = await service.generateTokens(
        'user-1',
        'test@example.com',
        'FREE',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should update refresh token hash', async () => {
      await service.generateTokens('user-1', 'test@example.com', 'FREE');

      expect(mockUsersService.updateHashedRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'hashed-token',
      );
    });
  });

  describe('logout', () => {
    it('should clear hashed refresh token', async () => {
      await service.logout('user-1');

      expect(mockUsersService.updateHashedRefreshToken).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens('user-1', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when no hashed token', async () => {
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        hashedRefreshToken: null,
      });

      await expect(service.refreshTokens('user-1', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token mismatch', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-1', 'wrong-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens on valid refresh', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.refreshTokens('user-1', 'valid-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
