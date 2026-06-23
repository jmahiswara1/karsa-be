import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PlannerService } from '../planner/planner.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly plannerService: PlannerService,
    private readonly tasksService: TasksService,
    private readonly prisma: PrismaService,
  ) {}

  private async getCalendarClient(
    userId: string,
  ): Promise<calendar_v3.Calendar> {
    const user = await this.usersService.findById(userId);
    if (!user?.googleCalendarToken) {
      throw new UnauthorizedException(
        'Google Calendar not connected. Please re-login with Google.',
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL'),
    );

    oauth2Client.setCredentials({
      access_token: user.googleCalendarToken,
      refresh_token: user.googleCalendarRefreshToken ?? undefined,
    });

    // Handle token refresh
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        this.usersService
          .updateCalendarTokens(
            userId,
            tokens.access_token,
            tokens.refresh_token ?? user.googleCalendarRefreshToken ?? '',
          )
          .catch(() => {});
      }
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async listEvents(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<calendar_v3.Schema$Event[]> {
    const calendar = await this.getCalendarClient(userId);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items ?? [];
  }

  async createEvent(
    userId: string,
    event: {
      summary: string;
      description?: string;
      start: { dateTime?: string; date?: string; timeZone?: string };
      end: { dateTime?: string; date?: string; timeZone?: string };
    },
  ): Promise<calendar_v3.Schema$Event> {
    const calendar = await this.getCalendarClient(userId);

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  }

  async updateEvent(
    userId: string,
    eventId: string,
    event: {
      summary?: string;
      description?: string;
      start?: { dateTime?: string; date?: string; timeZone?: string };
      end?: { dateTime?: string; date?: string; timeZone?: string };
    },
  ): Promise<calendar_v3.Schema$Event> {
    const calendar = await this.getCalendarClient(userId);

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: event,
    });

    return response.data;
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const calendar = await this.getCalendarClient(userId);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }

  async getEvent(
    userId: string,
    eventId: string,
  ): Promise<calendar_v3.Schema$Event> {
    const calendar = await this.getCalendarClient(userId);

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    return response.data;
  }

  async syncPlannerEntries(
    userId: string,
    entries: Array<{
      id: string;
      title: string;
      description?: string | null;
      date: string;
      startTime: string;
      endTime: string;
      googleEventId?: string | null;
      color?: string | null;
    }>,
    timeZone: string = 'Asia/Jakarta',
  ): Promise<{
    synced: number;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;
    let updated = 0;

    for (const entry of entries) {
      const startDateTime = `${entry.date}T${entry.startTime}:00`;
      const endDateTime = `${entry.date}T${entry.endTime}:00`;
      const eventBody = {
        summary: entry.title,
        description: entry.description ?? undefined,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
      };

      try {
        if (entry.googleEventId) {
          try {
            await this.getEvent(userId, entry.googleEventId);
            // Event still exists → update it
            await this.updateEvent(userId, entry.googleEventId, eventBody);
            updated++;
            continue;
          } catch (err: unknown) {
            // 404 → event deleted from Google Calendar, clear field and recreate
            if (
              typeof err === 'object' &&
              err !== null &&
              'code' in err &&
              (err as { code: number }).code === 404
            ) {
              await this.plannerService.setGoogleEventId(
                userId,
                entry.id,
                null,
              );
              // Fall through to create new event
            } else {
              throw err;
            }
          }
        }

        // Create new event
        const event = await this.createEvent(userId, eventBody);
        await this.plannerService.setGoogleEventId(
          userId,
          entry.id,
          event.id ?? null,
        );
        synced++;
      } catch (error) {
        this.logger.error(`Failed to sync "${entry.title}":`, error);
        errors.push(`Failed to sync "${entry.title}": ${error}`);
      }
    }

    return { synced, updated, errors };
  }

  async importEventsToPlanner(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<calendar_v3.Schema$Event[]> {
    const events = await this.listEvents(userId, startDate, endDate);

    // Filter out all-day events and only return timed events
    return events.filter(
      (event) => event.start?.dateTime && event.end?.dateTime,
    );
  }

  async hasCalendarAccess(userId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    return !!user?.googleCalendarToken;
  }

  async syncTasks(
    userId: string,
    tasks: Array<{
      id: string;
      title: string;
      description?: string | null;
      deadline: Date | null;
      googleEventId?: string | null;
    }>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    timeZone: string = 'Asia/Jakarta',
  ): Promise<{
    synced: number;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;
    let updated = 0;

    for (const task of tasks) {
      if (!task.deadline) {
        errors.push(`Task "${task.title}": no deadline, skipping`);
        continue;
      }

      const deadlineDate = new Date(task.deadline);
      const year = deadlineDate.getUTCFullYear();
      const month = String(deadlineDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(deadlineDate.getUTCDate()).padStart(2, '0');
      const startDateStr = `${year}-${month}-${day}`;
      const nextDay = new Date(deadlineDate.getTime() + 24 * 60 * 60 * 1000);
      const nextYear = nextDay.getUTCFullYear();
      const nextMonth = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
      const nextDayStr = String(nextDay.getUTCDate()).padStart(2, '0');
      const endDateStr = `${nextYear}-${nextMonth}-${nextDayStr}`;

      const eventBody = {
        summary: `[Task] ${task.title}`,
        description: task.description ?? undefined,
        start: { date: startDateStr },
        end: { date: endDateStr },
      };

      try {
        if (task.googleEventId) {
          try {
            await this.getEvent(userId, task.googleEventId);
            await this.updateEvent(userId, task.googleEventId, eventBody);
            updated++;
            continue;
          } catch (err: unknown) {
            if (
              typeof err === 'object' &&
              err !== null &&
              'code' in err &&
              (err as { code: number }).code === 404
            ) {
              await this.tasksService.setGoogleEventId(userId, task.id, null);
            } else {
              throw err;
            }
          }
        }

        const event = await this.createEvent(userId, eventBody);
        await this.tasksService.setGoogleEventId(
          userId,
          task.id,
          event.id ?? null,
        );
        synced++;
      } catch (error) {
        this.logger.error(`Failed to sync task "${task.title}":`, error);
        errors.push(`Failed to sync task "${task.title}": ${error}`);
      }
    }

    return { synced, updated, errors };
  }

  async logSync(
    userId: string,
    action: string,
    result: { synced: number; updated: number; errors: string[] },
    rangeStart?: string,
    rangeEnd?: string,
  ) {
    await this.prisma.syncLog.create({
      data: {
        userId,
        action,
        syncedCount: result.synced,
        updatedCount: result.updated,
        failedCount: result.errors.length,
        errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        rangeStart,
        rangeEnd,
      },
    });
  }

  async getSyncHistory(userId: string, limit = 20) {
    return await this.prisma.syncLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
