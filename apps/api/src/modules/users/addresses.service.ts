import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Address, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

export const MAX_ADDRESSES_PER_USER = 20;

/**
 * Адреса пользователя. Правило «не больше одного адреса по умолчанию»
 * обеспечивается здесь, в транзакциях.
 */
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      if (count >= MAX_ADDRESSES_PER_USER) {
        throw new BadRequestException(`No more than ${MAX_ADDRESSES_PER_USER} addresses allowed`);
      }

      const isDefault = count === 0 || dto.isDefault === true;
      if (isDefault) {
        await this.clearDefault(tx, userId);
      }
      return tx.address.create({ data: { ...dto, userId, isDefault } });
    });
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      const address = await this.findOwned(tx, userId, addressId);

      if (dto.isDefault === false && address.isDefault) {
        throw new BadRequestException(
          'Choose another default address instead of unsetting the current one',
        );
      }
      if (dto.isDefault === true && !address.isDefault) {
        await this.clearDefault(tx, userId);
      }
      return tx.address.update({ where: { id: address.id }, data: dto });
    });
  }

  async remove(userId: string, addressId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const address = await this.findOwned(tx, userId, addressId);
      await tx.address.delete({ where: { id: address.id } });

      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });
  }

  /** Чужой адрес выглядит так же, как несуществующий — 404. */
  private async findOwned(
    tx: Prisma.TransactionClient,
    userId: string,
    addressId: string,
  ): Promise<Address> {
    const address = await tx.address.findFirst({ where: { id: addressId, userId } });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  private clearDefault(tx: Prisma.TransactionClient, userId: string) {
    return tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
