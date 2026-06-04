import { Test, TestingModule } from '@nestjs/testing';
import { NoteFoldersController } from './note-folders.controller';

describe('NoteFoldersController', () => {
  let controller: NoteFoldersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NoteFoldersController],
    }).compile();

    controller = module.get<NoteFoldersController>(NoteFoldersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
