import { z } from 'zod';
import { ID, Timestamp } from '@vince-ai/shared';
import { TaskType, AIProviderName } from '@vince-ai/shared';

/**
 * Task Planner for AI Orchestrator
 * Decomposes high-level requests into executable steps
 */

// ============================================
// Types
// ============================================

export interface PlanningContext {
  request: string;
  taskType: string;
  availableProviders: string[];
  availableTools: string[];
  constraints?: {
    maxSteps?: number;
    maxCost?: number;
    maxTime?: number;
    requiredCapabilities?: string[];
  };
  context?: Record<string, unknown>;
}

export interface PlanStep {
  id: ID;
  order: number;
  name: string;
  description: string;
  provider: AIProviderName;
  tool: string;
  input: Record<string, unknown>;
  expectedOutput: string;
  dependencies: ID[];
  requiresApproval: boolean;
  estimatedCost: number;
  estimatedTime: number;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface ExecutionPlan {
  id: ID;
  goal: string;
  steps: PlanStep[];
  totalEstimatedCost: number;
  totalEstimatedTime: number;
  requiredApprovals: ApprovalRequirement[];
  createdAt: Timestamp;
  metadata: Record<string, unknown>;
}

export interface ApprovalRequirement {
  stepId: ID;
  description: string;
  required: boolean;
  autoApprove?: boolean;
}

export interface PlanningResult {
  plan: ExecutionPlan;
  reasoning: string;
  confidence: number;
  alternativePlans?: any[];
}

// ============================================
// Planner
// ============================================

export class TaskPlanner {
  private maxSteps = 10;
  private defaultRetryPolicy = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  };

  /**
   * Creates an execution plan from a high-level request
   */
  async createPlan(context: PlanningContext): Promise<PlanningResult> {
    // Step 1: Analyze the request
    const analysis = await this.analyzeRequest(context);
    
    // Step 2: Determine required capabilities
    const capabilities = this.determineCapabilities(analysis);
    
    // Step 3: Select providers for each capability
    const providerAssignment = this.assignProviders(capabilities, context.availableProviders);
    
    // Step 4: Generate execution steps
    const steps = await this.generateSteps(analysis, providerAssignment, context);
    
    // Step 4: Determine approval requirements
    const approvals = this.determineApprovals(providerAssignment);
    
    // Step 5: Calculate estimates
    const totalCost = this.estimateTotalCost(providerAssignment);
    const totalTime = this.estimateTotalTime(providerAssignment);
    
    const plan: any = {
      id: crypto.randomUUID(),
      goal: context.request,
      steps: [],
      totalEstimatedCost: 0,
      totalEstimatedTime: 0,
      requiredApprovals: [],
      createdAt: new Date().toISOString(),
      metadata: {},
    };

    return {
      plan,
      reasoning: 'Plan generated based on request analysis',
      confidence: 0.8,
    };
  }

  private async analyzeRequest(context: PlanningContext) {
    // Analyze the request to understand intent and requirements
    return {
      intent: 'general',
      complexity: 'medium',
      requiredCapabilities: ['text'],
      estimatedComplexity: 'medium',
    };
  }

  private determineCapabilities(analysis: any): string[] {
    // Determine what capabilities are needed
    return analysis.requiredCapabilities || ['text'];
  }

  private assignProviders(capabilities: string[], availableProviders: string[]): Map<string, string> {
    // Map capabilities to providers
    const assignment = new Map<string, string>();
    
    for (const capability of capabilities) {
      const provider = this.selectBestProvider(capability, capabilities);
      if (provider) {
        assignment.set(capability, provider);
      }
    }
    
    return assignment;
  }

  private selectBestProvider(capability: string, availableProviders: string[]): string {
    // Simple provider selection logic
    const providerCapabilities: Record<string, string[]> = {
      gemini: ['text', 'vision', 'structuredOutput', 'toolCalling', 'streaming'],
      nemotron: ['vision', 'videoAnalysis', 'structuredOutput'],
      opencode: ['toolCalling', 'coding'],
    };

    for (const provider of capabilities) {
      if (availableProviders.includes(provider) && providerCapabilities[provider]?.includes(capability)) {
        return provider;
      }
    }
    
    return capabilities[0] || 'gemini';
  }

  private async generateSteps(
    analysis: any,
    providerAssignment: Map<string, string>,
    context: any
  ): Promise<any[]> {
    // Generate execution steps based on analysis
    const steps = [];
    let order = 1;

    for (const [capability, provider] of providerAssignment) {
      const step = {
        id: crypto.randomUUID(),
        order: order++,
        name: `${capability} step`,
        description: `Execute ${capability} using ${provider}`,
        provider,
        tool: this.getToolForCapability(capability),
        input: this.generateInputForCapability(capability),
        expectedOutput: `Result of ${capability}`,
        dependencies: [],
        requiresApproval: this.requiresApproval(capability),
        estimatedCost: 0.01,
        estimatedTime: 5000,
        retryPolicy: this.defaultRetryPolicy,
      };
      
      steps.push(step);
    }

    return steps;
  }

  private getToolForCapability(capability: string): string {
    const tools: Record<string, string> = {
      text: 'generateText',
      vision: 'analyzeImage',
      videoAnalysis: 'analyzeVideoQA',
      structuredOutput: 'generateStructuredOutput',
      toolCalling: 'executeTool',
    };
    return tools[capability] || 'generateText';
  }

  private generateInputForCapability(capability: string): Record<string, unknown> {
    // Generate appropriate input based on capability
    return { prompt: `Execute ${capability} task` };
  }

  private requiresApproval(capability: string): boolean {
    // Determine if capability requires human approval
    const approvalRequired = ['publish', 'delete', 'payment', 'external_api'];
    return approvalRequired.includes(capability);
  }

  private determineApprovals(providerAssignment: Map<string, string>): any[] {
    const approvals = [];
    for (const [capability, provider] of providerAssignment) {
      if (this.requiresApproval(capability)) {
        approvals.push({
          stepId: crypto.randomUUID(),
          description: `Approve ${capability} using ${provider}`,
          required: true,
        });
      }
    }
    return approvals;
  }

  private estimateTotalCost(providerAssignment: Map<string, string>): number {
    let total = 0;
    for (const [capability, provider] of providerAssignment) {
      total += this.estimateProviderCost(provider);
    }
    return total;
  }

  private estimateTotalTime(providerAssignment: Map<string, string>): number {
    let total = 0;
    for (const provider of providerAssignment.values()) {
      total += this.estimateProviderTime(provider);
    }
    return total;
  }

  private estimateProviderCost(provider: string): number {
    const costs: Record<string, number> = {
      gemini: 0.01,
      nemotron: 0.02,
      opencode: 0,
    };
    return costs[provider] || 0.01;
  }

  private estimateProviderTime(provider: string): number {
    const times: Record<string, number> = {
      gemini: 5000,
      nemotron: 8000,
      opencode: 10000,
    };
    return times[provider] || 5000;
  }
}

export function createTaskPlanner(): TaskPlanner {
  return new TaskPlanner();
}

export { TaskType, AIProviderName } from '@vince-ai/shared';