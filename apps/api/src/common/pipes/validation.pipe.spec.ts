import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { createValidationPipe } from './validation.pipe';

class AddressDto {
  @IsString()
  city: string;
}

class SampleDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const validate = (value: unknown, type: 'body' | 'query' = 'body') =>
    pipe.transform(value, { type, metatype: SampleDto });

  const errorOf = async (value: unknown) => {
    try {
      await validate(value);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      return (error as BadRequestException).getResponse();
    }
    throw new Error('expected validation to fail');
  };

  it('passes valid input and converts types', async () => {
    const result = await validate({ email: 'reader@oku24.kg', page: '2' }, 'query');
    expect(result).toBeInstanceOf(SampleDto);
    expect(result).toMatchObject({ email: 'reader@oku24.kg', page: 2 });
  });

  it('returns field-level details', async () => {
    await expect(errorOf({ email: 'not-an-email', page: 0 })).resolves.toEqual({
      message: 'Validation failed',
      details: [
        { field: 'email', errors: ['email must be an email'] },
        { field: 'page', errors: ['page must not be less than 1'] },
      ],
    });
  });

  it('rejects fields not described in the DTO', async () => {
    await expect(errorOf({ email: 'reader@oku24.kg', role: 'ADMIN' })).resolves.toEqual({
      message: 'Validation failed',
      details: [{ field: 'role', errors: ['property role should not exist'] }],
    });
  });

  it('does not silently convert types in the body', async () => {
    await expect(errorOf({ email: 'reader@oku24.kg', note: 5 })).resolves.toEqual({
      message: 'Validation failed',
      details: [{ field: 'note', errors: ['note must be a string'] }],
    });
  });

  it('reports nested field paths', async () => {
    await expect(errorOf({ email: 'reader@oku24.kg', address: { city: 5 } })).resolves.toEqual({
      message: 'Validation failed',
      details: [{ field: 'address.city', errors: ['city must be a string'] }],
    });
  });
});
