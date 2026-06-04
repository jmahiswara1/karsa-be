import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { ReorderNotesDto } from './dto/reorder-notes.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('api/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() createNoteDto: CreateNoteDto) {
    const note = await this.notesService.create(user.id, createNoteDto);
    return {
      success: true,
      message: 'Note created successfully',
      data: note,
    };
  }

  @Get()
  async findAll(@CurrentUser() user: User, @Query() query: NoteQueryDto) {
    const result = await this.notesService.findAll(user.id, query);
    return {
      success: true,
      message: 'Notes retrieved successfully',
      ...result,
    };
  }

  @Patch('reorder')
  async reorder(@CurrentUser() user: User, @Body() reorderNotesDto: ReorderNotesDto) {
    await this.notesService.reorder(user.id, reorderNotesDto);
    return {
      success: true,
      message: 'Notes reordered successfully',
    };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    const note = await this.notesService.findOne(user.id, id);
    return {
      success: true,
      message: 'Note retrieved successfully',
      data: note,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    const note = await this.notesService.update(user.id, id, updateNoteDto);
    return {
      success: true,
      message: 'Note updated successfully',
      data: note,
    };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notesService.remove(user.id, id);
    return {
      success: true,
      message: 'Note deleted successfully',
    };
  }
}
