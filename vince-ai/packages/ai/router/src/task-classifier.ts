import { TaskType } from '@vince-ai/shared';

/**
 * Task Classifier for AI Router
 * Classifies user requests into task types for routing
 */

export class TaskClassifier {
  private static readonly KEYWORDS: Record<string, string[]> = {
    script_generation: [
      'script', 'video script', 'screenplay', 'dialogue', 'scene',
      'write script', 'create script', 'generate script',
      'youtube script', 'tiktok script', 'reels script',
    ],
    research: [
      'research', 'find', 'search', 'investigate', 'analyze data',
      'study', 'look up', 'gather information', 'fact finding',
    ],
    creative_content: [
      'creative', 'story', 'write', 'brainstorm', 'ideas', 'imagine',
      'creative writing', 'fiction', 'narrative', 'poem',
    ],
    marketing_strategy: [
      'marketing', 'campaign', 'strategy', 'promote', 'advertise',
      'brand', 'marketing plan', 'go to market', 'launch',
    ],
    caption: [
      'caption', 'hashtag', 'instagram', 'tiktok', 'social media post',
      'post caption', 'ig caption', 'social caption',
    ],
    product_analysis: [
      'product', 'review', 'analyze product', 'compare', 'vs', 'versus',
      'product review', 'product comparison', 'features', 'specs',
    ],
    visual_analysis: [
      'analyze image', 'describe image', 'what is in this image',
      'look at this image', 'image analysis', 'image description',
    ],
    video_qa: [
      'check video', 'video quality', 'video issues', 'check quality',
      'video review', 'video audit', 'video problems',
    ],
    video_generation: [
      'generate video', 'create video', 'make video', 'produce video',
      'video generation', 'ai video', 'text to video',
    ],
    image_generation: [
      'generate image', 'create image', 'make image', 'draw',
      'image generation', 'ai art', 'text to image',
    ],
    audio_generation: [
      'voice', 'speech', 'tts', 'text to speech', 'narration',
      'voiceover', 'audio generation', 'speech synthesis',
    ],
    translation: [
      'translate', 'in english', 'in vietnamese', 'convert to',
      'translation', 'localize',
    ],
    summarization: [
      'summarize', 'summary', 'tldr', 'brief', 'summarize',
      'key points', 'main points',
    ],
    fact_check: [
      'fact check', 'verify', 'true or false', 'accurate',
      'fact-check', 'verify claim', 'is this true',
    ],
    coding: [
      'code', 'program', 'function', 'debug', 'api', 'script',
      'algorithm', 'implement', 'refactor', 'optimize',
    ],
    reasoning: [
      'why', 'how', 'explain', 'reason', 'logic', 'analyze',
      'think through', 'reason through', 'deduce',
    ],
    planning: [
      'plan', 'schedule', 'roadmap', 'timeline', 'strategy', 'steps',
      'project plan', 'action plan', 'milestones',
    ],
  } as const;

  /**
   * Classifies a prompt into a task type using keyword matching
   */
  classify(prompt: string): TaskType {
    const lowerPrompt = prompt.toLowerCase();
    
    // Score each task type based on keyword matches
    const scores: Record<string, number> = {};
    
    for (const [task, keywords] of Object.entries(this.KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          // Longer keywords get higher weight
          score += keyword.length;
        }
      }
      scores[task] = score;
    }

    // Find the task with highest score
    let bestTask: TaskType = 'reasoning';
    let bestScore = 0;
    
    for (const [task, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestTask = task as TaskType;
      }
    }

    return bestTask;
  }

  /**
   * Gets all keywords for a specific task type
   */
  getKeywords(task: string): string[] {
    return this.KEYWORDS[task as keyof typeof this.KEYWORDS] || [];
  }

  /**
   * Adds custom keywords for a task type
   */
  addKeywords(task: string, keywords: string[]): void {
    if (!this.KEYWORDS[task]) {
      (this.KEYWORDS as any)[task] = [];
    }
    (this.KEYWORDS as any)[task].push(...keywords);
  }
}

export const taskClassifier = new TaskClassifier();