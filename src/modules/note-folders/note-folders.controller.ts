import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
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
import { NoteFoldersService } from './note-folders.service';
import { CreateNoteFolderDto } from './dto/create-note-folder.dto';
import { UpdateNoteFolderDto } from './dto/update-note-folder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('NoteFolders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/note-folders')
export class NoteFoldersController {
  constructor(private readonly noteFoldersService: NoteFoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  @ApiBody({ type: CreateNoteFolderDto })
  create(
    @CurrentUser() user: User,
    @Body() createNoteFolderDto: CreateNoteFolderDto,
  ) {
    return this.noteFoldersService.create(user.id, createNoteFolderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all note folders' })
  @ApiResponse({ status: 200, description: 'Folders retrieved successfully' })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Parent folder ID (use "null" for root folders)',
  })
  findAll(@CurrentUser() user: User, @Query('parentId') parentId?: string) {
    // If parentId is 'null', we treat it as literal null to get root folders
    const pid = parentId === 'null' ? null : parentId;
    return this.noteFoldersService.findAll(user.id, pid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a note folder by ID' })
  @ApiResponse({ status: 200, description: 'Folder retrieved successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Folder ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.noteFoldersService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a note folder' })
  @ApiResponse({ status: 200, description: 'Folder updated successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Folder ID' })
  @ApiBody({ type: UpdateNoteFolderDto })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateNoteFolderDto: UpdateNoteFolderDto,
  ) {
    return this.noteFoldersService.update(id, user.id, updateNoteFolderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a note folder' })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Folder ID' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.noteFoldersService.remove(id, user.id);
  }
}
