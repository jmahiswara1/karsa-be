import { Test, TestingModule } from '@nestjs/testing';
import { TaskColumnsController } from './task-columns.controller';
import { TaskColumnsService } from './task-columns.service';
import { PrismaService } from '../../database/prisma.service';

describe('TaskColumnsController', () => {
  let controller: TaskColumnsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskColumnsController],
      providers: [
        TaskColumnsService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TaskColumnsController>(TaskColumnsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
