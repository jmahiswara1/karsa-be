import { Test, TestingModule } from '@nestjs/testing';
import { NoteFoldersService } from './note-folders.service';
import { PrismaService } from '../../database/prisma.service';

describe('NoteFoldersService', () => {
  let service: NoteFoldersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteFoldersService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<NoteFoldersService>(NoteFoldersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
