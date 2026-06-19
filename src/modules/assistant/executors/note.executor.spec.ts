/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { NoteExecutor } from './note.executor';
import { ExecutorContext } from './base.executor';
import { PrismaService } from '../../../database/prisma.service';
import { EntityType, EntityStatus } from '../dto/action-result.dto';

describe('NoteExecutor', () => {
  let executor: NoteExecutor;
  let mockPrisma: any;
  let context: ExecutorContext;

  beforeEach(() => {
    executor = new NoteExecutor();
    mockPrisma = {
      noteFolder: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      project: { findMany: jest.fn().mockResolvedValue([]) },
      note: { create: jest.fn() },
    };
    context = {
      prisma: mockPrisma as PrismaService,
      userId: 'user-1',
      recentProjectNames: new Map(),
      recentFolderNames: new Map(),
      recentTaskNames: new Map(),
    };
  });

  it('has type note', () => {
    expect(executor.type).toBe(EntityType.NOTE);
  });

  it('creates note with title and content', async () => {
    mockPrisma.note.create.mockResolvedValue({
      id: 'note-1',
      title: 'My Note',
      content: 'Some content',
    });

    const result = await executor.execute(
      { title: 'My Note', content: 'Some content' },
      context,
    );

    expect(result.type).toBe(EntityType.NOTE);
    expect(result.status).toBe(EntityStatus.PENDING_CONFIRMATION);
    expect(result.id).toBe('note-1');
  });

  it('returns failed if content missing', async () => {
    const result = await executor.execute({ title: 'X' }, context);
    expect(result.status).toBe(EntityStatus.FAILED);
  });

  it('returns failed if title missing', async () => {
    const result = await executor.execute({ content: 'Some content' }, context);
    expect(result.status).toBe(EntityStatus.FAILED);
  });

  it('auto-creates folder if not exists', async () => {
    mockPrisma.noteFolder.findMany.mockResolvedValue([]);
    mockPrisma.noteFolder.create.mockResolvedValue({
      id: 'folder-1',
      name: 'Research',
    });
    mockPrisma.note.create.mockResolvedValue({
      id: 'note-1',
      title: 'X',
      content: 'Y',
    });

    await executor.execute(
      { title: 'X', content: 'Y', folderName: 'Research' },
      context,
    );

    expect(mockPrisma.noteFolder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Research',
          userId: 'user-1',
        }),
      }),
    );
  });

  it('resolves projectName to projectId', async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', title: 'Website Redesign' },
    ]);
    mockPrisma.note.create.mockResolvedValue({
      id: 'note-1',
      title: 'X',
      content: 'Y',
    });

    await executor.execute(
      {
        title: 'X',
        content: 'Y',
        projectName: 'website',
      },
      context,
    );

    expect(mockPrisma.note.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: 'proj-1' }),
      }),
    );
  });
});
