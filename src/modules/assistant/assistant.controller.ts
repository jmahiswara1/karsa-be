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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AssistantService } from './assistant.service';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ExecuteActionsDto } from './dto/execute-actions.dto';
import { CreateEntitiesResponseDto } from './dto/action-result.dto';
import {
  detectSuspiciousPrompt,
  logPromptMetadata,
} from './utils/prompt-security.util';

@ApiTags('Assistant')
@ApiBearerAuth()
@Controller('api/assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('chat')
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Send a chat prompt to the assistant' })
  @ApiResponse({ status: 200, description: 'Success' })
  async chat(
    @CurrentUser() user: { id: string },
    @Body('prompt') prompt: string,
  ): Promise<unknown> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Deteksi prompt mencurigakan
    const isSuspicious = detectSuspiciousPrompt(prompt, user.id);
    if (isSuspicious) {
      logPromptMetadata(prompt, user.id, true);
      return {
        reply:
          'Maaf, saya mendeteksi instruksi yang tidak biasa. Saya hanya bisa membantu dengan tugas manajemen dan produktivitas di Karsa. Apakah ada task atau proyek yang ingin Anda buat?',
        action: null,
        actionData: null,
      };
    }

    return this.assistantService.chat(user.id, prompt);
  }

  @Post('create-entities')
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Create entities from assistant actions' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiBody({ type: ExecuteActionsDto })
  async createEntities(
    @CurrentUser() user: { id: string },
    @Body() dto: ExecuteActionsDto,
  ): Promise<CreateEntitiesResponseDto> {
    // Deteksi prompt mencurigakan
    const isSuspicious = detectSuspiciousPrompt(dto.prompt, user.id);
    if (isSuspicious) {
      logPromptMetadata(dto.prompt, user.id, true);
      return {
        reply:
          'Maaf, saya mendeteksi instruksi yang tidak biasa. Saya hanya bisa membantu dengan pembuatan task dan proyek di Karsa. Apakah ada task atau proyek yang ingin Anda buat?',
        entities: [],
      };
    }

    return this.assistantService.createEntities(user.id, dto);
  }

  // ── Conversation Endpoints ──────────────────────────────────────

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for the current user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiQuery({ name: 'type', required: false, type: String })
  async listConversations(
    @CurrentUser() user: { id: string },
    @Query('type') type?: string,
  ) {
    const normalizedType = type ? type.toUpperCase() : undefined;
    return this.conversationService.findAll(user.id, normalizedType);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a specific conversation' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  async getConversationMessages(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.conversationService.findWithMessages(id, user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiBody({ type: CreateConversationDto })
  async createConversation(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationService.create(user.id, dto);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Update a conversation title' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateConversationDto })
  async updateConversation(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationService.update(id, user.id, dto);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  async deleteConversation(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    await this.conversationService.remove(id, user.id);
    return null;
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Add a message to a conversation' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: CreateMessageDto })
  async addMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationService.addMessage(id, user.id, dto);
  }
}
