/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { PlannerService } from './planner.service';
import { NotFoundException } from '@nestjs/common';

describe('PlannerService', () => {
  let service: PlannerService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      plannerEntry: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      task: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new PlannerService(mockPrisma);

    process.env.AI_SERVICE_URL = 'http://127.0.0.1:8000';
    process.env.AI_SERVICE_TOKEN = 'test-token';
  });

  describe('create', () => {
    it('should create entry with correct fields', async () => {
      const dto = {
        title: 'Morning Focus',
        date: '2025-01-15',
        startTime: '09:00',
        endTime: '10:00',
      };
      const mockEntry = { id: 'entry-1', ...dto, userId: 'user-1' };
      mockPrisma.plannerEntry.create.mockResolvedValue(mockEntry);

      const result = await service.create('user-1', dto);

      expect(mockPrisma.plannerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Morning Focus',
          date: new Date('2025-01-15'),
          startTime: '09:00',
          endTime: '10:00',
          category: 'FOCUS',
          isAiGenerated: false,
        }),
      });
      expect(result).toEqual(mockEntry);
    });

    it('should assign a random color from CALM_COLORS when color not provided', async () => {
      const dto = {
        title: 'Block',
        date: '2025-01-15',
        startTime: '09:00',
        endTime: '10:00',
      };
      mockPrisma.plannerEntry.create.mockResolvedValue({ id: 'e1' });

      await service.create('user-1', dto);

      const callArg = mockPrisma.plannerEntry.create.mock.calls[0][0].data;
      expect([
        '#818cf8',
        '#6366f1',
        '#4f46e5',
        '#2dd4bf',
        '#0ea5e9',
        '#a78bfa',
      ]).toContain(callArg.color);
    });

    it('should use provided color when given', async () => {
      const dto = {
        title: 'Block',
        date: '2025-01-15',
        startTime: '09:00',
        endTime: '10:00',
        color: '#ff0000',
      };
      mockPrisma.plannerEntry.create.mockResolvedValue({ id: 'e1' });

      await service.create('user-1', dto);

      expect(mockPrisma.plannerEntry.create.mock.calls[0][0].data.color).toBe(
        '#ff0000',
      );
    });

    it('should default optional fields to null', async () => {
      const dto = {
        title: 'Block',
        date: '2025-01-15',
        startTime: '09:00',
        endTime: '10:00',
      };
      mockPrisma.plannerEntry.create.mockResolvedValue({ id: 'e1' });

      await service.create('user-1', dto);

      const data = mockPrisma.plannerEntry.create.mock.calls[0][0].data;
      expect(data.description).toBeNull();
      expect(data.taskId).toBeNull();
      expect(data.aiReason).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return entries with no filter', async () => {
      const entries = [{ id: 'e1' }, { id: 'e2' }];
      mockPrisma.plannerEntry.findMany.mockResolvedValue(entries);

      const result = await service.findAll('user-1');

      expect(mockPrisma.plannerEntry.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: {
          task: {
            select: { id: true, title: true, priority: true, status: true },
          },
        },
      });
      expect(result).toEqual(entries);
    });

    it('should filter by single date', async () => {
      mockPrisma.plannerEntry.findMany.mockResolvedValue([]);

      await service.findAll('user-1', '2025-01-15');

      const callArg = mockPrisma.plannerEntry.findMany.mock.calls[0][0];
      expect(callArg.where.userId).toBe('user-1');
      expect(callArg.where.date).toBeDefined();
      expect(callArg.where.date.gte).toBeInstanceOf(Date);
      expect(callArg.where.date.lt).toBeInstanceOf(Date);
    });

    it('should filter by date range', async () => {
      mockPrisma.plannerEntry.findMany.mockResolvedValue([]);

      await service.findAll('user-1', undefined, '2025-01-15', '2025-01-20');

      const callArg = mockPrisma.plannerEntry.findMany.mock.calls[0][0];
      expect(callArg.where.date).toBeDefined();
      expect(callArg.where.date.gte).toBeInstanceOf(Date);
      expect(callArg.where.date.lt).toBeInstanceOf(Date);
    });

    it('should prioritize single date over range', async () => {
      mockPrisma.plannerEntry.findMany.mockResolvedValue([]);

      await service.findAll('user-1', '2025-01-15', '2025-01-10', '2025-01-20');

      const callArg = mockPrisma.plannerEntry.findMany.mock.calls[0][0];
      expect(callArg.where.date).toBeDefined();
      const gte = callArg.where.date.gte as Date;
      expect(gte.getDate()).toBe(15);
    });
  });

  describe('findOne', () => {
    it('should return entry when found', async () => {
      const entry = { id: 'entry-1', userId: 'user-1', title: 'Focus' };
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(entry);

      const result = await service.findOne('user-1', 'entry-1');

      expect(result).toEqual(entry);
      expect(mockPrisma.plannerEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 'entry-1', userId: 'user-1' },
        include: {
          task: {
            select: { id: true, title: true, priority: true, status: true },
          },
        },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(
        'Planner entry not found',
      );
    });
  });

  describe('update', () => {
    it('should update entry with provided fields', async () => {
      const existing = { id: 'entry-1', userId: 'user-1', title: 'Old' };
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(existing);
      mockPrisma.plannerEntry.update.mockResolvedValue({
        ...existing,
        title: 'New',
      });

      const result = await service.update('user-1', 'entry-1', {
        title: 'New',
      });

      expect(mockPrisma.plannerEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { title: 'New', googleEventId: null },
        include: {
          task: {
            select: { id: true, title: true, priority: true, status: true },
          },
        },
      });
      expect(result.title).toBe('New');
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reset googleEventId when time changes', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue({
        id: 'e1',
        googleEventId: 'ge-123',
      });
      mockPrisma.plannerEntry.update.mockResolvedValue({});

      await service.update('user-1', 'e1', { startTime: '10:00' });

      const data = mockPrisma.plannerEntry.update.mock.calls[0][0].data;
      expect(data.googleEventId).toBeNull();
    });

    it('should reset googleEventId when date changes', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue({
        id: 'e1',
        googleEventId: 'ge-123',
      });
      mockPrisma.plannerEntry.update.mockResolvedValue({});

      await service.update('user-1', 'e1', { date: '2025-06-01' });

      const data = mockPrisma.plannerEntry.update.mock.calls[0][0].data;
      expect(data.googleEventId).toBeNull();
    });

    it('should not reset googleEventId when only category changes', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue({
        id: 'e1',
        googleEventId: 'ge-123',
      });
      mockPrisma.plannerEntry.update.mockResolvedValue({});

      await service.update('user-1', 'e1', { category: 'MEETING' });

      const data = mockPrisma.plannerEntry.update.mock.calls[0][0].data;
      expect(data.googleEventId).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should delete entry and return deleted flag', async () => {
      const entry = { id: 'e1', userId: 'user-1', googleEventId: 'ge-1' };
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(entry);
      mockPrisma.plannerEntry.delete.mockResolvedValue(entry);

      const result = await service.remove('user-1', 'e1');

      expect(mockPrisma.plannerEntry.delete).toHaveBeenCalledWith({
        where: { id: 'e1' },
      });
      expect(result).toEqual({ deleted: true, googleEventId: 'ge-1' });
    });

    it('should return null googleEventId when entry had none', async () => {
      const entry = { id: 'e1', userId: 'user-1', googleEventId: null };
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(entry);
      mockPrisma.plannerEntry.delete.mockResolvedValue(entry);

      const result = await service.remove('user-1', 'e1');

      expect(result.googleEventId).toBeNull();
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      mockPrisma.plannerEntry.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'missing')).rejects.toThrow(
        'Planner entry not found',
      );
    });
  });

  describe('generate', () => {
    it('should return empty blocks when no tasks found', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await service.generate('user-1', 'high', 'focused');

      expect(result).toEqual({
        blocks: [],
        focus_message: null,
        workload_level: 'NONE',
      });
      expect(mockPrisma.plannerEntry.deleteMany).not.toHaveBeenCalled();
    });

    it('should call AI service and create entries from blocks', async () => {
      const tasks = [
        {
          id: 't1',
          title: 'Task 1',
          priority: 'HIGH',
          deadline: null,
          status: 'TODO',
          estimate: 2,
          project: null,
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(tasks);

      const aiResponse = {
        data: {
          focus_message: 'Focus on deep work',
          workload_level: 'MODERATE',
          blocks: [
            {
              task_id: 't1',
              title: 'Deep Work: Task 1',
              start_time: '09:00',
              end_time: '11:00',
              reason: 'High priority',
            },
          ],
        },
      };
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(aiResponse),
      });
      global.fetch = mockFetch;

      mockPrisma.plannerEntry.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.plannerEntry.create.mockResolvedValue({
        id: 'e1',
        title: 'Deep Work: Task 1',
      });

      const result = await service.generate(
        'user-1',
        'high',
        'focused',
        '2025-01-15',
      );

      expect(result.blocks).toHaveLength(1);
      expect(result.focusMessage).toBe('Focus on deep work');
      expect(result.workloadLevel).toBe('MODERATE');
      expect(mockPrisma.plannerEntry.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.plannerEntry.create).toHaveBeenCalled();
    });

    it('should delete previous AI entries for the date before creating new ones', async () => {
      const tasks = [
        {
          id: 't1',
          title: 'T',
          priority: 'LOW',
          deadline: null,
          status: 'TODO',
          estimate: 1,
          project: null,
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(tasks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { focus_message: null, workload_level: 'LOW', blocks: [] },
          }),
      });

      mockPrisma.plannerEntry.deleteMany.mockResolvedValue({ count: 2 });

      await service.generate('user-1', 'low', 'tired', '2025-01-15');

      expect(mockPrisma.plannerEntry.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: new Date('2025-01-15'),
          isAiGenerated: true,
        },
      });
    });

    it('should throw InternalServerErrorException when AI service fails', async () => {
      const tasks = [
        {
          id: 't1',
          title: 'T',
          priority: 'LOW',
          deadline: null,
          status: 'TODO',
          estimate: 1,
          project: null,
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(tasks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        service.generate('user-1', 'low', 'tired', '2025-01-15'),
      ).rejects.toThrow('Failed to generate daily plan');
    });

    it('should delete AI entries in date range when startDate and endDate provided', async () => {
      const tasks = [
        {
          id: 't1',
          title: 'T',
          priority: 'LOW',
          deadline: null,
          status: 'TODO',
          estimate: 1,
          project: null,
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(tasks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { focus_message: null, workload_level: 'LOW', blocks: [] },
          }),
      });

      mockPrisma.plannerEntry.deleteMany.mockResolvedValue({ count: 0 });

      await service.generate(
        'user-1',
        'low',
        'tired',
        undefined,
        '2025-01-15',
        '2025-01-17',
      );

      const deleteCall = mockPrisma.plannerEntry.deleteMany.mock.calls[0][0];
      expect(deleteCall.where.isAiGenerated).toBe(true);
      expect(deleteCall.where.userId).toBe('user-1');
      expect(deleteCall.where.date).toBeDefined();
    });
  });
});
