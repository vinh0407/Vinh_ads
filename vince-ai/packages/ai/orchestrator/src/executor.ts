import { EventEmitter } from 'eventemitter3';
import { ID, Timestamp, Result, ok, err, VinceError, ValidationError } from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';
import { emitEvent } from '@vince-ai/shared/events';
import { PlanStep, ExecutionPlan, PlanStep as StepType } from './planner';

// ============================================
// Types
// ============================================

export interface ExecutionContext {
  planId: ID;
  step: StepType;
  provider: any;
  variables: Record<string, unknown>;
  previousResults: Record<string, unknown>;
}

export interface StepResult {
  success: boolean;
  output?: unknown;
  error?: string;
  cost: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutionState {
  planId: ID;
  currentStepIndex: number;
  completedSteps: Set<string>;
  failedSteps: Map<string, string>;
  stepResults: Map<string, any>;
  totalCost: number;
  totalTime: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
}

export interface ExecutionOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  continueOnFailure?: boolean;
  approvalCallback?: (stepId: string, description: string) => Promise<boolean>;
}

// ============================================
// Step Executor
// ============================================

export class StepExecutor {
  private state: ExecutionState;
  private options: Required<ExecutionOptions>;
  private abortController: AbortController | null = null;

  constructor(options: ExecutionOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      timeout: options.timeout ?? 300000, // 5 minutes
      continueOnFailure: options.continueOnFailure ?? false,
      approvalCallback: options.approvalCallback,
    };
    this.state = {
      planId: '' as ID,
      currentStepIndex: 0,
      completedSteps: new Set(),
      failedSteps: new Map(),
      stepResults: new Map(),
      totalCost: 0,
      totalTime: 0,
      status: 'idle',
    };
  }

  async executePlan(
    plan: any,
    context: any,
    options?: ExecutionOptions
  ): Promise<{ results: Map<string, any>; errors: string[]; totalCost: number; totalTime: number }> {
    if (this.options.maxRetries !== undefined) {
      // Update options if provided
    }

    this.state = {
      planId: context.planId || '',
      currentStepIndex: 0,
      completedSteps: new Set(),
      failedSteps: new Map(),
      stepResults: new Map(),
      totalCost: 0,
      totalTime: 0,
      status: 'running',
    };

    this.abortController = new AbortController();

    const startTime = Date.now();
    const errors: string[] = [];

    try {
      for (let i = 0; i < plan.steps.length; i++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Execution cancelled');
        }

        this.state.currentStepIndex = i;
        const step = plan.steps[i];

        // Check dependencies
        if (!this.areDependenciesMet(step)) {
          const error = `Dependencies not met for step ${step.id}`;
          this.handleStepFailure(step, new Error(error));
          if (!this.options.continueOnFailure) {
            throw new Error(error);
          }
          continue;
        }

        // Check if approval needed
        if (step.requiresApproval && this.options.approvalCallback) {
          const approved = await this.options.approvalCallback(step.id, step.description);
          if (!approved) {
            const error = `Approval denied for step ${step.id}: ${step.description}`;
            this.handleStepFailure(step, new Error(error));
            if (!this.options.continueOnFailure) {
              throw new Error(error);
            }
            continue;
          }
        }

        // Execute step with retries
        const result = await this.executeStepWithRetry(step, i);
        
        if (result.success) {
          this.handleStepSuccess(step, result);
        } else {
          this.handleStepFailure(step, result.error || new Error('Unknown error'));
          if (!this.options.continueOnFailure) {
            throw result.error;
          }
        }
      }

      return {
        results: Object.fromEntries(this.state.stepResults),
        errors: Array.from(this.state.failedSteps.values()),
        totalCost: this.state.totalCost,
        totalTime: Date.now() - (this.state as any).startTime || 0,
      };
    } catch (error) {
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  private areDependenciesMet(step: any): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }
    return step.dependencies.every((dep: string) => this.state.completedSteps.has(dep));
  }

  private async executeStepWithRetry(step: any, stepIndex: number): Promise<{ success: boolean; output?: any; error?: Error }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        if (this.abortController?.signal.aborted) {
          throw new Error('Execution cancelled');
        }

        const result = await this.executeStep(step);
        return { success: true, output: result };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(this.options.backoffMultiplier, attempt);
          await this.sleep(this.options.retryDelay * Math.pow(this.options.backoffMultiplier, attempt));
        }
      }
    }

    return { success: false, error: lastError || new Error('Max retries exceeded') };
  }

  private async executeStep(step: any): Promise<any> {
    const startTime = Date.now();
    
    // In a real implementation, this would call the actual provider
    // For now, return mock result
    return {
      success: true,
      output: `Completed step: ${step.description}`,
      metadata: {
        stepId: step.id,
        provider: step.provider,
        tool: step.tool,
      },
    };
  }

  private handleStepSuccess(step: any, result: { output: any; cost: number; duration: number }): void {
    this.state.completedSteps.add(step.id);
    this.state.stepResults.set(step.id, result.output);
    this.state.totalCost += result.cost;
    this.state.totalTime += result.duration;
  }

  private handleStepFailure(step: any, error: Error): void {
    this.state.failedSteps.set(step.id, error.message);
    step.error = error.message;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getState(): any {
    return { ...this.state };
  }
}

/**
 * Parallel Step Executor
 * Executes independent steps in parallel
 */
export class ParallelStepExecutor {
  private maxConcurrency: number;
  private runningPromises: Set<Promise<any>> = new Set();

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  async executeSteps(steps: any[], executeFn: (step: any) => Promise<any>): Promise<any[]> {
    const results: any[] = [];
    const queue = [...steps];
    
    async function runNext(): Promise<void> {
      if (queue.length === 0) return;
      
      const step = queue.shift()!;
      const promise = executeFn(step).then(
        result => ({ success: true, result }),
        error => ({ success: false, error })
      );
      
      this.runningPromises.add(promise);
      
      try {
        const result = await promise;
        results.push({ step: step.id, ...result });
      } finally {
        this.runningPromises.delete(promise);
        if (queue.length > 0) {
          await runNext();
        }
      }
    }

    // Start initial batch
    const initialBatch = queue.splice(0, this.maxConcurrency);
    await Promise.all(initialBatch.map(step => runNext()));
    
    return results;
  }
}

/**
 * Sequential Step Executor with Checkpointing
 */
export class CheckpointedExecutor extends StepExecutor {
  private checkpoints: Map<string, any> = new Map();
  private checkpointInterval: number;

  constructor(options: ExecutionOptions & { checkpointInterval?: number } = {}) {
    super(options);
    this.checkpointInterval = options.checkpointInterval ?? 5; // Save checkpoint every 5 steps
  }

  async executePlanWithCheckpoints(plan: any, context: any): Promise<any> {
    // Save initial checkpoint
    this.saveCheckpoint('initial', { plan, context });

    for (let i = 0; i < plan.steps.length; i++) {
      if (i % this.checkpointInterval === 0 && i > 0) {
        this.saveCheckpoint(`step_${i}`, { currentStep: i, state: this.getState() });
      }

      // Execute step
      // ... (similar to base class)
    }

    // Save final checkpoint
    this.saveCheckpoint('complete', { state: this.getState() });
    
    return { success: true };
  }

  private saveCheckpoint(name: string, data: any): void {
    this.checkpoints.set(name, {
      data,
      timestamp: new Date().toISOString(),
    });
    
    // Persist to storage
    // await this.storage.set(`checkpoint_${name}`, JSON.stringify(data));
  }

  getCheckpoint(name: string): any {
    return this.checkpoints.get(name)?.data;
  }

  listCheckpoints(): string[] {
    return Array.from(this.checkpoints.keys());
  }
}

/**
 * Creates a step executor with default options
 */
export function createStepExecutor(options?: Partial<ExecutionOptions>): StepExecutor {
  return new StepExecutor(options);
}

export { StepExecutor, ParallelStepExecutor, CheckpointedExecutor };
export type { ExecutionContext, StepResult, ExecutionState, ExecutionOptions };