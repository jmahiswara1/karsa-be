import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

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
}
