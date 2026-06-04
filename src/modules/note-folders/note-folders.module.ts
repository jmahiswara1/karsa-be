import { Module } from '@nestjs/common';
import { NoteFoldersService } from './note-folders.service';
import { NoteFoldersController } from './note-folders.controller';

@Module({
  controllers: [NoteFoldersController],
  providers: [NoteFoldersService],
})
export class NoteFoldersModule {}
