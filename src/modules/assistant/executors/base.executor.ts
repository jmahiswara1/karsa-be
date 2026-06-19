import { PrismaService } from '../../../database/prisma.service';
import {
  ActionResultDto,
  EntityType,
  EntityStatus,
} from '../dto/action-result.dto';
import { parseDate } from '../utils/date.util';
import { fuzzyMatch } from '../utils/fuzzy-match.util';

/**
 * Context shared across all executors in a single batch.
 * Maps baru-dibuat entities untuk cross-reference antar tool calls.
 */
export interface ExecutorContext {
  prisma: PrismaService;
  userId: string;
  /** Map nama project (lowercase) → id yang baru saja dibuat di batch ini */
  recentProjectNames: Map<string, string>;
  /** Map nama folder (lowercase) → id yang baru saja dibuat */
  recentFolderNames: Map<string, string>;
  /** Map nama task (lowercase) → id yang baru saja dibuat */
  recentTaskNames: Map<string, string>;
}

/**
 * Abstract base class untuk semua entity executors.
 * Provides helper methods untuk date parsing, fuzzy resolution, dan result building.
 */
export abstract class BaseExecutor {
  abstract readonly type: EntityType;

  abstract execute(
    args: Record<string, unknown>,
    context: ExecutorContext,
  ): Promise<ActionResultDto>;

  protected parseDeadline(raw: unknown): Date | undefined {
    if (!raw || typeof raw !== 'string') return undefined;
    const iso = parseDate(raw);
    if (!iso) return undefined;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return undefined;
    return date;
  }

  protected async resolveProjectId(
    projectName: unknown,
    context: ExecutorContext,
  ): Promise<string | undefined> {
    if (typeof projectName !== 'string' || !projectName.trim())
      return undefined;
    // 1. Check recent batch map dulu (project yang baru dibuat di batch ini)
    const recentId = context.recentProjectNames.get(projectName.toLowerCase());
    if (recentId) return recentId;
    // 2. Query DB untuk active projects user
    const projects = await context.prisma.project.findMany({
      where: {
        userId: context.userId,
        status: { in: ['ACTIVE', 'PLANNING'] },
      },
      select: { id: true, title: true },
    });
    const match = fuzzyMatch(projectName, projects);
    return match?.id;
  }

  protected async resolveFolderId(
    folderName: unknown,
    context: ExecutorContext,
  ): Promise<string | undefined> {
    if (typeof folderName !== 'string' || !folderName.trim()) return undefined;
    const recentId = context.recentFolderNames.get(folderName.toLowerCase());
    if (recentId) return recentId;
    const folders = await context.prisma.noteFolder.findMany({
      where: { userId: context.userId },
      select: { id: true, name: true },
    });
    const match = fuzzyMatch(folderName, folders);
    return match?.id;
  }

  protected async resolveTaskId(
    taskTitle: unknown,
    context: ExecutorContext,
  ): Promise<string | undefined> {
    if (typeof taskTitle !== 'string' || !taskTitle.trim()) return undefined;
    const recentId = context.recentTaskNames.get(taskTitle.toLowerCase());
    if (recentId) return recentId;
    const tasks = await context.prisma.task.findMany({
      where: { userId: context.userId, status: { not: 'CANCELLED' } },
      select: { id: true, title: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });
    const match = fuzzyMatch(taskTitle, tasks);
    return match?.id;
  }

  /** Build a successful pending_confirmation result. */
  protected ok(
    id: string,
    title: string,
    data: Record<string, unknown>,
  ): ActionResultDto {
    return {
      type: this.type,
      id,
      title,
      status: EntityStatus.PENDING_CONFIRMATION,
      data,
    };
  }

  /** Build a failed result. */
  protected fail(title: string, error: string): ActionResultDto {
    return {
      type: this.type,
      title,
      status: EntityStatus.FAILED,
      error,
    };
  }
}
