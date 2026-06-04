import { Test, TestingModule } from '@nestjs/testing';
import { NoteFoldersService } from './note-folders.service';

describe('NoteFoldersService', () => {
  let service: NoteFoldersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NoteFoldersService],
    }).compile();

    service = module.get<NoteFoldersService>(NoteFoldersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
