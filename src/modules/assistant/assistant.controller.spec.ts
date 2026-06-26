import { Test, TestingModule } from '@nestjs/testing';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const mockAssistantService = {
  chat: jest.fn(),
  executeActions: jest.fn(),
};

const mockConversationService = {
  findAll: jest.fn(),
  findWithMessages: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addMessage: jest.fn(),
};

describe('AssistantController', () => {
  let controller: AssistantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        {
          provide: AssistantService,
          useValue: mockAssistantService,
        },
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AssistantController>(AssistantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
