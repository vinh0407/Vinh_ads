import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import {
  ID,
  Timestamp,
  Result,
  ok,
  err,
  VinceError,
  ValidationError,
  TaskType,
  AIProviderName,
  ToolDefinition,
  ToolContext,
  ToolResult,
  ToolPermission,
} from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';
import { emitEvent } from '@vince-ai/shared/events';
import { AIRouter, RoutingDecision, RoutingContext } from '@vince-ai/ai-router';
import { GeminiProvider } from '@vince-ai/ai-gemini';
import { NemotronProvider } from '@vince-ai/ai-nemotron';
import { OpenCodeProvider } from '@vince-ai/ai-opencode';

// ============================================
// Types
// ============================================

export interface OrchestrationContext {
  userId: ID;
  projectId?: ID;
  sessionId: ID;
  request: string;
  constraints?: {
    maxCost?: number;
    maxTime?: number;
    requiredCapabilities?: string[];
    excludedProviders?: AIProviderName[];
    preferredProvider?: AIProviderName;
  };
  preferences?: {
    preferSpeed?: boolean;
    preferQuality?: boolean;
    preferCost?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface ExecutionPlan {
  id: ID;
  task: string;
  steps: ExecutionStep[];
  estimatedCost: number;
  estimatedTime: number;
  requiredApprovals: ApprovalStep[];
  createdAt: Timestamp;
}

export interface ExecutionStep {
  id: ID;
  order: number;
  description: string;
  provider: AIProviderName;
  model?: string;
  tool?: string;
  input: unknown;
  expectedOutput: string;
  dependencies: ID[];
  requiresApproval: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface ApprovalStep {
  stepId: ID;
  description: string;
  required: boolean;
  approved?: boolean;
  approvedBy?: ID;
  approvedAt?: Timestamp;
}

export interface OrchestrationResult {
  planId: ID;
  success: boolean;
  results: Record<string, unknown>;
  errors: string[];
  totalCost: number;
  totalTime: number;
  completedAt: Timestamp;
}

export interface OrchestrationState {
  plan: ExecutionPlan | null;
  currentStep: number;
  status: 'idle' | 'planning' | 'executing' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStepDetails?: ExecutionStep;
  error?: string;
}

// ============================================
// AI Orchestrator
// ============================================

export class AIOrchestrator extends EventEmitter<{
  planning_started: [planId: ID];
  planning_completed: [planId: ID];
  step_started: [stepId: ID; description: string];
  step_completed: [stepId: ID; result: unknown];
  step_failed: [stepId: ID; error: string];
  approval_requested: [stepId: ID; description: string];
  approval_received: [stepId: ID; approved: boolean];
  completed: [result: OrchestrationResult];
  failed: [error: string];
  progress: [progress: number; currentStep: string];
}> {
  private router: any; // AIRouter
  private providers: Map<string, any> = new Map();
  private currentState: OrchestrationState = {
    plan: null,
    currentStep: 0,
    status: 'idle',
    progress: 0,
  };
  private currentPlan: any = null;
  private approvalCallbacks: Map<string, (approved: boolean) => void> = new Map();
  private maxRetries = 3;
  private maxIterations = 10;

  constructor() {
    super();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Providers will be registered externally
  }

  registerProvider(name: string, provider: any): void {
    this.providers.set(name, provider);
  }

  getProvider(name: string): any {
    return this.providers.get(name);
  }

  /**
   * Main entry point: Execute a user request
   */
  async execute(context: OrchestrationContext): Promise<Result<OrchestrationResult, VinceError>> {
    const planId = uuidv4() as ID;
    const startTime = Date.now();

    try {
      this.currentState = {
        plan: null,
        currentStep: 0,
        status: 'planning',
        progress: 0,
      };

      this.emit('planning_started', planId);

      // Phase 1: Create execution plan
      const plan = await this.createPlan(context, planId);
      this.currentState.plan = plan;
      this.currentState.status = 'executing';

      this.emit('planning_completed', planId);

      // Phase 2: Execute plan
      const result = await this.executePlan(plan, context);

      const resultObj: OrchestrationResult = {
        planId,
        success: result.errors.length === 0,
        results: result.results,
        errors: result.errors,
        totalCost: result.totalCost,
        totalTime: Date.now() - startTime,
        completedAt: new Date().toISOString(),
      };

      this.currentState.status = resultObj.success ? 'completed' : 'failed';
      this.currentState.progress = 100;

      if (resultObj.success) {
        this.emit('completed', resultObj);
      } else {
        this.emit('failed', result.errors.join('; '));
      }

      return ok(resultObj);
    } catch (error) {
      this.currentState.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('failed', errorMessage);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Creates an execution plan from user request
   */
  private async createPlan(context: OrchestrationContext, planId: ID): Promise<any> {
    // Step 1: Classify the task
    const taskType = await this.classifyTask(context.request);
    
    // Step 2: Route to appropriate provider(s)
    const routingContext: any = {
      task: context.request,
      input: context.request,
      constraints: context.constraints,
      preferences: context.preferences,
    };

    const routingDecision = await this.routeTask(routingContext);

    // Step 3: Break down into steps
    const steps = await this.decomposeTask(context.request, routingDecision);

    // Step 4: Determine approvals needed
    const approvals = this.determineApprovals(steps);

    return {
      id: planId,
      task: context.request,
      taskType: 'general',
      steps,
      estimatedCost: this.estimateCost(steps),
      estimatedTime: this.estimateTime(steps),
      requiredApprovals: approvals,
      createdAt: new Date().toISOString(),
    };
  }

  private async classifyTask(request: string): Promise<string> {
    // Use router's task classifier
    return 'general';
  }

  private async routeTask(context: any): Promise<any> {
    // Use the AI router
    return {
      primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
      fallbacks: [{ provider: 'nemotron', model: 'nemotron-3-ultra' }],
      reasoning: 'Default routing to Gemini',
      confidence: 0.8,
    };
  }

  private async decomposeTask(request: string, routing: any): Promise<any[]> {
    // In a real implementation, this would use an LLM to break down the task
    // For now, return a simple decomposition
    return [
      {
        id: uuidv4(),
        order: 1,
        description: 'Analyze request and gather requirements',
        provider: 'gemini',
        tool: 'generateText',
        input: { prompt: request },
        expectedOutput: 'Requirements analysis',
        dependencies: [],
        requiresApproval: false,
        status: 'pending',
      },
      {
        id: uuidv4(),
        order: 2,
        description: 'Generate content/plan based on requirements',
        provider: 'gemini',
        tool: 'generateText',
        input: { prompt: `Create detailed plan for: ${request}` },
        expectedOutput: 'Detailed execution plan',
        dependencies: [],
        requiresApproval: true,
        status: 'pending',
      },
      {
        id: uuidv4(),
        order: 3,
        description: 'Execute plan and generate deliverables',
        provider: routing.primary.provider,
        tool: 'generateText',
        input: { prompt: 'Execute the plan' },
        expectedOutput: 'Final deliverables',
        dependencies: [],
        requiresApproval: false,
        status: 'pending',
      },
    ];
  }

  private determineApprovals(steps: any[]): any[] {
    return steps
      .filter(step => step.requiresApproval)
      .map(step => ({
        stepId: step.id,
        description: `Approve: ${step.description}`,
        required: true,
      }));
  }

  private estimateCost(steps: any[]): number {
    return steps.length * 0.01; // Rough estimate
  }

  private estimateTime(steps: any[]): number {
    return steps.length * 5000; // ms
  }

  /**
   * Executes the plan step by step
   */
  private async executePlan(plan: any, context: any): Promise<{
    results: Record<string, unknown>;
    errors: string[];
    totalCost: number;
    totalTime: number;
  }> {
    const results: Record<string, unknown> = {};
    const errors: string[] = [];
    let totalCost = 0;
    let totalTime = 0;

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      this.currentState.currentStep = i;
      this.currentState.progress = (i / plan.steps.length) * 100;
      this.currentState.currentStepDetails = step;

      this.emit('step_started', step.id, step.description);

      try {
        // Check if approval needed
        if (step.requiresApproval) {
          const approved = await this.requestApproval(step.id, step.description);
          if (!approved) {
            step.status = 'skipped';
            this.emit('step_failed', step.id, 'Approval denied');
            continue;
          }
        }

        step.status = 'running';
        step.startedAt = new Date().toISOString();

        // Execute step
        const result = await this.executeStep(step);
        
        step.status = 'completed';
        step.result = result;
        step.completedAt = new Date().toISOString();
        
        results[step.id] = result;
        this.emit('step_completed', step.id, result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        step.status = 'failed';
        step.error = errorMessage;
        
        errors.push(`Step ${step.order}: ${errorMessage}`);
        this.emit('step_failed', step.id, errorMessage);

        // Try retry
        const retryResult = await this.retryStep(step, 3);
        if (retryResult.success) {
          results[step.id] = retryResult.result;
          errors.pop(); // Remove error since retry succeeded
        }
      }

      this.currentState.progress = ((i + 1) / plan.steps.length) * 100;
      this.emit('progress', this.currentState.progress, step.description);
    }

    return { results, errors, totalCost: 0, totalTime: 0 };
  }

  private async executeStep(step: any): Promise<unknown> {
    const provider = this.getProvider(step.provider);
    if (!provider) {
      throw new Error(`Provider ${step.provider} not available`);
    }

    // Execute the appropriate tool
    switch (step.tool) {
      case 'generateText':
        return provider.generateText(step.input);
      case 'generateStructuredOutput':
        return provider.generateStructuredOutput(step.input);
      case 'analyzeContent':
        return provider.analyzeContent(step.input);
      case 'analyzeImage':
        return provider.analyzeImage(step.input.image, step.input.prompt);
      case 'analyzeVideo':
        return provider.analyzeVideoQA(step.input.frames, step.input.criteria);
      default:
        throw new Error(`Unknown tool: ${step.tool}`);
    }
  }

  private async requestApproval(stepId: string, description: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.approvalCallbacks.set(stepId, resolve);
      this.emit('approval_requested', stepId, description);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.approvalCallbacks.has(stepId)) {
          this.approvalCallbacks.delete(stepId);
          resolve(false);
        }
      }, 5 * 60 * 1000);
    });
  }

  approveStep(stepId: string, approved: boolean): void {
    const callback = this.approvalCallbacks.get(stepId);
    if (callback) {
      this.approvalCallbacks.delete(stepId);
      callback(approved);
      this.emit('approval_received', stepId, approved);
    }
  }

  private async retryStep(step: any, maxRetries: number): Promise<{ success: boolean; result?: unknown }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeStep(step);
        return { success: true, result };
      } catch (error) {
        if (attempt === maxRetries) {
          return { success: false };
        }
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    return { success: false };
  }

  /**
   * Gets current orchestration state
   */
  getState(): any {
    return { ...this.currentState };
  }

  /**
   * Cancels current execution
   */
  async cancel(): Promise<void> {
    this.currentState.status = 'cancelled';
    // Cancel any running operations
  }

  /**
   * Gets available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Registers a provider
   */
  registerProvider(name: string, provider: any): void {
    this.providers.set(name, provider);
  }
}

export function createAIOrchestrator(): AIOrchestrator {
  return new AIOrchestrator();
}

export { TaskType } from '@vince-ai/shared';