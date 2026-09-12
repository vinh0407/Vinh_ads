import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserStatus } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';

export type AuthenticatedUser = Omit<User, 'passwordHash'>;

export interface AuthSession {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        name: registerDto.name,
      },
    });

    await this.prisma.userSettings.create({
      data: { userId: user.id },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account is suspended or deleted',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account is suspended or deleted',
      });
    }

    const rotation = await this.prisma.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
    if (rotation.count !== 1) throw this.invalidRefreshToken();

    const tokens = await this.generateTokens(storedToken.user);

    return {
      user: this.sanitizeUser(storedToken.user),
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: this.hashRefreshToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async logoutByRefreshToken(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }
    return user;
  }

  private async generateTokens(
    user: User,
  ): Promise<Pick<AuthSession, 'accessToken' | 'refreshToken'>> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('app.jwt.refreshTokenExpiry'),
      },
    );

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const decoded: unknown = this.jwtService.decode(refreshToken);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('exp' in decoded) ||
      typeof decoded.exp !== 'number'
    ) {
      throw new Error('Generated refresh token is missing an expiration');
    }
    const expiresAt = new Date(decoded.exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): AuthenticatedUser {
    const { passwordHash: _passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async validateRefreshToken(refreshToken: string, expectedUserId?: string) {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (
      !storedToken ||
      (expectedUserId && storedToken.userId !== expectedUserId)
    ) {
      throw this.invalidRefreshToken();
    }
    return storedToken.user;
  }

  private hashRefreshToken(refreshToken: string): string {
    const secret = this.configService.get<string>('app.jwt.refreshSecret');
    if (!secret) throw new Error('JWT refresh secret is not configured');
    return createHmac('sha256', secret).update(refreshToken).digest('hex');
  }

  private invalidRefreshToken() {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token',
    });
  }
}
