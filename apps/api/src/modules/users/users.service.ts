import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User, UserRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.prisma.user.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ passwordHash, ...user }) => user);
  }

  async findById(id: string, workspaceId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, workspaceId },
    });

    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async findByIdOrThrow(id: string, workspaceId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.findById(id, workspaceId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(
    workspaceId: string,
    data: {
      email: string;
      name: string;
      password: string;
      role?: UserRole;
    },
  ): Promise<Omit<User, 'passwordHash'>> {
    // Check for existing user with same email
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        workspaceId,
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        role: data.role || UserRole.MEMBER,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async update(
    id: string,
    workspaceId: string,
    data: {
      name?: string;
      role?: UserRole;
      password?: string;
    },
    currentUser: User,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findFirst({
      where: { id, workspaceId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent changing owner role unless you are the owner
    if (user.role === UserRole.OWNER && data.role && data.role !== UserRole.OWNER) {
      if (currentUser.role !== UserRole.OWNER) {
        throw new ForbiddenException('Cannot change owner role');
      }
    }

    // Prevent non-owners from promoting to owner
    if (data.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can promote to owner role');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  async delete(id: string, workspaceId: string, currentUser: User): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, workspaceId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot delete yourself
    if (user.id === currentUser.id) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    // Cannot delete owner unless you are owner
    if (user.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Cannot delete workspace owner');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }
}



