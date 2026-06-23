import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { UsersModule } from '../users/users.module';
import { PlannerModule } from '../planner/planner.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [UsersModule, PlannerModule, TasksModule],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
