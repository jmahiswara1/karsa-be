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

@Controller('api/task-columns')
@UseGuards(JwtAuthGuard)
export class TaskColumnsController {
  constructor(private readonly taskColumnsService: TaskColumnsService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.taskColumnsService.findAll(user.id);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateTaskColumnDto) {
    return this.taskColumnsService.create(user.id, dto);
  }

  @Post('reorder')
  async reorder(@CurrentUser() user: User, @Body() dto: ReorderColumnsDto) {
    return this.taskColumnsService.reorder(user.id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTaskColumnDto,
  ) {
    return this.taskColumnsService.update(id, user.id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.taskColumnsService.remove(id, user.id);
    return { success: true, data: null };
  }
}
