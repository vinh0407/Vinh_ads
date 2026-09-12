import { chromium, firefox, webkit, Browser, BrowserContext, Page, BrowserType } from 'playwright';
import { EventEmitter } from 'eventemitter3';
import { ID, Timestamp, BrowserType as SharedBrowserType, BrowserProfile, Viewport, Cookie, Permission, ProxyConfig, BrowserAction, BrowserResult, BrowserLog, PerformanceMetrics, Result, ok, err, VinceError, ValidationError } from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export interface BrowserLaunchOptions {
  type?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  devtools?: boolean;
  args?: string[];
  channel?: 'chrome' | 'chrome-beta' | 'chrome-dev' | 'chrome-canary' | 'msedge' | 'msedge-beta' | 'msedge-dev' | 'msedge-canary';
  executablePath?: string;
  proxy?: ProxyConfig;
  viewport?: Viewport;
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  geolocation?: { latitude: number; longitude: number };
  permissions?: Permission[];
  extraHTTPHeaders?: Record<string, string>;
  offline?: boolean;
  httpCredentials?: { username: string; password: string };
  ignoreHTTPSErrors?: boolean;
  bypassCSP?: boolean;
  javaScriptEnabled?: boolean;
  acceptDownloads?: boolean;
  colorScheme?: 'light' | 'dark' | 'no-preference';
  reducedMotion?: 'reduce' | 'no-preference';
  forcedColors?: 'active' | 'none';
  recordVideo?: { dir: string; size?: { width: number; height: number } };
  recordHar?: { path: string; omitContent?: boolean };
  tracesDir?: string;
}

export interface PageNavigationOptions {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  referer?: string;
}

export interface ScreenshotOptions {
  path?: string;
  type?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  omitBackground?: boolean;
  animations?: 'disabled' | 'allow';
  caret?: 'hide' | 'initial';
  scale?: 'css' | 'device';
  mask?: any[];
  maskColor?: string;
}

export interface PDFOptions {
  path?: string;
  scale?: number;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  landscape?: boolean;
  pageRanges?: string;
  format?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';
  width?: string | number;
  height?: string | number;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  preferCSSPageSize?: boolean;
  taggedPDF?: boolean;
}

// ============================================
// Browser Manager
// ============================================

export class BrowserManager extends EventEmitter<{
  browser_launched: [browserId: ID; type: string];
  browser_closed: [browserId: ID];
  context_created: [contextId: ID; browserId: ID];
  context_closed: [contextId: ID];
  page_created: [pageId: ID; contextId: ID];
  page_closed: [pageId: ID];
  error: [error: Error];
}> {
  private browsers: Map<ID, BrowserInstance> = new Map();
  private defaultOptions: BrowserLaunchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };

  async launch(options: BrowserLaunchOptions = {}): Promise<BrowserInstance> {
    const browserType = this.getBrowserType(options.type || 'chromium');
    const launchOptions = { ...this.defaultOptions, ...options };
    
    const browser = await browserType.launch(launchOptions);
    const instance = new BrowserInstance(browser, uuidv4() as any, launchOptions);
    
    this.browsers.set(instance.id, instance);
    this.emit('browser_launched', instance.id, options.type || 'chromium');
    
    logger.info({ browserId: instance.id, type: options.type }, 'Browser launched');
    return instance;
  }

  async launchWithProfile(profile: any): Promise<BrowserInstance> {
    // Launch with specific profile
    const options: BrowserLaunchOptions = {
      headless: false,
      args: ['--user-data-dir=' + profile.userDataDir],
    };
    return this.launch(options);
  }

  getBrowser(id: ID): BrowserInstance | undefined {
    return this.browsers.get(id);
  }

  getAllBrowsers(): BrowserInstance[] {
    return Array.from(this.browsers.values());
  }

  async closeAll(): Promise<void> {
    for (const instance of this.browsers.values()) {
      await instance.close();
    }
    this.browsers.clear();
  }

  private getBrowserType(type: string): BrowserType {
    switch (type) {
      case 'firefox': return firefox;
      case 'webkit': return webkit;
      case 'chromium':
      default: return chromium;
    }
  }

  async closeBrowser(id: ID): Promise<void> {
    const instance = this.browsers.get(id);
    if (instance) {
      await instance.close();
      this.browsers.delete(id);
      this.emit('browser_closed', id);
    }
  }
}

// ============================================
// Browser Instance
// ============================================

export class BrowserInstance extends EventEmitter<{
  context_created: [contextId: ID];
  context_closed: [contextId: ID];
  page_created: [pageId: ID; contextId: ID];
  page_closed: [pageId: ID];
  disconnected: [];
}> {
  public readonly id: ID;
  public readonly launchOptions: BrowserLaunchOptions;
  private browser: Browser;
  private contexts: Map<ID, BrowserContextInstance> = new Map();
  private closed = false;

  constructor(browser: Browser, id: ID, launchOptions: BrowserLaunchOptions) {
    super();
    this.id = id;
    this.browser = browser;
    this.launchOptions = launchOptions;

    browser.on('disconnected', () => {
      this.closed = true;
      this.emit('disconnected');
    });
  }

  async newContext(options?: any): Promise<BrowserContextInstance> {
    const context = await this.browser.newContext({
      viewport: this.launchOptions.viewport,
      userAgent: this.launchOptions.userAgent,
      locale: this.launchOptions.locale,
      timezoneId: this.launchOptions.timezoneId,
      geolocation: this.launchOptions.geolocation,
      permissions: this.launchOptions.permissions,
      extraHTTPHeaders: this.launchOptions.extraHTTPHeaders,
      offline: this.launchOptions.offline,
      httpCredentials: this.launchOptions.httpCredentials,
      ignoreHTTPSErrors: this.launchOptions.ignoreHTTPSErrors,
      bypassCSP: this.launchOptions.bypassCSP,
      javaScriptEnabled: this.launchOptions.javaScriptEnabled,
      acceptDownloads: this.launchOptions.acceptDownloads,
      colorScheme: this.launchOptions.colorScheme,
      reducedMotion: this.launchOptions.reducedMotion,
      forcedColors: this.launchOptions.forcedColors,
      recordVideo: this.launchOptions.recordVideo,
      recordHar: this.launchOptions.recordHar,
      ...options,
    });

    const contextInstance = new BrowserContextInstance(context, uuidv4() as any, this);
    this.contexts.set(contextInstance.id, contextInstance);
    this.emit('context_created', contextInstance.id);
    return contextInstance;
  }

  getContext(id: ID): BrowserContextInstance | undefined {
    return this.contexts.get(id);
  }

  getAllContexts(): BrowserContextInstance[] {
    return Array.from(this.contexts.values());
  }

  async close(): Promise<void> {
    if (this.closed) return;
    
    for (const context of this.contexts.values()) {
      await context.close();
    }
    
    await this.browser.close();
    this.closed = true;
  }

  isConnected(): boolean {
    return this.browser.isConnected();
  }
}

// ============================================
// Browser Context Instance
// ============================================

export class BrowserContextInstance extends EventEmitter<{
  page_created: [pageId: ID];
  page_closed: [pageId: ID];
  close: [];
}> {
  public readonly id: ID;
  public readonly context: BrowserContext;
  public readonly browserInstance: BrowserInstance;
  private pages: Map<ID, PageInstance> = new Map();
  private closed = false;

  constructor(context: BrowserContext, id: ID, browserInstance: BrowserInstance) {
    super();
    this.id = id;
    this.context = context;
    this.browserInstance = browserInstance;

    context.on('page', (page) => {
      const pageInstance = new PageInstance(page, uuidv4() as any, this);
      this.pages.set(pageInstance.id, pageInstance);
      this.emit('page_created', pageInstance.id);
    });

    context.on('close', () => {
      this.closed = true;
      this.emit('close');
    });
  }

  async newPage(): Promise<PageInstance> {
    const page = await this.context.newPage();
    const pageInstance = new PageInstance(page, uuidv4() as any, this);
    this.pages.set(pageInstance.id, pageInstance);
    this.emit('page_created', pageInstance.id);
    return pageInstance;
  }

  getPage(id: ID): PageInstance | undefined {
    return this.pages.get(id);
  }

  getAllPages(): PageInstance[] {
    return Array.from(this.pages.values());
  }

  async close(): Promise<void> {
    if (this.closed) return;
    
    for (const page of this.pages.values()) {
      await page.close();
    }
    
    await this.context.close();
    this.closed = true;
    this.browserInstance.contexts.delete(this.id);
    this.emit('close');
  }

  async addCookies(cookies: Cookie[]): Promise<void> {
    await this.context.addCookies(cookies);
  }

  async clearCookies(): Promise<void> {
    await this.context.clearCookies();
  }

  async getCookies(urls?: string[]): Promise<Cookie[]> {
    return this.context.cookies(urls);
  }

  async setPermissions(permissions: Permission[]): Promise<void> {
    await this.context.setPermissions(permissions);
  }

  async grantPermissions(permissions: Permission[], origin?: string): Promise<void> {
    await this.context.grantPermissions(permissions, { origin });
  }

  async clearPermissions(): Promise<void> {
    await this.context.clearPermissions();
  }

  async setExtraHTTPHeaders(headers: Record<string, string>): Promise<void> {
    await this.context.setExtraHTTPHeaders(headers);
  }

  async setOffline(offline: boolean): Promise<void> {
    await this.context.setOffline(offline);
  }
}

// ============================================
// Page Instance
// ============================================

export class PageInstance extends EventEmitter<{
  load: [];
  domcontentloaded: [];
  loaderror: [error: Error];
  console: [type: string; text: string; location: string];
  request: [url: string; method: string; resourceType: string];
  response: [url: string; status: number; headers: Record<string, string>];
  requestfailed: [url: string; error: string];
  dialog: [type: string; message: string; defaultValue: string];
  close: [];
}> {
  public readonly id: ID;
  public readonly page: Page;
  public readonly contextInstance: BrowserContextInstance;
  private closed = false;
  private consoleMessages: BrowserLog[] = [];
  private networkLogs: BrowserLog[] = [];

  constructor(page: Page, id: ID, contextInstance: BrowserContextInstance) {
    super();
    this.id = id;
    this.page = page;
    this.contextInstance = contextInstance;

    page.on('load', () => this.emit('load'));
    page.on('domcontentloaded', () => this.emit('domcontentloaded'));
    page.on('error', (error) => this.emit('loaderror', error));
    page.on('console', (msg) => {
      const log: BrowserLog = {
        level: msg.type() as any,
        message: msg.text(),
        timestamp: new Date().toISOString(),
        source: 'console',
      };
      this.consoleMessages.push(log);
    });
    page.on('request', (request) => {
      this.networkLogs.push({
        level: 'info',
        message: `${request.method()} ${request.url()}`,
        timestamp: new Date().toISOString(),
        source: 'network',
      });
    });
    page.on('response', (response) => {
      this.networkLogs.push({
        level: 'info',
        message: `${response.status()} ${response.url()}`,
        timestamp: new Date().toISOString(),
        source: 'network',
      });
    });
    page.on('requestfailed', (request) => {
      this.networkLogs.push({
        level: 'error',
        message: `Request failed: ${request.url()} - ${request.failure()?.errorText}`,
        timestamp: new Date().toISOString(),
        source: 'network',
      });
    });
    page.on('dialog', (dialog) => {
      this.emit('dialog', dialog.type(), dialog.message(), dialog.defaultValue());
    });
    page.on('close', () => {
      this.closed = true;
      this.emit('close');
    });
  }

  async goto(url: string, options: PageNavigationOptions = {}): Promise<any> {
    const response = await this.page.goto(url, {
      waitUntil: options.waitUntil || 'networkidle',
      timeout: options.timeout || 30000,
      referer: options.referer,
    });
    return response;
  }

  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle', timeout = 30000): Promise<void> {
    await this.page.waitForLoadState(state, { timeout });
  }

  async waitForSelector(selector: string, options: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number } = {}): Promise<any> {
    return this.page.waitForSelector(selector, options);
  }

  async click(selector: string, options: { button?: 'left' | 'right' | 'middle'; clickCount?: number; delay?: number; force?: boolean; noWaitAfter?: boolean; modifiers?: string[]; position?: { x: number; y: number }; strict?: boolean; timeout?: number; trial?: boolean } = {}): Promise<void> {
    await this.page.click(selector, options);
  }

  async type(selector: string, text: string, options: { delay?: number; noWaitAfter?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.type(selector, text, options);
  }

  async fill(selector: string, value: string, options: { force?: boolean; noWaitAfter?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.fill(selector, value, options);
  }

  async press(key: string, options: { delay?: number; timeout?: number } = {}): Promise<void> {
    await this.page.keyboard.press(key, options);
  }

  async hover(selector: string, options: { force?: boolean; modifiers?: string[]; position?: { x: number; y: number }; strict?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.hover(selector, options);
  }

  async focus(selector: string, options: { strict?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.focus(selector, options);
  }

  async selectOption(selector: string, values: string | string[], options: { force?: boolean; noWaitAfter?: boolean; timeout?: number } = {}): Promise<string[]> {
    return this.page.selectOption(selector, values, options);
  }

  async check(selector: string, options: { force?: boolean; noWaitAfter?: boolean; position?: { x: number; y: number }; strict?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.check(selector, options);
  }

  async uncheck(selector: string, options: { force?: boolean; noWaitAfter?: boolean; position?: { x: number; y: number }; strict?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.uncheck(selector, options);
  }

  async selectText(selector: string, options: { force?: boolean; strict?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.selectText(selector, options);
  }

  async setInputFiles(selector: string, files: string | string[] | { name: string; mimeType: string; buffer: Buffer }[], options: { noWaitAfter?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.setInputFiles(selector, files, options);
  }

  async screenshot(options: ScreenshotOptions = {}): Promise<Buffer | string> {
    return this.page.screenshot(options);
  }

  async pdf(options: PDFOptions = {}): Promise<Buffer> {
    return this.page.pdf(options);
  }

  async content(): Promise<string> {
    return this.page.content();
  }

  async setContent(html: string, options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}): Promise<void> {
    await this.page.setContent(html, options);
  }

  async evaluate<T>(expression: string, arg?: any): Promise<T> {
    return this.page.evaluate(expression, arg);
  }

  async evaluateHandle(expression: string, arg?: any): Promise<any> {
    return this.page.evaluateHandle(expression, arg);
  }

  async waitForFunction(expression: string, arg?: any, options: { polling?: 'raf' | 'mutation' | number; timeout?: number } = {}): Promise<any> {
    return this.page.waitForFunction(expression, arg, options);
  }

  async waitForTimeout(timeout: number): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }

  async waitForURL(url: string | RegExp, options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}): Promise<void> {
    await this.page.waitForURL(url, options);
  }

  async dragAndDrop(source: string, target: string, options: { force?: boolean; strict?: boolean; timeout?: number } = {}): Promise<void> {
    await this.page.dragAndDrop(source, target, options);
  }

  async scrollIntoView(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async getViewport(): Promise<Viewport> {
    return this.page.viewportSize() || { width: 0, height: 0, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: false };
  }

  async setViewport(viewport: Viewport): Promise<void> {
    await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
  }

  async getCookies(urls?: string[]): Promise<Cookie[]> {
    return this.contextInstance.context.cookies(urls);
  }

  async setCookies(cookies: Cookie[]): Promise<void> {
    await this.contextInstance.context.addCookies(cookies);
  }

  async clearCookies(): Promise<void> {
    await this.contextInstance.context.clearCookies();
  }

  getConsoleLogs(): BrowserLog[] {
    return [...this.consoleMessages];
  }

  getNetworkLogs(): BrowserLog[] {
    return [...this.networkLogs];
  }

  clearLogs(): void {
    this.consoleMessages = [];
    this.networkLogs = [];
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.page.close();
    this.contextInstance.pages.delete(this.id);
  }

  isClosed(): boolean {
    return this.closed;
  }

  getUrl(): string {
    return this.page.url();
  }

  getTitle(): Promise<string> {
    return this.page.title();
  }
}

// ============================================
// Factory Functions
// ============================================

export async function createBrowserManager(): Promise<BrowserManager> {
  return new BrowserManager();
}

export async function createBrowser(options?: BrowserLaunchOptions): Promise<BrowserInstance> {
  const manager = new BrowserManager();
  return manager.launch(options);
}

export { chromium, firefox, webkit } from 'playwright';
export type { Browser, BrowserContext, Page } from 'playwright';