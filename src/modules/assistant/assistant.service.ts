import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AssistantService {
  constructor(private readonly prisma: PrismaService) {}

  async chat(userId: string, prompt: string) {
    // Gather context: active tasks and projects
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        deadline: true,
        status: true,
      },
    });

    const projects = await this.prisma.project.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PLANNING'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        deadline: true,
      },
    });

    const context = { tasks, projects };

    let aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    aiUrl = aiUrl.replace('localhost', '127.0.0.1');
    const aiToken = process.env.AI_SERVICE_TOKEN || 'gadangganteng';

    try {
      const response = await fetch(`${aiUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiToken}`,
        },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with ${response.status}`);
      }

      const result = (await response.json()) as { data: unknown };
      return result.data; // Should return { reply, action, action_data }
    } catch (error) {
      console.error('Error communicating with AI service:', error);
      throw new InternalServerErrorException(
        'Failed to communicate with AI Assistant',
      );
    }
  }
}
