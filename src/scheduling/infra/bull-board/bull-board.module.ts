import { Module } from '@nestjs/common';
import { BullBoardService } from './bull-board.service.js';

@Module({
  providers: [BullBoardService],
  exports: [BullBoardService],
})
export class BullBoardModule {}
