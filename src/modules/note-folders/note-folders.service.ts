import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateNoteFolderDto } from './dto/create-note-folder.dto';
import { UpdateNoteFolderDto } from './dto/update-note-folder.dto';

@Injectable()
export class NoteFoldersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createNoteFolderDto: CreateNoteFolderDto) {
    const { name, parentId } = createNoteFolderDto;

    // Check unique constraint
    const existing = await this.prisma.noteFolder.findFirst({
      where: {
        userId,
        name,
        parentId: parentId || null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A folder with this name already exists in the same location',
      );
    }

    if (parentId) {
      const parent = await this.prisma.noteFolder.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.userId !== userId) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    return this.prisma.noteFolder.create({
      data: {
        name,
        parentId: parentId || null,
        userId,
      },
    });
  }

  findAll(userId: string, parentId?: string | null) {
    return this.prisma.noteFolder.findMany({
      where: {
        userId,
        parentId: parentId === null ? null : parentId,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: { notes: true, children: true },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const folder = await this.prisma.noteFolder.findUnique({
      where: { id },
    });

    if (!folder || folder.userId !== userId) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  async update(
    id: string,
    userId: string,
    updateNoteFolderDto: UpdateNoteFolderDto,
  ) {
    const folder = await this.findOne(id, userId);

    if (
      updateNoteFolderDto.name !== undefined ||
      updateNoteFolderDto.parentId !== undefined
    ) {
      const newName =
        updateNoteFolderDto.name !== undefined
          ? updateNoteFolderDto.name
          : folder.name;
      const newParentId =
        updateNoteFolderDto.parentId !== undefined
          ? updateNoteFolderDto.parentId
          : folder.parentId;

      const existing = await this.prisma.noteFolder.findFirst({
        where: {
          userId,
          name: newName,
          parentId: newParentId || null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          'A folder with this name already exists in the destination',
        );
      }

      // Check circular dependency if parentId is updated (basic check: parent cannot be itself)
      if (newParentId === id) {
        throw new ConflictException('Folder cannot be its own parent');
      }
    }

    return this.prisma.noteFolder.update({
      where: { id },
      data: updateNoteFolderDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    // Prisma cascade delete will handle children and notes inside this folder automatically
    return this.prisma.noteFolder.delete({
      where: { id },
    });
  }
}
