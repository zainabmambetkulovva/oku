import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validation/decorators';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
