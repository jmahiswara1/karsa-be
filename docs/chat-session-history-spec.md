# Backend Chat Session History Spec

## Overview

Menambahkan conversation persistence untuk AI assistant. Frontend sudah menyimpan chat history secara optimistically di localStorage dan perlu sinkronisasi ke backend.

## Requirements

### Functional Requirements

1. **Multi-conversation support**: User bisa punya multiple chat conversations terpisah
2. **Conversation types**: Dua jenis conversation
   - `assistant`: Full chat di `/assistant` page (dengan conversation list)
   - `mini`: Mini chat di `/dashboard` (single conversation)
3. **Message persistence**: Semua user dan assistant messages disimpan di database
4. **Optimistic sync**: Frontend simpan di localStorage dulu, lalu sync ke backend
5. **Backend is source of truth**: Jika ada conflict, backend wins

### Non-Functional Requirements

- Harus backward compatible dengan existing `POST /api/assistant/chat`
- Response format mengikuti global interceptor: `{ success, message, data }`
- Semua endpoint protected dengan JWT auth
- Follow existing patterns di codebase (NestJS modules, Prisma, class-validator)

## Database Schema

### New Models

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

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([userId, type, updatedAt(sort: Desc)])
}

model Message {
  id               String   @id @default(uuid())
  role             String   // "user" or "assistant"
  content          String
  isStructured     Boolean  @default(false)
  conversationId   String
  orderIndex       Int
  createdAt        DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, orderIndex])
}
```

### Schema Changes

Tambahkan relasi ke `User` model:

```prisma
model User {
  // ... existing fields ...
  conversations Conversation[]
}
```

## API Endpoints

### 1. List Conversations

```http
GET /api/assistant/conversations?type=assistant|mini
```

**Query Parameters:**
- `type` (optional): Filter by conversation type

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "title": "Chat Title",
      "type": "ASSISTANT",
      "userId": "user-uuid",
      "createdAt": "2026-06-17T10:00:00Z",
      "updatedAt": "2026-06-17T10:30:00Z"
    }
  ]
}
```

**Implementation Notes:**
- Return semua conversations milik user (dari JWT)
- Sort by `updatedAt DESC`
- Optional filter by `type` query param

### 2. Get Conversation Messages

```http
GET /api/assistant/conversations/:id/messages
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "conversation": {
      "id": "uuid",
      "title": "Chat Title",
      "type": "ASSISTANT",
      "userId": "user-uuid",
      "createdAt": "2026-06-17T10:00:00Z",
      "updatedAt": "2026-06-17T10:30:00Z"
    },
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "Hello",
        "isStructured": false,
        "conversationId": "conv-uuid",
        "orderIndex": 0,
        "createdAt": "2026-06-17T10:00:00Z"
      }
    ]
  }
}
```

**Implementation Notes:**
- Verify conversation belongs to user
- Return conversation metadata + all messages
- Messages sorted by `orderIndex ASC`

### 3. Create Conversation

```http
POST /api/assistant/conversations
Content-Type: application/json

{
  "type": "ASSISTANT"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "title": "New Chat",
    "type": "ASSISTANT",
    "userId": "user-uuid",
    "createdAt": "2026-06-17T10:00:00Z",
    "updatedAt": "2026-06-17T10:00:00Z"
  }
}
```

**Implementation Notes:**
- Auto-set `userId` from JWT
- Default title: "New Chat"
- Validate `type` is one of `ASSISTANT` or `MINI`

### 4. Update Conversation

```http
PATCH /api/assistant/conversations/:id
Content-Type: application/json

{
  "title": "New Title"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "title": "New Title",
    "type": "ASSISTANT",
    "userId": "user-uuid",
    "createdAt": "2026-06-17T10:00:00Z",
    "updatedAt": "2026-06-17T10:05:00Z"
  }
}
```

**Implementation Notes:**
- Verify conversation belongs to user
- Only `title` can be updated
- Auto-update `updatedAt`

### 5. Delete Conversation

```http
DELETE /api/assistant/conversations/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": null
}
```

**Implementation Notes:**
- Verify conversation belongs to user
- Cascade delete semua messages (Prisma `onDelete: Cascade`)

### 6. Add Message to Conversation

```http
POST /api/assistant/conversations/:id/messages
Content-Type: application/json

{
  "role": "user",
  "content": "Hello, how are you?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid",
    "role": "user",
    "content": "Hello, how are you?",
    "isStructured": false,
    "conversationId": "conv-uuid",
    "orderIndex": 5,
    "createdAt": "2026-06-17T10:00:00Z"
  }
}
```

**Implementation Notes:**
- Verify conversation belongs to user
- Auto-calculate `orderIndex` (max existing + 1, or 0 if first message)
- Auto-update conversation `updatedAt`
- Validate `role` is "user" or "assistant"
- Optional `isStructured` field (default false)

## DTOs

### CreateConversationDto

```typescript
import { IsEnum } from 'class-validator';

export enum ConversationTypeEnum {
  ASSISTANT = 'ASSISTANT',
  MINI = 'MINI',
}

export class CreateConversationDto {
  @IsEnum(ConversationTypeEnum)
  type: ConversationTypeEnum;
}
```

### UpdateConversationDto

```typescript
import { IsString, IsOptional } from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;
}
```

### CreateMessageDto

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

## File Structure

```
src/modules/assistant/
├── assistant.module.ts (update - add new services)
├── assistant.controller.ts (update - add new endpoints)
├── assistant.service.ts (update - add new methods)
├── conversation.service.ts (new)
└── dto/
    ├── create-conversation.dto.ts (new)
    ├── update-conversation.dto.ts (new)
    └── create-message.dto.ts (new)
```

## Error Handling

### 404 Not Found
- Conversation tidak ditemukan
- Conversation tidak milik user (treat as not found untuk security)

### 400 Bad Request
- Invalid `type` value
- Missing required fields
- Invalid `role` value

### 500 Internal Server Error
- Database errors
- Prisma errors

## Testing Strategy

### Unit Tests

1. **ConversationService**
   - `findAll()`: Return semua conversations milik user
   - `findAll()` with type filter: Return filtered conversations
   - `findOne()`: Return conversation + messages
   - `findOne()` unauthorized: Throw 404
   - `create()`: Create new conversation
   - `update()`: Update title
   - `update()` unauthorized: Throw 404
   - `remove()`: Delete conversation + cascade messages
   - `remove()` unauthorized: Throw 404

2. **AssistantService (extended)**
   - `addMessage()`: Add message to conversation
   - `addMessage()` auto-order: Calculate correct orderIndex
   - `addMessage()` unauthorized: Throw 404
   - `addMessage()` updates conversation: Verify updatedAt changes

### Integration Tests

```typescript
describe('Conversation API Integration', () => {
  it('should create, list, update, and delete conversations', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/assistant/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'ASSISTANT' });
    
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.type).toBe('ASSISTANT');
    
    const convId = createRes.body.data.id;
    
    // List
    const listRes = await request(app)
      .get('/api/assistant/conversations')
      .set('Authorization', `Bearer ${token}`);
    
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    
    // Update
    const updateRes = await request(app)
      .patch(`/api/assistant/conversations/${convId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });
    
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Updated Title');
    
    // Delete
    const deleteRes = await request(app)
      .delete(`/api/assistant/conversations/${convId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(deleteRes.status).toBe(200);
    
    // Verify deleted
    const listRes2 = await request(app)
      .get('/api/assistant/conversations')
      .set('Authorization', `Bearer ${token}`);
    
    expect(listRes2.body.data).toHaveLength(0);
  });
  
  it('should add messages to conversation', async () => {
    // Create conversation
    const convRes = await request(app)
      .post('/api/assistant/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'MINI' });
    
    const convId = convRes.body.data.id;
    
    // Add messages
    const msg1Res = await request(app)
      .post(`/api/assistant/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'user', content: 'Hello' });
    
    expect(msg1Res.body.data.orderIndex).toBe(0);
    
    const msg2Res = await request(app)
      .post(`/api/assistant/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'assistant', content: 'Hi there!' });
    
    expect(msg2Res.body.data.orderIndex).toBe(1);
    
    // Get messages
    const getRes = await request(app)
      .get(`/api/assistant/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(getRes.body.data.messages).toHaveLength(2);
    expect(getRes.body.data.messages[0].role).toBe('user');
    expect(getRes.body.data.messages[1].role).toBe('assistant');
  });
});
```

## Migration Strategy

### Step 1: Update Prisma Schema

Tambahkan models ke `prisma/schema.prisma`

### Step 2: Generate Migration

```bash
npx prisma migrate dev --name add_conversation_history
```

### Step 3: Deploy Migration

```bash
npx prisma migrate deploy
```

## Security Considerations

1. **Authorization**: Semua endpoints protected dengan `@UseGuards(JwtAuthGuard)`
2. **User Isolation**: Setiap user hanya bisa akses conversations miliknya sendiri
3. **Input Validation**: Gunakan `class-validator` untuk semua DTOs
4. **Cascade Delete**: Hapus conversation otomatis hapus semua messages
5. **SQL Injection**: Prisma ORM handles parameterized queries

## Performance Considerations

1. **Indexes**:
   - `Conversation`: `userId`, `type`, `updatedAt` (untuk list query)
   - `Message`: `conversationId`, `orderIndex` (untuk get messages)

2. **Pagination**: (Future enhancement)
   - List conversations bisa di-paginate jika user punya banyak conversations
   - Get messages bisa di-paginate jika conversation sangat panjang

3. **Soft Delete**: (Future enhancement)
   - Pertimbangkan soft delete untuk conversations jika perlu undo

## Backward Compatibility

- Existing `POST /api/assistant/chat` tetap tidak berubah
- Frontend bisa tetap pakai endpoint lama tanpa conversation persistence
- New endpoints adalah tambahan, bukan replacement

## Future Enhancements

1. **Pagination**: Untuk list conversations dan messages
2. **Search**: Search dalam conversation history
3. **Soft Delete**: Undo delete conversation
4. **Conversation Branching**: Fork conversation dari specific message
5. **Streaming Responses**: WebSocket/SSE untuk real-time AI responses
6. **Message Reactions**: User bisa react ke assistant messages
7. **Pinned Conversations**: Pin important conversations ke top
