import { ExtractionResult } from './entity-extraction';

/**
 * Type defining a pending analysis task
 */
export interface AnalysisTask {
  id: string;
  type: 'text' | 'document' | 'image';
  content: string | File;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ExtractionResult;
  error?: string;
}

/**
 * Callback function executed when a task is completed
 */
export type TaskCompletionCallback = (task: AnalysisTask) => void;

/**
 * Queue service to manage sequential analyses
 */
export class AnalysisQueueService {
  private queue: AnalysisTask[] = [];
  private taskHistory: AnalysisTask[] = [];
  private currentTask: AnalysisTask | null = null;
  private isProcessing = false;
  private onTaskCompletedCallbacks: TaskCompletionCallback[] = [];
  private onQueueChangedCallbacks: (() => void)[] = [];
  private previousResults: ExtractionResult = { entities: [], relationships: [] };

  /**
   * Adds a task to the queue
   */
  public addTask(type: 'text' | 'document' | 'image', content: string | File): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const task: AnalysisTask = {
      id,
      type,
      content,
      timestamp: Date.now(),
      status: 'pending',
    };
    
    this.queue.push(task);
    this.taskHistory.unshift(task); // Add to history in reverse order (newest first)
    this.notifyQueueChanged();
    
    // Start processing if no task is currently running
    if (!this.isProcessing) {
      this.processNextTask();
    }
    
    return id;
  }

  /**
   * Returns all tasks in the queue and history
   */
  public getTasks(): AnalysisTask[] {
    // Return active queue items first, then history items
    const activeQueue = this.queue.filter(task => 
      task.status === 'pending' || task.status === 'processing'
    );
    
    // Combine active queue with history, avoiding duplicates by checking IDs
    const activeIds = new Set(activeQueue.map(task => task.id));
    const historyWithoutActive = this.taskHistory.filter(task => !activeIds.has(task.id));
    
    return [...activeQueue, ...historyWithoutActive];
  }

  /**
   * Processes the next task in the queue
   */
  private async processNextTask(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }
    
    // Find the first pending task
    const pendingTaskIndex = this.queue.findIndex(task => task.status === 'pending');
    if (pendingTaskIndex === -1) {
      return; // No pending tasks
    }
    
    this.isProcessing = true;
    this.currentTask = this.queue[pendingTaskIndex];
    this.currentTask.status = 'processing';
    
    // Update the task in history too
    const historyIndex = this.taskHistory.findIndex(task => task.id === this.currentTask!.id);
    if (historyIndex !== -1) {
      this.taskHistory[historyIndex].status = 'processing';
    }
    
    this.notifyQueueChanged();
    
    try {
      // This function will be implemented by specific analyzers
      // using the previous context (this.previousResults)
      await this.processTask(this.currentTask);
      
      this.currentTask.status = 'completed';
      
      // Update the task in history too
      if (historyIndex !== -1) {
        this.taskHistory[historyIndex].status = 'completed';
        if (this.currentTask.result) {
          this.taskHistory[historyIndex].result = this.currentTask.result;
        }
      }
      
      // Notify subscribers that the task is completed
      this.notifyTaskCompleted(this.currentTask);
      
      // If the task produced a result, save it for the next task
      if (this.currentTask.result) {
        this.previousResults = this.mergeResults(this.previousResults, this.currentTask.result);
      }
    } catch (error) {
      console.error('Error processing task:', error);
      if (this.currentTask) {
        this.currentTask.status = 'failed';
        this.currentTask.error = error instanceof Error ? error.message : String(error);
        
        // Update the task in history too
        if (historyIndex !== -1) {
          this.taskHistory[historyIndex].status = 'failed';
          this.taskHistory[historyIndex].error = this.currentTask.error;
        }
      }
    } finally {
      this.isProcessing = false;
      this.currentTask = null;
      this.notifyQueueChanged();
      
      // Process the next task if there is one
      const nextPendingTask = this.queue.find(task => task.status === 'pending');
      if (nextPendingTask) {
        this.processNextTask();
      }
    }
  }

  /**
   * Processes a specific task (will be replaced by the actual implementation)
   */
  private async processTask(task: AnalysisTask): Promise<void> {
    // This method will be overridden by specific analyzers
    // Default implementation that does nothing but uses the parameter to avoid linter error
    console.log(`Default processing of task ${task.id} of type ${task.type}`);
    throw new Error('Method not implemented');
  }

  /**
   * Merges previous results with new results
   */
  private mergeResults(previous: ExtractionResult, current: ExtractionResult): ExtractionResult {
    // Combine entities and avoid duplicates
    const entitiesMap = new Map<string, typeof previous.entities[0]>();
    
    // First add previous entities
    previous.entities.forEach(entity => {
      entitiesMap.set(entity.id, { ...entity });
    });
    
    // Add or update with new entities
    current.entities.forEach(entity => {
      if (entitiesMap.has(entity.id)) {
        const existingEntity = entitiesMap.get(entity.id)!;
        // Update aliases
        existingEntity.aliases = [...new Set([...existingEntity.aliases, ...entity.aliases])];
        // Update summary if it's more detailed
        if (entity.summary && (!existingEntity.summary || entity.summary.length > existingEntity.summary.length)) {
          existingEntity.summary = entity.summary;
        }
      } else {
        entitiesMap.set(entity.id, { ...entity });
      }
    });
    
    // Combine relationships and update strengths
    const relationshipsMap = new Map<string, typeof previous.relationships[0]>();
    
    // First add previous relationships
    previous.relationships.forEach(rel => {
      relationshipsMap.set(rel.id, { ...rel });
    });
    
    // Add or update with new relationships
    current.relationships.forEach(rel => {
      if (relationshipsMap.has(rel.id)) {
        const existingRel = relationshipsMap.get(rel.id)!;
        // Strengthen the relationship if detected again
        existingRel.strength = Math.min(10, existingRel.strength + rel.strength * 0.5);
      } else {
        relationshipsMap.set(rel.id, { ...rel });
      }
    });
    
    return {
      entities: Array.from(entitiesMap.values()),
      relationships: Array.from(relationshipsMap.values())
    };
  }

  /**
   * Subscribes to task completion notifications
   */
  public onTaskCompleted(callback: TaskCompletionCallback): () => void {
    this.onTaskCompletedCallbacks.push(callback);
    return () => {
      this.onTaskCompletedCallbacks = this.onTaskCompletedCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribes to queue change notifications
   */
  public onQueueChanged(callback: () => void): () => void {
    this.onQueueChangedCallbacks.push(callback);
    return () => {
      this.onQueueChangedCallbacks = this.onQueueChangedCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notifies subscribers that a task is completed
   */
  private notifyTaskCompleted(task: AnalysisTask): void {
    this.onTaskCompletedCallbacks.forEach(callback => callback(task));
  }

  /**
   * Notifies subscribers that the queue has changed
   */
  private notifyQueueChanged(): void {
    this.onQueueChangedCallbacks.forEach(callback => callback());
  }

  /**
   * Retrieves the cumulative results of all previous analyses
   */
  public getPreviousResults(): ExtractionResult {
    return { ...this.previousResults };
  }

  /**
   * Resets the previous results
   */
  public resetPreviousResults(): void {
    this.previousResults = { entities: [], relationships: [] };
    this.notifyQueueChanged();
  }
}

// Global singleton for the queue service
export const queueService = new AnalysisQueueService(); 