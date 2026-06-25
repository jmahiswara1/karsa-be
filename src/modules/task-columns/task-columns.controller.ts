import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TaskColumnsService } from './task-columns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateColumnSchema = z.object({
  name: z.string().min(1),
});
export class CreateTaskColumnDto extends createZodDto(CreateColumnSchema) {}

const UpdateColumnSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().optional(),
});
export class UpdateTaskColumnDto extends createZodDto(UpdateColumnSchema) {}

const ReorderColumnsSchema = z.object({
  columns: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    }),
  ),
});
export class ReorderColumnsDto extends createZodDto(ReorderColumnsSchema) {}

@ApiTags('TaskColumns')
@ApiBearerAuth()
@Controller('api/task-columns')
@UseGuards(JwtAuthGuard)
export class TaskColumnsController {
  constructor(private readonly taskColumnsService: TaskColumnsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all task columns for the current user' })
  @ApiResponse({ status: 200, description: 'Columns retrieved successfully' })
  async findAll(@CurrentUser() user: User) {
    return this.taskColumnsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task column' })
  @ApiResponse({ status: 201, description: 'Column created successfully' })
  @ApiBody({ type: CreateTaskColumnDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateTaskColumnDto) {
    return this.taskColumnsService.create(user.id, dto);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder task columns' })
  @ApiResponse({ status: 200, description: 'Columns reordered successfully' })
  @ApiBody({ type: ReorderColumnsDto })
  async reorder(@CurrentUser() user: User, @Body() dto: ReorderColumnsDto) {
    return this.taskColumnsService.reorder(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task column' })
  @ApiResponse({ status: 200, description: 'Column updated successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Column ID' })
  @ApiBody({ type: UpdateTaskColumnDto })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTaskColumnDto,
  ) {
    return this.taskColumnsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task column' })
  @ApiResponse({ status: 200, description: 'Column deleted successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Column ID' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.taskColumnsService.remove(id, user.id);
    return { success: true, data: null };
  }
}
