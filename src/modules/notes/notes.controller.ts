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
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { ReorderNotesDto } from './dto/reorder-notes.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Notes')
@ApiBearerAuth()
@Controller('api/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  @ApiBody({ type: CreateNoteDto })
  async create(
    @CurrentUser() user: User,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    const note = await this.notesService.create(user.id, createNoteDto);
    return {
      success: true,
      message: 'Note created successfully',
      data: note,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all notes for the current user' })
  @ApiResponse({ status: 200, description: 'Notes retrieved successfully' })
  @ApiQuery({ type: NoteQueryDto })
  async findAll(@CurrentUser() user: User, @Query() query: NoteQueryDto) {
    const result = await this.notesService.findAll(user.id, query);
    return {
      success: true,
      message: 'Notes retrieved successfully',
      ...result,
    };
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder notes' })
  @ApiResponse({ status: 200, description: 'Notes reordered successfully' })
  @ApiBody({ type: ReorderNotesDto })
  async reorder(
    @CurrentUser() user: User,
    @Body() reorderNotesDto: ReorderNotesDto,
  ) {
    await this.notesService.reorder(user.id, reorderNotesDto);
    return {
      success: true,
      message: 'Notes reordered successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a note by ID' })
  @ApiResponse({ status: 200, description: 'Note retrieved successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Note ID' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    const note = await this.notesService.findOne(user.id, id);
    return {
      success: true,
      message: 'Note retrieved successfully',
      data: note,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a note' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Note ID' })
  @ApiBody({ type: UpdateNoteDto })
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
  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Note ID' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notesService.remove(user.id, id);
    return {
      success: true,
      message: 'Note deleted successfully',
    };
  }
}
