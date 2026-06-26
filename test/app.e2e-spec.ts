import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'FREE',
  status: 'ACTIVE',
  avatarUrl: null,
  subscriptionExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn().mockResolvedValue(mockUser),
    findMany: jest.fn().mockResolvedValue([mockUser]),
    count: jest.fn().mockResolvedValue(1),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ ...mockUser, ...args.data }),
      ),
    update: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ ...mockUser, ...args.data }),
      ),
    delete: jest.fn().mockResolvedValue({ id: 'test-user-1' }),
  },
  project: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'proj-1', ...args.data }),
      ),
    update: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'proj-1', ...args.data }),
      ),
    delete: jest.fn().mockResolvedValue({ id: 'proj-1' }),
    count: jest.fn().mockResolvedValue(0),
  },
  task: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'task-1', ...args.data }),
      ),
    update: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'task-1', ...args.data }),
      ),
    delete: jest.fn().mockResolvedValue({ id: 'task-1' }),
    count: jest.fn().mockResolvedValue(0),
  },
  note: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'note-1', ...args.data }),
      ),
    update: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'note-1', ...args.data }),
      ),
    delete: jest.fn().mockResolvedValue({ id: 'note-1' }),
    count: jest.fn().mockResolvedValue(0),
  },
  taskColumn: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'col-1', ...args.data }),
      ),
  },
  noteFolder: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'folder-1', ...args.data }),
      ),
  },
  plannerEntry: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'entry-1', ...args.data }),
      ),
  },
  activityLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  conversation: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'conv-1', ...args.data }),
      ),
  },
  message: {
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'msg-1', ...args.data }),
      ),
  },
  adminAuditLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
  inviteCode: {
    create: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'inv-1', ...args.data }),
      ),
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
  },
  syncLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
  userPreference: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: 'pref-1', ...args.create }),
      ),
  },
  notification: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  $transaction: jest.fn().mockImplementation((fns: any[]) => Promise.all(fns)),
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

describe('API Endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
        getRequest: () => ({ user: mockUser }),
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('GET /api/auth/me should return user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data).not.toHaveProperty('hashedRefreshToken');
    });
  });

  describe('Users', () => {
    it('GET /api/users/me should return user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/users/me should update profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Projects', () => {
    it('POST /api/projects should create project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .send({ title: 'New Project' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Project');
    });

    it('GET /api/projects should return list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Tasks', () => {
    it('POST /api/tasks should create task', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({ title: 'New Task' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Task');
    });

    it('GET /api/tasks should return list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Notes', () => {
    it('POST /api/notes should create note', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notes')
        .send({ title: 'New Note', content: 'Note content' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Note');
    });

    it('GET /api/notes should return list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notes')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Dashboard', () => {
    it('GET /api/dashboard/summary should return summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/summary')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('todayTasks');
      expect(res.body.data).toHaveProperty('taskSummary');
      expect(res.body.data).toHaveProperty('activeProjects');
    });
  });

  describe('Validation', () => {
    it('POST /api/projects should reject empty title', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send({ title: '' })
        .expect(400);
    });

    it('POST /api/notes should reject missing content', async () => {
      await request(app.getHttpServer())
        .post('/api/notes')
        .send({ title: 'Note without content' })
        .expect(400);
    });
  });
});
