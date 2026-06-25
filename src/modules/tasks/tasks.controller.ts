import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('api/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiBody({ type: CreateTaskDto })
  async create(
    @CurrentUser() user: User,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(user.id, createTaskDto);
    return {
      success: true,
      message: 'Task created successfully',
      data: task,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiQuery({ type: TaskQueryDto })
  async findAll(@CurrentUser() user: User, @Query() query: TaskQueryDto) {
    const result = await this.tasksService.findAll(user.id, query);
    return {
      success: true,
      message: 'Tasks retrieved successfully',
      ...result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    const task = await this.tasksService.findOne(user.id, id);
    return {
      success: true,
      message: 'Task retrieved successfully',
      data: task,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateTaskDto })
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
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiParam({ name: 'id', type: String })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.tasksService.remove(user.id, id);
    return {
      success: true,
      message: 'Task deleted successfully',
    };
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder tasks' })
  @ApiResponse({ status: 200, description: 'Tasks reordered successfully' })
  async reorder(
    @CurrentUser() user: User,
    @Body()
    dto: {
      tasks: { id: string; order: number; columnId?: string; status?: any }[];
    },
  ) {
    await this.tasksService.reorder(user.id, dto.tasks);
    return {
      success: true,
      message: 'Tasks reordered successfully',
    };
  }
}
