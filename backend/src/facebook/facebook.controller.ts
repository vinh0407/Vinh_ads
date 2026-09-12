import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { FacebookService } from './facebook.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ConnectPageDto } from './dto/connect-page.dto';

@Controller('facebook')
@UseGuards(JwtAuthGuard)
export class FacebookController {
  constructor(
    private readonly facebookService: FacebookService,
    private readonly configService: ConfigService,
  ) {}

  @Get('connect')
  async getConnectUrl(@CurrentUser('id') userId: string) {
    const state = await this.facebookService.createOAuthState(userId);
    const url = this.facebookService.getOAuthUrl(state);
    return { url, state };
  }

  @Get('pending/:sessionId')
  async getPendingPages(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.facebookService.getPendingPages(userId, sessionId);
  }

  @Post('select')
  async selectPage(
    @CurrentUser('id') userId: string,
    @Body() dto: ConnectPageDto,
  ) {
    return this.facebookService.selectPage(userId, dto.sessionId, dto.pageId);
  }

  @Post('connect-test')
  async connectTestPage(
    @CurrentUser('id') userId: string,
    @Body() body: { pageName?: string },
  ) {
    return this.facebookService.connectTestPage(userId, body?.pageName);
  }

  @Get('callback')
  @Public()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() response: Response,
  ) {
    const frontend = this.configService.get<string>('app.frontendUrl');
    if (error) {
      return response.redirect(
        `${frontend}/dashboard/facebook?oauthError=${encodeURIComponent(error)}`,
      );
    }
    const result = await this.facebookService.handleCallback(code, state);
    return response.redirect(
      `${frontend}/dashboard/facebook?oauthSession=${encodeURIComponent(result.sessionId)}`,
    );
  }

  @Get('pages')
  async getPages(@CurrentUser('id') userId: string) {
    return this.facebookService.getPages(userId);
  }

  @Delete('pages/:id')
  async disconnectPage(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
  ) {
    return this.facebookService.disconnectPage(userId, pageId);
  }

  @Get('webhook')
  @Public()
  verifyWebhook(@Query() query: any, @Res() res: Response) {
    const mode = query['hub.mode'] || query.mode;
    const token = query['hub.verify_token'] || query.verify_token;
    const challenge = query['hub.challenge'] || query.challenge;

    const VERIFY_TOKEN = 'accontent_hub_ai_verify_token_2026';

    res.setHeader('Content-Type', 'text/plain');
    if (challenge) {
      return res.status(200).send(String(challenge));
    }
    return res.status(200).send('OK');
  }

  @Post('webhook')
  @Public()
  handleWebhook(@Body() body: any, @Res() res: Response) {
    console.log('Received Facebook Webhook Event:', JSON.stringify(body));
    return res.status(200).send('EVENT_RECEIVED');
  }
}
