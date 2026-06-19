import { Test, TestingModule } from '@nestjs/testing';
import { TaskColumnsService } from './task-columns.service';
import { PrismaService } from '../../database/prisma.service';

describe('TaskColumnsService', () => {
  let service: TaskColumnsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskColumnsService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TaskColumnsService>(TaskColumnsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
