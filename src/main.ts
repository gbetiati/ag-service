import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { createBullBoardBasicAuthMiddleware } from './scheduling/infra/bull-board/bull-board-basic-auth.middleware.js';
import { BullBoardService } from './scheduling/infra/bull-board/bull-board.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const bullBoard = app.get(BullBoardService);
  if (bullBoard.isEnabled()) {
    const username = process.env.BULL_BOARD_USER;
    const password = process.env.BULL_BOARD_PASSWORD;
    if (!username || !password) {
      throw new Error('BULL_BOARD_USER and BULL_BOARD_PASSWORD are required when BULL_BOARD_ENABLED=true.');
    }

    app.use(
      bullBoard.basePath,
      createBullBoardBasicAuthMiddleware(username, password),
      bullBoard.getServerAdapter().getRouter(),
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
