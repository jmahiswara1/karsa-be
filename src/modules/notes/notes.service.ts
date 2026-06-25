import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { ReorderNotesDto } from './dto/reorder-notes.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(userId: string, createNoteDto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        ...createNoteDto,
        userId,
      },
    });

    await this.activityLog.log(userId, 'CREATE', 'Note', note.id, {
      title: note.title,
    });

    return note;
  }

  async findAll(userId: string, query: NoteQueryDto) {
    const { projectId, search, folderId } = query;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const fid = folderId === 'null' ? null : folderId;

    const where: Prisma.NoteWhereInput = {
      userId,
      ...(projectId && { projectId }),
      ...(folderId !== undefined && { folderId: fid }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: {
          project: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prisma.note.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId },
      include: {
        project: {
          select: { id: true, title: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return note;
  }

  async update(userId: string, id: string, updateNoteDto: UpdateNoteDto) {
    const existing = await this.findOne(userId, id); // Ensure it exists and belongs to user

    // If only structural/metadata fields are updated, preserve the existing updatedAt
    const keys = Object.keys(updateNoteDto);
    const isOnlyMetadata =
      keys.length > 0 &&
      keys.every((key) => ['folderId', 'order'].includes(key));

    const note = await this.prisma.note.update({
      where: { id },
      data: {
        ...updateNoteDto,
        ...(isOnlyMetadata ? { updatedAt: existing.updatedAt } : {}),
      },
    });

    if (!isOnlyMetadata) {
      await this.activityLog.log(userId, 'UPDATE', 'Note', id, {
        title: note.title,
        changes: keys,
      });
    }

    return note;
  }

  async reorder(userId: string, reorderNotesDto: ReorderNotesDto) {
    const { notes } = reorderNotesDto;

    const existingNotes = await this.prisma.note.findMany({
      where: { id: { in: notes.map((n) => n.id) }, userId },
      select: { id: true, updatedAt: true },
    });
    const existingMap = new Map(existingNotes.map((n) => [n.id, n.updatedAt]));

    // Execute multiple updates in a transaction
    await this.prisma.$transaction(
      notes.map((note) =>
        this.prisma.note.update({
          where: { id: note.id, userId },
          data: {
            order: note.order,
            updatedAt: existingMap.get(note.id), // preserve original updatedAt
          },
        }),
      ),
    );
  }

  async remove(userId: string, id: string) {
    const note = await this.findOne(userId, id); // Ensure it exists and belongs to user
    await this.prisma.note.delete({
      where: { id },
    });

    await this.activityLog.log(userId, 'DELETE', 'Note', id, {
      title: note.title,
    });

    return note;
  }
}
