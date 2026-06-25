# Backend Chat Session History - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conversation persistence endpoints to the NestJS backend so the frontend can sync chat history to PostgreSQL.

**Architecture:** Extend the existing `assistant` module with a new `ConversationService` for CRUD operations on conversations and messages. Use Prisma for database access with cascade deletes. All endpoints protected by JWT auth, following existing NestJS patterns (Controller → Service → Prisma).

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, class-validator, TypeScript

## Global Constraints

- All endpoints under `/api/assistant/conversations` controller prefix
- Response format handled by global `ResponseInterceptor` → `{ success, message, data }` — do NOT manually wrap responses
- Auth via `@UseGuards(JwtAuthGuard)` + `@CurrentUser()` decorator
- DTOs use `class-validator` decorators (matching existing pattern in codebase)
- Follow existing module structure: `src/modules/assistant/` with controller, service, module, dto/
- Prisma handles `updatedAt` automatically via `@updatedAt` attribute
- Cascade delete: deleting a conversation must delete all its messages
- All `userId` values come from JWT token, never from request body
- `type` enum values: `ASSISTANT`, `MINI` (Prisma enum, uppercase)
- `role` field on messages: lowercase `"user"` or `"assistant"` (stored as String, not enum)

## File Structure

```
prisma/
├── schema.prisma (MODIFY) — Add ConversationType enum, Conversation model, Message model, User relation

src/modules/assistant/
├── assistant.module.ts (MODIFY) — Register ConversationService
├── assistant.controller.ts (MODIFY) — Add conversation CRUD + message endpoints
├── conversation.service.ts (NEW) — Prisma queries for conversations and messages
└── dto/
    ├── create-conversation.dto.ts (NEW) — type validation
    ├── update-conversation.dto.ts (NEW) — title validation
    └── create-message.dto.ts (NEW) — role + content validation
```

---

### Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `ConversationType` enum, `Conversation` model, `Message` model
- Adds `conversations` relation to existing `User` model

- [ ] **Step 1: Add enum and models to schema**

Add the following at the end of `prisma/schema.prisma` (before the last model):

```prisma
enum ConversationType {
  ASSISTANT
  MINI
}

model Conversation {
  id        String           @id @default(uuid())
  title     String           @default("New Chat")
  type      ConversationType
  userId    String
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([userId, type, updatedAt(sort: Desc)])
}

model Message {
  id             String   @id @default(uuid())
  role           String
  content        String
  isStructured   Boolean  @default(false)
  conversationId String
  orderIndex     Int
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, orderIndex])
}
```

- [ ] **Step 2: Add relation to User model**

In the `User` model in `prisma/schema.prisma`, add this line among the other relations:

```prisma
  conversations Conversation[]
```

- [ ] **Step 3: Generate migration**

Run: `cd e:\Project\Karsa\be-karsa && npx prisma migrate dev --name add_conversation_history`
Expected: Migration applied successfully, no errors

- [ ] **Step 4: Verify Prisma client generation**

Run: `cd e:\Project\Karsa\be-karsa && npx prisma generate`
Expected: Prisma client generated successfully

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add Conversation and Message models to Prisma schema"
```

---

### Task 2: Create DTOs

**Files:**
- Create: `src/modules/assistant/dto/create-conversation.dto.ts`
- Create: `src/modules/assistant/dto/update-conversation.dto.ts`
- Create: `src/modules/assistant/dto/create-message.dto.ts`

**Interfaces:**
- Produces: `CreateConversationDto`, `UpdateConversationDto`, `CreateMessageDto`
- Consumed by: `assistant.controller.ts` (Task 4)

- [ ] **Step 1: Create CreateConversationDto**

Create `src/modules/assistant/dto/create-conversation.dto.ts`:

```typescript
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ConversationTypeEnum {
  ASSISTANT = 'ASSISTANT',
  MINI = 'MINI',
}

export class CreateConversationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ConversationTypeEnum)
  type: ConversationTypeEnum;
}
```

- [ ] **Step 2: Create UpdateConversationDto**

Create `src/modules/assistant/dto/update-conversation.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
```

- [ ] **Step 3: Create CreateMessageDto**

Create `src/modules/assistant/dto/create-message.dto.ts`:

```typescript
import { IsString, IsIn, IsBoolean, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: string;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isStructured?: boolean;
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd e:\Project\Karsa\be-karsa && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/assistant/dto/
git commit -m "feat: add DTOs for conversation and message endpoints"
```

---

### Task 3: Create ConversationService

**Files:**
- Create: `src/modules/assistant/conversation.service.ts`

**Interfaces:**
- Consumes: `PrismaService` from `src/database/prisma.service.ts`, DTOs from Task 2
- Produces: `ConversationService` with methods: `findAll`, `findWithMessages`, `create`, `update`, `remove`, `addMessage`

- [ ] **Step 1: Create ConversationService**

Create `src/modules/assistant/conversation.service.ts`:

```typescript
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

  async addMessage(conversationId: string, userId: string, dto: CreateMessageDto) {
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd e:\Project\Karsa\be-karsa && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/assistant/conversation.service.ts
git commit -m "feat: add ConversationService with CRUD and message management"
```

---

### Task 4: Update Controller with New Endpoints

**Files:**
- Modify: `src/modules/assistant/assistant.controller.ts`

**Interfaces:**
- Consumes: `ConversationService` from Task 3, DTOs from Task 2
- Produces: 6 new HTTP endpoints on the controller

- [ ] **Step 1: Update assistant.controller.ts**

Replace the entire content of `src/modules/assistant/assistant.controller.ts`:

```typescript
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

  // ── Conversation Endpoints ──────────────────────────────────────

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: { id: string },
    @Query('type') type?: string,
  ) {
    // Normalize type to uppercase to match Prisma enum
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd e:\Project\Karsa\be-karsa && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/assistant/assistant.controller.ts
git commit -m "feat: add conversation CRUD and message endpoints to controller"
```

---

### Task 5: Register ConversationService in Module

**Files:**
- Modify: `src/modules/assistant/assistant.module.ts`

**Interfaces:**
- Consumes: `ConversationService` from Task 3

- [ ] **Step 1: Read current assistant.module.ts**

Run: `cd e:\Project\Karsa\be-karsa && cat src/modules/assistant/assistant.module.ts`
Note the current imports and providers.

- [ ] **Step 2: Add ConversationService to module**

In `src/modules/assistant/assistant.module.ts`, add `ConversationService` to the `providers` array and the import:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { ConversationService } from './conversation.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssistantController],
  providers: [AssistantService, ConversationService],
})
export class AssistantModule {}
```

- [ ] **Step 3: Verify build**

Run: `cd e:\Project\Karsa\be-karsa && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/assistant/assistant.module.ts
git commit -m "feat: register ConversationService in AssistantModule"
```

---

### Task 6: Integration Testing

**Files:**
- Test all endpoints manually or via e2e tests

- [ ] **Step 1: Start the backend server**

Run: `cd e:\Project\Karsa\be-karsa && npm run start:dev`
Expected: Server starts on port 3001

- [ ] **Step 2: Test with frontend**

1. Open the frontend at `http://localhost:3000`
2. Go to `/dashboard` — expand mini chat — send a message
3. Check browser Network tab — verify `POST /api/assistant/conversations` returns 201
4. Verify `POST /api/assistant/conversations/:id/messages` returns 201
5. Check browser console — no more "Failed to create conversation" errors
6. Check "Sync failed" badge no longer appears on messages

- [ ] **Step 3: Test conversation persistence**

1. Send several messages in `/assistant` page
2. Refresh the page
3. Verify messages are restored from backend (check Network tab for `GET /api/assistant/conversations/:id/messages`)
4. Create a new conversation via sidebar
5. Switch between conversations
6. Rename a conversation
7. Delete a conversation

- [ ] **Step 4: Test mini chat persistence**

1. Go to `/dashboard` — expand mini chat — send messages
2. Collapse mini chat — expand again — verify messages persist
3. Navigate away — navigate back — verify messages persist

- [ ] **Step 5: Fix any bugs found**

Address any issues found during testing.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: resolve issues found during integration testing"
```

---

## Summary

This plan implements 6 REST endpoints for chat conversation persistence across 6 tasks:

1. **Prisma Schema** — Add `ConversationType` enum, `Conversation` model, `Message` model
2. **DTOs** — `CreateConversationDto`, `UpdateConversationDto`, `CreateMessageDto`
3. **ConversationService** — Prisma queries with auth checks
4. **Controller** — 6 new endpoints + existing `chat` endpoint
5. **Module** — Register new service
6. **Integration Testing** — Verify frontend-backend sync works

Total: 1 new service, 3 new DTOs, 1 modified controller, 1 modified module, 1 modified Prisma schema.
