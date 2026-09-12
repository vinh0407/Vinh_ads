import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FacebookOAuthSession } from '@prisma/client';
import { createHash, createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtil } from '../common/utils/encryption.util';

interface ManagedPage {
  id: string;
  name: string;
  access_token: string;
  link?: string;
  picture?: { data?: { url?: string } };
  tasks?: string[];
}

type PendingOAuthSession = FacebookOAuthSession & {
  pendingPagesEncrypted: string;
  tokenExpiresAt: Date;
};

@Injectable()
export class FacebookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createOAuthState(userId: string): Promise<string> {
    this.config();
    const state = randomBytes(32).toString('base64url');
    await this.prisma.facebookOAuthSession.create({
      data: {
        userId,
        stateHash: this.hash(state),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    return state;
  }

  getOAuthUrl(state: string): string {
    if (!state || state.length < 32) {
      throw new BadRequestException('Invalid OAuth state');
    }
    const { appId, callbackUrl, apiVersion, configId } = this.config();
    const url = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`);
    const params: Record<string, string> = {
      client_id: appId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      state,
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_ads,ads_management,business_management',
    };
    if (configId) {
      params.config_id = configId;
    }
    url.search = new URLSearchParams(params).toString();
    return url.toString();
  }

  async handleCallback(code: string, state: string) {
    if (!code || typeof code !== 'string') {
      throw new BadRequestException('Facebook authorization code is required');
    }
    if (!state || typeof state !== 'string') {
      throw new BadRequestException('OAuth state is required');
    }
    const session = await this.consumeState(state);
    const token = await this.exchangeCode(code);
    const pages = await this.fetchManagedPages(token.accessToken);
    if (!pages.length) {
      throw new BadRequestException('No manageable Facebook Pages were returned');
    }
    await this.prisma.facebookOAuthSession.update({
      where: { id: session.id },
      data: {
        pendingPagesEncrypted: EncryptionUtil.encrypt(JSON.stringify(pages)),
        tokenExpiresAt: token.expiresAt,
      },
    });
    return {
      sessionId: session.id,
      pages: pages.map(({ access_token: _accessToken, ...page }) => page),
    };
  }

  async getPendingPages(userId: string, sessionId: string) {
    const session = await this.pendingSession(userId, sessionId);
    return this.parseManagedPages(
      EncryptionUtil.decrypt(session.pendingPagesEncrypted),
    ).map(({ access_token: _accessToken, ...page }) => page);
  }

  async selectPage(userId: string, sessionId: string, pageId: string) {
    if (!pageId) {
      throw new BadRequestException('Facebook Page is required');
    }
    const session = await this.pendingSession(userId, sessionId);
    const pages = this.parseManagedPages(
      EncryptionUtil.decrypt(session.pendingPagesEncrypted),
    );
    const selected = pages.find((page) => page.id === pageId);
    if (!selected?.access_token) {
      throw new BadRequestException('Selected Facebook Page is unavailable');
    }

    const page = await this.prisma.facebookPage.upsert({
      where: { userId_pageId: { userId, pageId: selected.id } },
      create: {
        userId,
        pageId: selected.id,
        pageName: selected.name,
        pageUrl: selected.link || `https://facebook.com/${selected.id}`,
        avatarUrl: selected.picture?.data?.url,
        status: 'ACTIVE',
      },
      update: {
        pageName: selected.name,
        pageUrl: selected.link || `https://facebook.com/${selected.id}`,
        avatarUrl: selected.picture?.data?.url,
        status: 'ACTIVE',
        connectedAt: new Date(),
      },
    });

    await this.prisma.facebookPageToken.upsert({
      where: { facebookPageId: page.id },
      create: {
        facebookPageId: page.id,
        accessTokenEncrypted: EncryptionUtil.encrypt(selected.access_token),
        expiresAt: session.tokenExpiresAt,
      },
      update: {
        accessTokenEncrypted: EncryptionUtil.encrypt(selected.access_token),
        expiresAt: session.tokenExpiresAt,
      },
    });

    await this.prisma.facebookOAuthSession.delete({ where: { id: sessionId } });
    return { success: true, page };
  }

  /**
   * Connects a simulated Facebook Page for local development & pipeline testing.
   */
  async connectTestPage(userId: string, pageName = 'Auto Content Hub Test Page') {
    const testPageId = `test_page_${Date.now()}`;
    const page = await this.prisma.facebookPage.upsert({
      where: { userId_pageId: { userId, pageId: testPageId } },
      create: {
        userId,
        pageId: testPageId,
        pageName,
        pageUrl: `https://facebook.com/${testPageId}`,
        avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop',
        status: 'ACTIVE',
      },
      update: {
        pageName,
        status: 'ACTIVE',
        connectedAt: new Date(),
      },
    });

    await this.prisma.facebookPageToken.upsert({
      where: { facebookPageId: page.id },
      create: {
        facebookPageId: page.id,
        accessTokenEncrypted: EncryptionUtil.encrypt(`test_token_${Date.now()}`),
        expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      },
      update: {
        accessTokenEncrypted: EncryptionUtil.encrypt(`test_token_${Date.now()}`),
        expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      },
    });

    return { success: true, page };
  }

  private async consumeState(state: string) {
    const record = await this.prisma.facebookOAuthSession.findUnique({
      where: { stateHash: this.hash(state) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException('OAuth state is invalid or expired');
    }
    const claim = await this.prisma.facebookOAuthSession.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claim.count !== 1) {
      throw new BadRequestException('OAuth state is invalid or already used');
    }
    return record;
  }

  private async exchangeCode(code: string) {
    const { appId, appSecret, callbackUrl, apiVersion } = this.config();
    const short = await this.graph(
      `${apiVersion}/oauth/access_token`,
      {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: callbackUrl,
        code,
      },
      'Facebook token exchange failed',
    );
    if (!this.isRecord(short) || typeof short.access_token !== 'string') {
      throw new BadRequestException(
        'Facebook token exchange returned no access token',
      );
    }
    const long = await this.graph(
      `${apiVersion}/oauth/access_token`,
      {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: short.access_token,
      },
      'Facebook long-lived token exchange failed',
    );
    if (!this.isRecord(long) || typeof long.access_token !== 'string') {
      throw new BadRequestException(
        'Facebook long-lived token exchange returned no access token',
      );
    }
    const expiresIn =
      typeof long.expires_in === 'number' ? long.expires_in : 5184000;
    return {
      accessToken: long.access_token,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  private async fetchManagedPages(token: string): Promise<ManagedPage[]> {
    const { appSecret, apiVersion } = this.config();
    const appsecret_proof = createHmac('sha256', appSecret)
      .update(token)
      .digest('hex');
    const result = await this.graph(
      `${apiVersion}/me/accounts`,
      {
        fields: 'id,name,link,picture,access_token,tasks',
        access_token: token,
        appsecret_proof,
      },
      'Unable to retrieve Facebook Pages',
    );
    if (!this.isRecord(result) || !Array.isArray(result.data)) return [];
    return result.data.filter((page): page is ManagedPage =>
      this.isManagedPage(page),
    );
  }

  private async graph(
    path: string,
    params: Record<string, string>,
    message: string,
  ): Promise<unknown> {
    const url = new URL(`https://graph.facebook.com/${path}`);
    url.search = new URLSearchParams(params).toString();
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch {
      throw new ServiceUnavailableException(message);
    }
    if (!response.ok) throw new BadRequestException(message);
    return response.json();
  }

  private async pendingSession(
    userId: string,
    id: string,
  ): Promise<PendingOAuthSession> {
    const session = await this.prisma.facebookOAuthSession.findUnique({
      where: { id },
    });
    const pendingPagesEncrypted = session?.pendingPagesEncrypted;
    const tokenExpiresAt = session?.tokenExpiresAt;
    if (
      !session ||
      session.userId !== userId ||
      !pendingPagesEncrypted ||
      !tokenExpiresAt ||
      session.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'Facebook connection session is invalid or expired',
      );
    }
    return { ...session, pendingPagesEncrypted, tokenExpiresAt };
  }

  private config() {
    const appId = this.configService.get<string>('app.facebook.appId');
    const appSecret = this.configService.get<string>('app.facebook.appSecret');
    const callbackUrl = this.configService.get<string>(
      'app.facebook.callbackUrl',
    );
    const apiVersion = this.configService.get<string>(
      'app.facebook.apiVersion',
    );
    const configId = this.configService.get<string>(
      'app.facebook.configId',
    );
    if (
      !appId ||
      !appSecret ||
      !callbackUrl ||
      !apiVersion ||
      !/^v\d+\.\d+$/.test(apiVersion)
    ) {
      throw new ServiceUnavailableException('Facebook OAuth is not configured');
    }
    return { appId, appSecret, callbackUrl, apiVersion, configId };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private parseManagedPages(value: string): ManagedPage[] {
    const parsed: unknown = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((page) => this.isManagedPage(page))
    ) {
      throw new BadRequestException(
        'Facebook connection session contains invalid Page data',
      );
    }
    return parsed;
  }

  private isManagedPage(value: unknown): value is ManagedPage {
    return (
      this.isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.access_token === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  getPages(userId: string) {
    return this.prisma.facebookPage.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { connectedAt: 'desc' },
    });
  }

  async disconnectPage(userId: string, pageId: string) {
    const page = await this.prisma.facebookPage.findFirst({
      where: { id: pageId, userId },
    });
    if (!page) throw new NotFoundException('Page not found');
    await this.prisma.facebookPageToken.deleteMany({
      where: { facebookPageId: pageId },
    });
    return this.prisma.facebookPage.update({
      where: { id: pageId },
      data: { status: 'DISCONNECTED' },
    });
  }

  async getPageToken(pageId: string): Promise<string | null> {
    const record = await this.prisma.facebookPageToken.findUnique({
      where: { facebookPageId: pageId },
    });
    if (!record || record.expiresAt <= new Date()) return null;
    return EncryptionUtil.decrypt(record.accessTokenEncrypted);
  }
}
