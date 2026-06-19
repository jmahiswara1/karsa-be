import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { ConversationService } from './conversation.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssistantController],
  providers: [AssistantService, ConversationService],
  exports: [AssistantService],
})
export class AssistantModule {}
