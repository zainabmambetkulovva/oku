import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AddFavoriteDto, FavoritesQueryDto } from './dto/favorites.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('users/me/favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@AuthUser() user: AuthenticatedUser, @Query() query: FavoritesQueryDto) {
    return this.favorites.list(user.id, query);
  }

  /** id избранных книг и аудиокниг — для отметок в каталоге. */
  @Get('ids')
  ids(@AuthUser() user: AuthenticatedUser) {
    return this.favorites.ids(user.id);
  }

  /** Добавить книгу или аудиокнигу. Повторное добавление ничего не дублирует. */
  @Post()
  add(@AuthUser() user: AuthenticatedUser, @Body() dto: AddFavoriteDto) {
    return this.favorites.add(user.id, dto);
  }

  @Delete('books/:bookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBook(@AuthUser() user: AuthenticatedUser, @Param('bookId', ParseUUIDPipe) bookId: string) {
    return this.favorites.removeBook(user.id, bookId);
  }

  @Delete('audiobooks/:audiobookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAudiobook(
    @AuthUser() user: AuthenticatedUser,
    @Param('audiobookId', ParseUUIDPipe) audiobookId: string,
  ) {
    return this.favorites.removeAudiobook(user.id, audiobookId);
  }
}
