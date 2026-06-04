import { Module } from '@nestjs/common';
import { TaskColumnsService } from './task-columns.service';
import { TaskColumnsController } from './task-columns.controller';

@Module({
  providers: [TaskColumnsService],
  controllers: [TaskColumnsController]
})
export class TaskColumnsModule {}
