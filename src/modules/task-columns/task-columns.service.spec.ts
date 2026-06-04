import { Test, TestingModule } from '@nestjs/testing';
import { TaskColumnsService } from './task-columns.service';

describe('TaskColumnsService', () => {
  let service: TaskColumnsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskColumnsService],
    }).compile();

    service = module.get<TaskColumnsService>(TaskColumnsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
