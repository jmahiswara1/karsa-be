import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, type?: string) {
    const where: Record<string, unknown> = { userId };
    if (type) {
      where.type = type;
    }

    return this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findWithMessages(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const { messages, ...conversationData } = conversation;
    return { conversation: conversationData, messages };
  }

  async create(userId: string, dto: CreateConversationDto) {
    return this.prisma.conversation.create({
      data: {
        title: 'New Chat',
        type: dto.type,
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateConversationDto) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.conversation.update({
      where: { id },
      data: { title: dto.title },
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: { id },
    });
  }

  async addMessage(
    conversationId: string,
    userId: string,
    dto: CreateMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const lastMessage = await this.prisma.message.findFirst({
      where: { conversationId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const orderIndex = lastMessage ? lastMessage.orderIndex + 1 : 0;

    const message = await this.prisma.message.create({
      data: {
        role: dto.role,
        content: dto.content,
        isStructured: dto.isStructured ?? false,
        conversationId,
        orderIndex,
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}
