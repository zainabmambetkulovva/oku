import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser, OptionalAuthUser } from '../../common/decorators/auth-user.decorator';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { AudioAccessService } from './audio-access.service';
import { SaveProgressDto } from './dto/listening.dto';
import { ListeningService } from './listening.service';

@ApiTags('audiobooks / listening')
@Controller('audiobooks/:slug')
export class ListeningController {
  constructor(
    private readonly access: AudioAccessService,
    private readonly listening: ListeningService,
  ) {}

  /**
   * Доступ текущего пользователя к аудиокниге и список глав, которые можно слушать.
   * Гостю доступны только бесплатные главы.
   */
  @OptionalAuth()
  @ApiBearerAuth()
  @Get('access')
  async accessInfo(@Param('slug') slug: string, @OptionalAuthUser() user?: AuthenticatedUser) {
    const audiobook = await this.access.findAudiobook(slug, user);
    return this.access.accessInfo(audiobook, user);
  }

  /**
   * Временная ссылка на аудиофайл главы. Бесплатные главы — всем;
   * остальные — при полном доступе (401 — нужно войти, 403 — нужно купить).
   */
  @OptionalAuth()
  @ApiBearerAuth()
  @Get('chapters/:chapterId/stream')
  stream(
    @Param('slug') slug: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @OptionalAuthUser() user?: AuthenticatedUser,
  ) {
    return this.access.streamUrl(slug, chapterId, user);
  }

  /** Последняя позиция прослушивания; null — ещё не слушали. */
  @ApiBearerAuth()
  @Get('progress')
  getProgress(@Param('slug') slug: string, @AuthUser() user: AuthenticatedUser) {
    return this.listening.getProgress(slug, user);
  }

  /** Сохранение позиции. Плеер вызывает периодически и при паузе. */
  @ApiBearerAuth()
  @Put('progress')
  saveProgress(
    @Param('slug') slug: string,
    @AuthUser() user: AuthenticatedUser,
    @Body() dto: SaveProgressDto,
  ) {
    return this.listening.saveProgress(slug, user, dto);
  }
}
