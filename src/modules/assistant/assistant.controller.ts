import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ExecuteActionsDto } from './dto/execute-actions.dto';
import { CreateEntitiesResponseDto } from './dto/action-result.dto';

@Controller('api/assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: { id: string },
    @Body('prompt') prompt: string,
  ): Promise<unknown> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }
    return this.assistantService.chat(user.id, prompt);
  }

  @Post('create-entities')
  async createEntities(
    @CurrentUser() user: { id: string },
    @Body() dto: ExecuteActionsDto,
  ): Promise<CreateEntitiesResponseDto> {
    return this.assistantService.createEntities(user.id, dto);
  }

  // ── Conversation Endpoints ──────────────────────────────────────

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: { id: string },
    @Query('type') type?: string,
  ) {
    const normalizedType = type ? type.toUpperCase() : undefined;
    return this.conversationService.findAll(user.id, normalizedType);
  }

  @Get('conversations/:id/messages')
  async getConversationMessages(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.conversationService.findWithMessages(id, user.id);
  }

  @Post('conversations')
  async createConversation(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationService.create(user.id, dto);
  }

  @Patch('conversations/:id')
  async updateConversation(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationService.update(id, user.id, dto);
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.conversationService.remove(id, user.id);
    return null;
  }

  @Post('conversations/:id/messages')
  async addMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationService.addMessage(id, user.id, dto);
  }
}
