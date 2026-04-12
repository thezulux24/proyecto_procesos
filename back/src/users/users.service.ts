import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;
type PublicUser = Omit<UserWithRole, 'passwordHash' | 'roleId' | 'role'> & { role: string };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicUser(user: UserWithRole): PublicUser {
    const { passwordHash: _, roleId: __, role, ...rest } = user;
    return {
      ...rest,
      role: role?.nombre ?? 'SIN_ROL',
    };
  }

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const role = await this.prisma.role.findFirst({
      where: { nombre: createUserDto.role, active: true },
    });

    if (!role) {
      throw new NotFoundException(`Role ${createUserDto.role} not found or inactive`);
    }

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        fullName: createUserDto.fullName,
        passwordHash,
        roleId: role.id,
        active: true,
      },
      include: { role: true },
    });

    return this.toPublicUser(user);
  }

  async findAll(includeInactive = false): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { createdAt: 'desc' },
      include: { role: true },
    });

    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: number): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user || !user.active) {
      return null;
    }

    return this.toPublicUser(user);
  }

  async findByEmail(email: string): Promise<UserWithRole | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    return user && user.active && user.role && user.role.active ? user : null;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user || !user.active) {
      throw new NotFoundException('User not found');
    }

    // If email is being updated, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const data: Prisma.UserUpdateInput = {
      email: updateUserDto.email,
      fullName: updateUserDto.fullName,
      active: updateUserDto.active,
    };

    if (updateUserDto.role) {
      const role = await this.prisma.role.findFirst({
        where: { nombre: updateUserDto.role, active: true },
      });

      if (!role) {
        throw new NotFoundException(`Role ${updateUserDto.role} not found or inactive`);
      }

      data.role = { connect: { id: role.id } };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });

    return this.toPublicUser(updatedUser);
  }

  async softDelete(id: number): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: { active: false },
      include: { role: true },
    });

    return this.toPublicUser(deletedUser);
  }
}
