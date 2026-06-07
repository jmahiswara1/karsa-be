import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('api/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() createTaskDto: CreateTaskDto) {
    const task = await this.tasksService.create(user.id, createTaskDto);
    return {
      success: true,
      message: 'Task created successfully',
      data: task,
    };
  }

  @Get()
  async findAll(@CurrentUser() user: User, @Query() query: TaskQueryDto) {
    const result = await this.tasksService.findAll(user.id, query);
    return {
      success: true,
      message: 'Tasks retrieved successfully',
      ...result,
    };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    const task = await this.tasksService.findOne(user.id, id);
    return {
      success: true,
      message: 'Task retrieved successfully',
      data: task,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user.id, id, updateTaskDto);
    return {
      success: true,
      message: 'Task updated successfully',
      data: task,
    };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.tasksService.remove(user.id, id);
    return {
      success: true,
      message: 'Task deleted successfully',
    };
  }

  @Post('reorder')
  async reorder(
    @CurrentUser() user: User,
    @Body() dto: { tasks: { id: string; order: number; columnId?: string; status?: any }[] }
  ) {
    await this.tasksService.reorder(user.id, dto.tasks);
    return {
      success: true,
      message: 'Tasks reordered successfully',
    };
  }
}
