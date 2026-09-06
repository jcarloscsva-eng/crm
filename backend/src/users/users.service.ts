import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.withTenant(tenantId, (tx) =>
        tx.user.create({
          data: {
            tenantId,
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            role: dto.role,
          },
        }),
      );
      return this.toSafeUser(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese email en este negocio');
      }
      throw err;
    }
  }

  async findAll(tenantId: string) {
    const users = await this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findMany({ orderBy: { createdAt: 'asc' } }),
    );
    return users.map((u) => this.toSafeUser(u));
  }

  private toSafeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
