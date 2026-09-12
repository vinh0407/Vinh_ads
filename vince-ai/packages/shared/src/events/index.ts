import { EventEmitter } from 'eventemitter3';

/**
 * Event system for Vince AI
 */

export interface EventMap {
  // Auth events
  'auth:login': { userId: string; provider: string; timestamp: string };
  'auth:logout': { userId: string; provider: string; timestamp: string };
  'auth:token_refresh': { userId: string; provider: string; timestamp: string };
  'auth:expired': { userId: string; provider: string; timestamp: string };
  'auth:failed': { error: string; provider: string; timestamp: string };

  // Provider events
  'provider:connected': { provider: string; userId: string; timestamp: string };
  'provider:disconnected': { provider: string; userId: string; timestamp: string };
  'provider:error': { provider: string; error: string; timestamp: string };
  'provider:health_changed': { provider: string; status: string; timestamp: string };

  // Project events
  'project:created': { projectId: string; userId: string; timestamp: string };
  'project:updated': { projectId: string; userId: string; timestamp: string };
  'project:deleted': { projectId: string; userId: string; timestamp: string };
  'project:archived': { projectId: string; userId: string; timestamp: string };

  // Video events
  'video:stage_changed': { projectId: string; stage: string; timestamp: string };
  'video:progress': { projectId: string; progress: number; stage: string; timestamp: string };
  'video:completed': { projectId: string; videoId: string; timestamp: string };
  'video:failed': { projectId: string; error: string; timestamp: string };
  'video:qa_completed': { projectId: string; score: number; issues: number; timestamp: string };
  'video:render_started': { projectId: string; timestamp: string };
  'video:render_completed': { projectId: string; videoId: string; duration: number; timestamp: string };
  'video:qa_issue_found': { projectId: string; issue: unknown; timestamp: string };
  'video:fix_applied': { projectId: string; issueId: string; timestamp: string };

  // AI events
  'ai:request_started': { provider: string; task: string; timestamp: string };
  'ai:request_completed': { provider: string; task: string; duration: number; timestamp: string };
  'ai:request_failed': { provider: string; task: string; error: string; timestamp: string };
  'ai:token_usage': { provider: string; tokens: number; cost: number; timestamp: string };
  'ai:fallback': { fromProvider: string; toProvider: string; reason: string; timestamp: string };

  // Browser events
  'browser:action': { action: string; url: string; timestamp: string };
  'browser:navigation': { url: string; timestamp: string };
  'browser:error': { error: string; url: string; timestamp: string };
  'browser:session_created': { profileId: string; timestamp: string };
  'browser:session_closed': { profileId: string; timestamp: string };

  // Research events
  'research:started': { query: string; type: string; timestamp: string };
  'research:completed': { query: string; sources: number; timestamp: string };
  'research:failed': { query: string; error: string; timestamp: string };

  // Content events
  'content:script_generated': { projectId: string; wordCount: number; timestamp: string };
  'content:storyboard_created': { projectId: string; scenes: number; timestamp: string };
  'content:caption_generated': { projectId: string; timestamp: string };

  // Video factory events
  'video:generation_started': { projectId: string; provider: string; timestamp: string };
  'video:generation_completed': { projectId: string; videoId: string; timestamp: string };
  'video:generation_failed': { projectId: string; error: string; timestamp: string };
  'video:qa_started': { projectId: string; iteration: number; timestamp: string };
  'video:qa_completed': { projectId: string; score: number; passed: boolean; timestamp: string };
  'video:fix_applied': { projectId: string; issueId: string; timestamp: string };
  'video:render_started': { projectId: string; timestamp: string };
  'video:render_completed': { projectId: string; videoId: string; timestamp: string };
  'video:render_failed': { projectId: string; error: string; timestamp: string };

  // Social events
  'social:post_scheduled': { postId: string; pageId: string; scheduledAt: string; timestamp: string };
  'social:post_published': { postId: string; pageId: string; externalId: string; timestamp: string };
  'social:post_failed': { postId: string; pageId: string; error: string; timestamp: string };
  'social:page_connected': { pageId: string; pageName: string; timestamp: string };
  'social:page_disconnected': { pageId: string; timestamp: string };

  // Affiliate events
  'affiliate:product_analyzed': { productId: string; url: string; timestamp: string };
  'affiliate:campaign_created': { campaignId: string; timestamp: string };
  'affiliate:conversion': { campaignId: string; productId: string; value: number; timestamp: string };

  // System events
  'system:startup': { version: string; timestamp: string };
  'system:shutdown': { timestamp: string };
  'system:error': { error: string; context: string; timestamp: string };
  'system:health_check': { status: string; checks: Record<string, boolean>; timestamp: string };

  // Queue events
  'queue:job_queued': { jobId: string; type: string; timestamp: string };
  'queue:job_started': { jobId: string; type: string; timestamp: string };
  'queue:job_completed': { jobId: string; type: string; duration: number; timestamp: string };
  'queue:job_failed': { jobId: string; type: string; error: string; timestamp: string };
  'queue:job_retry': { jobId: string; type: string; attempt: number; timestamp: string };
  'queue:job_cancelled': { jobId: string; type: string; timestamp: string };

  // Storage events
  'storage:uploaded': { path: string; size: number; timestamp: string };
  'storage:deleted': { path: string; timestamp: string };
  'storage:error': { path: string; error: string; timestamp: string };
}

export class EventBus extends EventEmitter<EventMap> {
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): boolean {
    const enrichedData = { ...data, timestamp: data.timestamp || new Date().toISOString() };
    return super.emit(event, enrichedData);
  }

  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this {
    return super.on(event, listener);
  }

  once<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this {
    return super.once(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this {
    return super.off(event, listener);
  }

  emitAsync<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void[]> {
    const listeners = this.listeners(event);
    return Promise.all(listeners.map(listener => Promise.resolve(listener(data))));
  }
}

export const eventBus = EventBus.getInstance();

export function emitEvent<K extends keyof EventMap>(event: K, data: Omit<EventMap[K], 'timestamp'>): void {
  eventBus.emit(event, { ...data, timestamp: new Date().toISOString() } as EventMap[K]);
}

export function onEvent<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): () => void {
  eventBus.on(event, listener);
  return () => eventBus.off(event, listener);
}

export function onceEvent<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): () => void {
  eventBus.once(event, listener);
  return () => eventBus.off(event, listener);
}