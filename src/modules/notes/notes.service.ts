import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createNoteDto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        ...createNoteDto,
        userId,
      },
    });
  }

  async findAll(userId: string, query: NoteQueryDto) {
    const { projectId, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NoteWhereInput = {
      userId,
      ...(projectId && { projectId }),
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
        orderBy: { createdAt: 'desc' },
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
    await this.findOne(userId, id); // Ensure it exists and belongs to user
    return this.prisma.note.update({
      where: { id },
      data: updateNoteDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Ensure it exists and belongs to user
    return this.prisma.note.delete({
      where: { id },
    });
  }
}
