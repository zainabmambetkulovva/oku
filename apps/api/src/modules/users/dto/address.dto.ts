import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsPhone, Trim } from '../../../common/validation/decorators';

export class CreateAddressDto {
  /** Название адреса, например «Дом» или «Работа» */
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  recipientName: string;

  @IsPhone()
  phone: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  building: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  apartment?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  comment?: string;

  /** Сделать адресом по умолчанию. Первый адрес становится им автоматически */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
