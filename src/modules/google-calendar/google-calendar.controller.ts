import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GoogleCalendarService } from './google-calendar.service';
import { PlannerService } from '../planner/planner.service';
import { TasksService } from '../tasks/tasks.service';
import type { User } from '@prisma/client';

@Controller('api/planner/calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  private readonly logger = new Logger(GoogleCalendarController.name);

  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly plannerService: PlannerService,
    private readonly tasksService: TasksService,
  ) {}

  @Get('status')
  async getStatus(@CurrentUser() user: User) {
    const hasAccess = await this.googleCalendarService.hasCalendarAccess(
      user.id,
    );
    return {
      success: true,
      data: { connected: hasAccess },
    };
  }

  @Get('sync-preview')
  async getSyncPreview(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const [entries, tasks] = await Promise.all([
      this.plannerService.findAll(user.id, undefined, startDate, endDate),
      this.tasksService.findForSync(user.id, startDate, endDate),
    ]);

    return {
      success: true,
      data: {
        plannerEntries: entries.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          date: e.date.toISOString().split('T')[0],
          startTime: e.startTime,
          endTime: e.endTime,
          googleEventId: e.googleEventId,
        })),
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          deadline: t.deadline ? t.deadline.toISOString().split('T')[0] : null,
          priority: t.priority,
          googleEventId: t.googleEventId,
          projectTitle: t.project?.title ?? null,
        })),
      },
    };
  }

  @Post('sync-to-calendar')
  async syncToCalendar(
    @CurrentUser() user: User,
    @Body() body: { startDate: string; endDate: string; timeZone?: string },
  ) {
    try {
      const hasAccess = await this.googleCalendarService.hasCalendarAccess(
        user.id,
      );
      if (!hasAccess) {
        return {
          success: false,
          message:
            'Google Calendar not connected. Please re-login with Google.',
        };
      }

      // Get planner entries for the date range
      const entries = await this.plannerService.findAll(
        user.id,
        undefined,
        body.startDate,
        body.endDate,
      );

      if (entries.length === 0) {
        return {
          success: true,
          data: { synced: 0, errors: [] },
          message: 'No planner entries to sync.',
        };
      }

      const result = await this.googleCalendarService.syncPlannerEntries(
        user.id,
        entries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          description: entry.description,
          date: entry.date.toISOString().split('T')[0],
          startTime: entry.startTime,
          endTime: entry.endTime,
          googleEventId: entry.googleEventId,
          color: entry.color,
        })),
        body.timeZone,
      );

      // Log sync operation
      await this.googleCalendarService.logSync(
        user.id,
        'sync-to-calendar',
        result,
        body.startDate,
        body.endDate,
      );

      const parts: string[] = [];
      if (result.synced > 0) parts.push(`${result.synced} created`);
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (parts.length === 0) parts.push('0 synced');

      return {
        success: true,
        data: result,
        message:
          result.errors.length > 0
            ? `${parts.join(', ')}. ${result.errors.length} failed: ${result.errors[0]}`
            : `${parts.join(', ')} to Google Calendar.`,
      };
    } catch (error) {
      this.logger.error('syncToCalendar error:', error);
      throw error;
    }
  }

  @Post('sync-tasks-to-calendar')
  async syncTasksToCalendar(
    @CurrentUser() user: User,
    @Body() body: { startDate: string; endDate: string; timeZone?: string },
  ) {
    try {
      const hasAccess = await this.googleCalendarService.hasCalendarAccess(
        user.id,
      );
      if (!hasAccess) {
        return {
          success: false,
          message:
            'Google Calendar not connected. Please re-login with Google.',
        };
      }

      const tasks = await this.tasksService.findForSync(
        user.id,
        body.startDate,
        body.endDate,
      );

      if (tasks.length === 0) {
        return {
          success: true,
          data: { synced: 0, updated: 0, errors: [] },
          message: 'No tasks with deadlines to sync.',
        };
      }

      const result = await this.googleCalendarService.syncTasks(
        user.id,
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          deadline: t.deadline,
          googleEventId: t.googleEventId,
        })),
        body.timeZone,
      );

      await this.googleCalendarService.logSync(
        user.id,
        'sync-tasks',
        result,
        body.startDate,
        body.endDate,
      );

      const parts: string[] = [];
      if (result.synced > 0) parts.push(`${result.synced} created`);
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (parts.length === 0) parts.push('0 synced');

      return {
        success: true,
        data: result,
        message:
          result.errors.length > 0
            ? `${parts.join(', ')}. ${result.errors.length} failed: ${result.errors[0]}`
            : `${parts.join(', ')} tasks to Google Calendar.`,
      };
    } catch (error) {
      this.logger.error('syncTasksToCalendar error:', error);
      throw error;
    }
  }

  @Post('sync-all-to-calendar')
  async syncAllToCalendar(
    @CurrentUser() user: User,
    @Body() body: { startDate: string; endDate: string; timeZone?: string },
  ) {
    try {
      const hasAccess = await this.googleCalendarService.hasCalendarAccess(
        user.id,
      );
      if (!hasAccess) {
        return {
          success: false,
          message:
            'Google Calendar not connected. Please re-login with Google.',
        };
      }

      const [entries, tasks] = await Promise.all([
        this.plannerService.findAll(
          user.id,
          undefined,
          body.startDate,
          body.endDate,
        ),
        this.tasksService.findForSync(user.id, body.startDate, body.endDate),
      ]);

      const [plannerResult, tasksResult] = await Promise.all([
        entries.length > 0
          ? this.googleCalendarService.syncPlannerEntries(
              user.id,
              entries.map((entry) => ({
                id: entry.id,
                title: entry.title,
                description: entry.description,
                date: entry.date.toISOString().split('T')[0],
                startTime: entry.startTime,
                endTime: entry.endTime,
                googleEventId: entry.googleEventId,
                color: entry.color,
              })),
              body.timeZone,
            )
          : Promise.resolve({ synced: 0, updated: 0, errors: [] }),
        tasks.length > 0
          ? this.googleCalendarService.syncTasks(
              user.id,
              tasks.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                deadline: t.deadline,
                googleEventId: t.googleEventId,
              })),
              body.timeZone,
            )
          : Promise.resolve({ synced: 0, updated: 0, errors: [] }),
      ]);

      await this.googleCalendarService.logSync(
        user.id,
        'sync-all',
        {
          synced: plannerResult.synced + tasksResult.synced,
          updated: plannerResult.updated + tasksResult.updated,
          errors: [...plannerResult.errors, ...tasksResult.errors],
        },
        body.startDate,
        body.endDate,
      );

      const allErrors = [...plannerResult.errors, ...tasksResult.errors];
      const totalSynced = plannerResult.synced + tasksResult.synced;
      const totalUpdated = plannerResult.updated + tasksResult.updated;
      const parts: string[] = [];
      if (totalSynced > 0) parts.push(`${totalSynced} created`);
      if (totalUpdated > 0) parts.push(`${totalUpdated} updated`);
      if (parts.length === 0) parts.push('0 synced');

      return {
        success: true,
        data: { planner: plannerResult, tasks: tasksResult },
        message:
          allErrors.length > 0
            ? `${parts.join(', ')}. ${allErrors.length} failed: ${allErrors[0]}`
            : `${parts.join(', ')} to Google Calendar.`,
      };
    } catch (error) {
      this.logger.error('syncAllToCalendar error:', error);
      throw error;
    }
  }

  @Get('events')
  async getCalendarEvents(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const hasAccess = await this.googleCalendarService.hasCalendarAccess(
      user.id,
    );
    if (!hasAccess) {
      return {
        success: false,
        message: 'Google Calendar not connected. Please re-login with Google.',
      };
    }

    const events = await this.googleCalendarService.listEvents(
      user.id,
      startDate,
      endDate,
    );

    return {
      success: true,
      data: events,
    };
  }

  @Post('import-from-calendar')
  async importFromCalendar(
    @CurrentUser() user: User,
    @Body() body: { startDate: string; endDate: string },
  ) {
    try {
      const hasAccess = await this.googleCalendarService.hasCalendarAccess(
        user.id,
      );
      if (!hasAccess) {
        return {
          success: false,
          message:
            'Google Calendar not connected. Please re-login with Google.',
        };
      }

      const events = await this.googleCalendarService.importEventsToPlanner(
        user.id,
        body.startDate,
        body.endDate,
      );

      // Import each event as a planner entry
      const imported = [];
      for (const event of events) {
        if (event.start?.dateTime && event.end?.dateTime) {
          const startDate = new Date(event.start.dateTime);
          const endDate = new Date(event.end.dateTime);

          const entry = await this.plannerService.create(user.id, {
            title: event.summary ?? 'Untitled Event',
            description: event.description ?? undefined,
            date: startDate.toISOString().split('T')[0],
            startTime: startDate.toTimeString().slice(0, 5),
            endTime: endDate.toTimeString().slice(0, 5),
            isAiGenerated: false,
          });

          imported.push(entry);
        }
      }

      // Log import operation
      await this.googleCalendarService.logSync(
        user.id,
        'import-from-calendar',
        { synced: imported.length, updated: 0, errors: [] },
        body.startDate,
        body.endDate,
      );

      return {
        success: true,
        data: { imported: imported.length },
        message: `Imported ${imported.length} events from Google Calendar.`,
      };
    } catch (error) {
      this.logger.error('importFromCalendar error:', error);
      throw error;
    }
  }

  @Post('force-reset')
  async forceReset(@CurrentUser() user: User) {
    const [plannerCount, taskCount] = await Promise.all([
      this.plannerService.clearAllGoogleEventIds(user.id),
      this.tasksService.clearAllGoogleEventIds(user.id),
    ]);
    const total = plannerCount + taskCount;

    await this.googleCalendarService.logSync(user.id, 'force-reset', {
      synced: 0,
      updated: total,
      errors: [],
    });

    return {
      success: true,
      data: { reset: total },
      message: `Reset ${total} Google Calendar links. Next sync will recreate events.`,
    };
  }

  @Get('sync-history')
  async getSyncHistory(@CurrentUser() user: User) {
    const history = await this.googleCalendarService.getSyncHistory(user.id);
    return {
      success: true,
      data: history,
    };
  }
}
