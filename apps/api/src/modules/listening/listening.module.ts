import { Module } from '@nestjs/common';
import { AdminAudioAccessController } from './admin-audio-access.controller';
import { AudioAccessService } from './audio-access.service';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
import { MyLibraryController } from './my-library.controller';

@Module({
  controllers: [ListeningController, MyLibraryController, AdminAudioAccessController],
  providers: [AudioAccessService, ListeningService],
  exports: [AudioAccessService],
})
export class ListeningModule {}
