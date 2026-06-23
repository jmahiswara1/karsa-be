import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [UsersModule, TasksModule],
  providers: [PlannerService, GoogleCalendarService],
  controllers: [PlannerController],
  exports: [PlannerService],
})
export class PlannerModule {}
