import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { PaginationQueryDto } from '../../common/pagination/pagination';
import { ListeningService } from './listening.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class MyLibraryController {
  constructor(private readonly listening: ListeningService) {}

  /** Купленные аудиокниги с прогрессом прослушивания. */
  @Get('audiobooks')
  audiobooks(@AuthUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.listening.myAudiobooks(user, query);
  }

  /** История прослушивания: сначала последние («Продолжить прослушивание»). */
  @Get('listening')
  history(@AuthUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.listening.history(user, query);
  }
}
