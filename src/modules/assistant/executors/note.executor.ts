import { Injectable } from '@nestjs/common';
import { BaseExecutor, ExecutorContext } from './base.executor';
import { ActionResultDto, EntityType } from '../dto/action-result.dto';

@Injectable()
export class NoteExecutor extends BaseExecutor {
  readonly type = EntityType.NOTE;

  async execute(
    args: Record<string, unknown>,
    context: ExecutorContext,
  ): Promise<ActionResultDto> {
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const content = typeof args.content === 'string' ? args.content : '';

    if (!title) {
      return this.fail('Untitled note', 'Title is required');
    }
    if (!content) {
      return this.fail(title, 'Content is required');
    }

    try {
      const projectId = await this.resolveProjectId(args.projectName, context);
      let folderId = await this.resolveFolderId(args.folderName, context);

      // Auto-create folder kalau tidak ada dan nama folder diberikan
      if (
        !folderId &&
        typeof args.folderName === 'string' &&
        args.folderName.trim()
      ) {
        const folderName = args.folderName.trim();
        const created = await context.prisma.noteFolder.create({
          data: { name: folderName, userId: context.userId },
        });
        folderId = created.id;
        context.recentFolderNames.set(folderName.toLowerCase(), created.id);
      }

      const created = await context.prisma.note.create({
        data: {
          title,
          content,
          projectId,
          folderId,
          userId: context.userId,
        },
      });

      return this.ok(created.id, created.title, {
        content: created.content,
        projectId: created.projectId,
        folderId: created.folderId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.fail(title, message);
    }
  }
}
