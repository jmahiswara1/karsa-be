import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { NoteFoldersService } from './note-folders.service';
import { CreateNoteFolderDto } from './dto/create-note-folder.dto';
import { UpdateNoteFolderDto } from './dto/update-note-folder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('api/note-folders')
export class NoteFoldersController {
  constructor(private readonly noteFoldersService: NoteFoldersService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createNoteFolderDto: CreateNoteFolderDto) {
    return this.noteFoldersService.create(user.id, createNoteFolderDto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query('parentId') parentId?: string) {
    // If parentId is 'null', we treat it as literal null to get root folders
    const pid = parentId === 'null' ? null : parentId;
    return this.noteFoldersService.findAll(user.id, pid);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.noteFoldersService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateNoteFolderDto: UpdateNoteFolderDto,
  ) {
    return this.noteFoldersService.update(id, user.id, updateNoteFolderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.noteFoldersService.remove(id, user.id);
  }
}
