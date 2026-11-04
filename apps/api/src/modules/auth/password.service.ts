import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { BCRYPT_ROUNDS } from './auth.constants';

@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password, BCRYPT_ROUNDS);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }

  /**
   * Сравнение с фиктивным хешем, когда пользователя нет. Время ответа для
   * существующего и несуществующего e-mail одинаковое — по нему нельзя узнать,
   * зарегистрирован ли адрес.
   */
  async verifyAgainstDummy(password: string): Promise<false> {
    this.dummyHash ??= hash('timing-safe-dummy-password', BCRYPT_ROUNDS);
    await compare(password, await this.dummyHash);
    return false;
  }
}
