import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { JwtPayload, LoginDto, LoginResponse } from '@webgpt/shared';
import { hashContent } from '@webgpt/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validate user credentials and return login response
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { workspace: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action: 'USER_LOGIN',
        targetType: 'User',
        targetId: user.id,
        meta: { ip: 'unknown' },
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      role: user.role as UserRole,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        workspaceId: user.workspaceId,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  /**
   * Validate API key and return the workspace context
   */
  async validateApiKey(
    key: string,
  ): Promise<{ workspaceId: string; scopes: string[]; keyId: string } | null> {
    const hashedKey = hashContent(key);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { hashedKey },
    });

    if (!apiKey || apiKey.revokedAt) {
      return null;
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      workspaceId: apiKey.workspaceId,
      scopes: apiKey.scopes,
      keyId: apiKey.id,
    };
  }

  /**
   * Validate JWT token and return user
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
  }

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}



