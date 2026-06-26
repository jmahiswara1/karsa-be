import { GoogleCalendarService } from './google-calendar.service';

const mockCalendarEvents = {
  list: jest.fn(),
  insert: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
};

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: jest.fn(),
      })),
    },
    calendar: jest.fn().mockImplementation(() => ({
      events: mockCalendarEvents,
    })),
  },
}));

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let mockUsersService: any;
  let mockConfigService: any;
  let mockPlannerService: any;
  let mockTasksService: any;
  let mockPrisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    googleCalendarToken: 'access-token',
    googleCalendarRefreshToken: 'refresh-token',
  };

  beforeEach(() => {
    mockUsersService = {
      findById: jest.fn().mockResolvedValue(mockUser),
      updateCalendarTokens: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('config-value'),
    };

    mockPlannerService = {
      setGoogleEventId: jest.fn(),
    };

    mockTasksService = {
      setGoogleEventId: jest.fn(),
    };

    mockPrisma = {
      syncLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new GoogleCalendarService(
      mockUsersService,
      mockConfigService,
      mockPlannerService,
      mockTasksService,
      mockPrisma,
    );

    // Reset and setup default returns
    mockCalendarEvents.list.mockReset();
    mockCalendarEvents.insert.mockReset();
    mockCalendarEvents.patch.mockReset();
    mockCalendarEvents.delete.mockReset();
    mockCalendarEvents.get.mockReset();

    mockCalendarEvents.list.mockResolvedValue({ data: { items: [] } });
    mockCalendarEvents.insert.mockResolvedValue({ data: { id: 'event-1' } });
    mockCalendarEvents.patch.mockResolvedValue({ data: { id: 'event-1' } });
    mockCalendarEvents.delete.mockResolvedValue({});
    mockCalendarEvents.get.mockResolvedValue({ data: { id: 'event-1' } });
  });

  describe('hasCalendarAccess', () => {
    it('should return true when user has calendar token', async () => {
      const result = await service.hasCalendarAccess('user-1');
      expect(result).toBe(true);
    });

    it('should return false when user has no calendar token', async () => {
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        googleCalendarToken: null,
      });
      const result = await service.hasCalendarAccess('user-1');
      expect(result).toBe(false);
    });
  });

  describe('listEvents', () => {
    it('should return events from calendar', async () => {
      mockCalendarEvents.list.mockResolvedValue({
        data: { items: [{ id: 'evt-1', summary: 'Meeting' }] },
      });

      const result = await service.listEvents(
        'user-1',
        '2026-01-01',
        '2026-01-31',
      );

      expect(result).toHaveLength(1);
      expect(mockCalendarEvents.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: '2026-01-01',
        timeMax: '2026-01-31',
        singleEvents: true,
        orderBy: 'startTime',
      });
    });

    it('should return empty array when no events', async () => {
      mockCalendarEvents.list.mockResolvedValue({ data: { items: null } });
      const result = await service.listEvents(
        'user-1',
        '2026-01-01',
        '2026-01-31',
      );
      expect(result).toEqual([]);
    });
  });

  describe('createEvent', () => {
    it('should create event and return data', async () => {
      const eventBody = {
        summary: 'Test Event',
        start: { dateTime: '2026-01-15T09:00:00' },
        end: { dateTime: '2026-01-15T10:00:00' },
      };

      const result = await service.createEvent('user-1', eventBody);

      expect(result.id).toBe('event-1');
      expect(mockCalendarEvents.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: eventBody,
      });
    });
  });

  describe('updateEvent', () => {
    it('should update event', async () => {
      const result = await service.updateEvent('user-1', 'evt-1', {
        summary: 'Updated',
      });

      expect(result.id).toBe('event-1');
      expect(mockCalendarEvents.patch).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'evt-1',
        requestBody: { summary: 'Updated' },
      });
    });
  });

  describe('deleteEvent', () => {
    it('should delete event', async () => {
      await service.deleteEvent('user-1', 'evt-1');

      expect(mockCalendarEvents.delete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'evt-1',
      });
    });
  });

  describe('getEvent', () => {
    it('should return event by id', async () => {
      const result = await service.getEvent('user-1', 'evt-1');
      expect(result.id).toBe('event-1');
    });
  });

  describe('syncPlannerEntries', () => {
    it('should create new event for entry without googleEventId', async () => {
      const entries = [
        {
          id: 'entry-1',
          title: 'Focus Time',
          date: '2026-01-15',
          startTime: '09:00',
          endTime: '10:00',
        },
      ];

      const result = await service.syncPlannerEntries('user-1', entries);

      expect(result.synced).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockCalendarEvents.insert).toHaveBeenCalled();
      expect(mockPlannerService.setGoogleEventId).toHaveBeenCalledWith(
        'user-1',
        'entry-1',
        'event-1',
      );
    });

    it('should update existing event when googleEventId is set and event exists', async () => {
      const entries = [
        {
          id: 'entry-1',
          title: 'Focus Time',
          date: '2026-01-15',
          startTime: '09:00',
          endTime: '10:00',
          googleEventId: 'evt-1',
        },
      ];

      const result = await service.syncPlannerEntries('user-1', entries);

      expect(result.synced).toBe(0);
      expect(result.updated).toBe(1);
      expect(mockCalendarEvents.get).toHaveBeenCalled();
      expect(mockCalendarEvents.patch).toHaveBeenCalled();
    });

    it('should recreate event when existing event returns 404', async () => {
      mockCalendarEvents.get.mockRejectedValueOnce({ code: 404 });
      const entries = [
        {
          id: 'entry-1',
          title: 'Focus Time',
          date: '2026-01-15',
          startTime: '09:00',
          endTime: '10:00',
          googleEventId: 'evt-deleted',
        },
      ];

      const result = await service.syncPlannerEntries('user-1', entries);

      expect(result.synced).toBe(1);
      expect(mockPlannerService.setGoogleEventId).toHaveBeenCalledWith(
        'user-1',
        'entry-1',
        null,
      );
      expect(mockCalendarEvents.insert).toHaveBeenCalled();
    });

    it('should track errors when sync fails', async () => {
      mockCalendarEvents.insert.mockRejectedValueOnce(new Error('API Error'));
      const entries = [
        {
          id: 'entry-1',
          title: 'Focus Time',
          date: '2026-01-15',
          startTime: '09:00',
          endTime: '10:00',
        },
      ];

      const result = await service.syncPlannerEntries('user-1', entries);

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Focus Time');
    });
  });

  describe('syncTasks', () => {
    it('should skip task without deadline', async () => {
      const tasks = [
        { id: 'task-1', title: 'No Deadline Task', deadline: null },
      ];

      const result = await service.syncTasks('user-1', tasks);

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('no deadline');
    });

    it('should create all-day event for task with deadline', async () => {
      const tasks = [
        {
          id: 'task-1',
          title: 'Submit Report',
          deadline: new Date('2026-01-15T00:00:00Z'),
        },
      ];

      const result = await service.syncTasks('user-1', tasks);

      expect(result.synced).toBe(1);
      expect(mockCalendarEvents.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            summary: '[Task] Submit Report',
          }),
        }),
      );
    });

    it('should update existing task event', async () => {
      const tasks = [
        {
          id: 'task-1',
          title: 'Submit Report',
          deadline: new Date('2026-01-15T00:00:00Z'),
          googleEventId: 'evt-1',
        },
      ];

      const result = await service.syncTasks('user-1', tasks);

      expect(result.updated).toBe(1);
      expect(mockCalendarEvents.patch).toHaveBeenCalled();
    });

    it('should recreate task event on 404', async () => {
      mockCalendarEvents.get.mockRejectedValueOnce({ code: 404 });
      const tasks = [
        {
          id: 'task-1',
          title: 'Submit Report',
          deadline: new Date('2026-01-15T00:00:00Z'),
          googleEventId: 'evt-deleted',
        },
      ];

      const result = await service.syncTasks('user-1', tasks);

      expect(result.synced).toBe(1);
      expect(mockTasksService.setGoogleEventId).toHaveBeenCalledWith(
        'user-1',
        'task-1',
        null,
      );
    });
  });

  describe('logSync', () => {
    it('should create sync log entry', async () => {
      await service.logSync('user-1', 'sync-planner', {
        synced: 2,
        updated: 1,
        errors: [],
      });

      expect(mockPrisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            action: 'sync-planner',
            syncedCount: 2,
            updatedCount: 1,
            failedCount: 0,
          }),
        }),
      );
    });

    it('should stringify errors array', async () => {
      await service.logSync('user-1', 'sync', {
        synced: 0,
        updated: 0,
        errors: ['err1', 'err2'],
      });

      expect(mockPrisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedCount: 2,
            errors: '["err1","err2"]',
          }),
        }),
      );
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync logs ordered by date', async () => {
      mockPrisma.syncLog.findMany.mockResolvedValue([{ id: 'log-1' }]);

      const result = await service.getSyncHistory('user-1', 10);

      expect(result).toHaveLength(1);
      expect(mockPrisma.syncLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });
});
