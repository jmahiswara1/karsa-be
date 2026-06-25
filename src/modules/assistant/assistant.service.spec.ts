/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  let service: AssistantService;
  let mockPrisma: any;
  let mockActivityLog: any;

  beforeEach(() => {
    mockPrisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      note: {
        create: jest.fn(),
      },
      plannerEntry: {
        create: jest.fn(),
      },
      noteFolder: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      activityLog: {
        create: jest.fn(),
      },
    };

    mockActivityLog = {
      log: jest.fn(),
      listByUser: jest.fn(),
    };

    service = new AssistantService(mockPrisma, mockActivityLog);

    // Mock environment variables
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:8000';
    process.env.AI_SERVICE_TOKEN = 'test-token';
  });

  describe('chat', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should call AI service with correct parameters', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { reply: 'Hello', action: null } }),
      });
      global.fetch = mockFetch;

      await service.chat('user-1', 'Hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/assistant/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }),
      );
    });
  });

  describe('createEntities', () => {
    it('should return empty entities when AI has no tool_calls', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { reply: 'Halo!', tool_calls: [] },
          }),
      });
      global.fetch = mockFetch;

      const result = await service.createEntities('user-1', {
        prompt: 'halo',
      });

      expect(result.reply).toBe('Halo!');
      expect(result.entities).toEqual([]);
    });

    it('should distribute tool calls to correct executors', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              reply: 'OK',
              tool_calls: [
                { name: 'create_task', arguments: { title: 'Task A' } },
              ],
            },
          }),
      });
      global.fetch = mockFetch;

      mockPrisma.task.create.mockResolvedValue({
        id: 'task-1',
        title: 'Task A',
      });

      const result = await service.createEntities('user-1', {
        prompt: 'Buat task A',
      });

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('task');
      expect(result.entities[0].title).toBe('Task A');
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });

    it('should continue when one executor fails', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              reply: 'OK',
              tool_calls: [
                { name: 'create_task', arguments: {} }, // will fail (no title)
                { name: 'create_project', arguments: { title: 'Valid' } },
              ],
            },
          }),
      });
      global.fetch = mockFetch;

      mockPrisma.project.create.mockResolvedValue({
        id: 'proj-1',
        title: 'Valid',
      });

      const result = await service.createEntities('user-1', {
        prompt: 'Mixed',
      });

      expect(result.entities).toHaveLength(2);
      const failed = result.entities.find((e: any) => e.status === 'failed');
      expect(failed).toBeDefined();
      const ok = result.entities.find(
        (e: any) => e.status === 'pending_confirmation',
      );
      expect(ok).toBeDefined();
    });

    it('should prioritize project creation before other entities', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              reply: 'OK',
              tool_calls: [
                { name: 'create_task', arguments: { title: 'Task A' } },
                { name: 'create_project', arguments: { title: 'Project X' } },
              ],
            },
          }),
      });
      global.fetch = mockFetch;

      const callOrder: string[] = [];

      mockPrisma.project.create.mockImplementation(() => {
        callOrder.push('project');
        return Promise.resolve({ id: 'proj-1', title: 'Project X' });
      });

      mockPrisma.task.create.mockImplementation(() => {
        callOrder.push('task');
        return Promise.resolve({ id: 'task-1', title: 'Task A' });
      });

      await service.createEntities('user-1', { prompt: 'test' });

      expect(callOrder[0]).toBe('project');
      expect(callOrder[1]).toBe('task');
    });

    it('should throw error when AI service fails', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch;

      await expect(
        service.createEntities('user-1', { prompt: 'test' }),
      ).rejects.toThrow('Failed to communicate with AI Assistant');
    });
  });
});
