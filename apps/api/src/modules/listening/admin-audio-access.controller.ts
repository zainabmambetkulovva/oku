import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AudioAccessService } from './audio-access.service';
import { GrantAccessDto } from './dto/listening.dto';

/** Управление доступом к аудиокниге (ТЗ 13.3). */
@ApiTags('admin / audiobooks')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/audiobooks/:id/access')
export class AdminAudioAccessController {
  constructor(private readonly access: AudioAccessService) {}

  @Get()
  list(@Param('id', ParseUUIDPipe) id: string) {
    return this.access.listGrants(id);
  }

  /** Выдать доступ пользователю (бессрочно или до expiresAt). */
  @Post()
  grant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantAccessDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.access.grantByAdmin(id, dto.email, dto.expiresAt, { id: user.id, ip });
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.access.revokeByAdmin(id, userId, { id: user.id, ip });
  }
}
