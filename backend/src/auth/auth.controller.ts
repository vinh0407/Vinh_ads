import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService, AuthSession } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.establishSession(
      await this.authService.register(registerDto),
      response,
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.establishSession(
      await this.authService.login(loginDto),
      response,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = this.readCookie(request, 'refresh_token');
    if (!token)
      throw new UnauthorizedException('Refresh token cookie is missing');
    return this.establishSession(
      await this.authService.refresh(token),
      response,
    );
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = this.readCookie(request, 'refresh_token');
    if (token) await this.authService.logoutByRefreshToken(token);
    this.clearSession(response);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: User) {
    const { passwordHash: _passwordHash, ...sanitized } = user;
    return sanitized;
  }

  private establishSession(result: AuthSession, response: Response) {
    const secure = this.configService.get<string>('app.env') === 'production';
    response.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60_000,
    });
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60_000,
    });
    return { user: result.user };
  }

  private clearSession(response: Response) {
    const secure = this.configService.get<string>('app.env') === 'production';
    response.clearCookie('access_token', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
  }

  private readCookie(request: Request, name: string) {
    const item = request.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name}=`));
    if (!item) return undefined;
    try {
      return decodeURIComponent(item.slice(name.length + 1));
    } catch {
      return undefined;
    }
  }
}
