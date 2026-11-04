import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsNormalizedEmail } from '../../../common/validation/decorators';

export class LoginDto {
  /** @example reader@oku24.kg */
  @IsNormalizedEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}
