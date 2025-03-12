import { AnalysisTask, queueService } from './queue-service'
import { createDeepSeekAnalyzer } from './deepseek-api'
import { ExtractionResult } from './entity-extraction'

/**
 * Adapter for processing text analyses via the queue service
 */
export class TextAnalysisAdapter {
  /**
   * Adds a text analysis to the queue
   */
  static queueTextAnalysis(text: string): string {
    return queueService.addTask('text', text)
  }
  
  /**
   * Processes a text analysis task
   */
  static async processTextAnalysis(task: AnalysisTask): Promise<ExtractionResult> {
    if (task.type !== 'text') {
      throw new Error('Unsupported task type')
    }
    
    const text = task.content as string
    
    // Retrieve previous results
    const previousResults = queueService.getPreviousResults()
    
    // Create analyzer with previous context
    const analyzer = createDeepSeekAnalyzer({
      modelName: 'deepseek-chat',
      previousResults
    })
    
    // Analyze the text
    const result = await analyzer.analyzeText(text)
    
    // Store the result in the task
    task.result = result
    
    return result
  }
}

/**
 * Adapter for processing document analyses via the queue service
 */
export class DocumentAnalysisAdapter {
  /**
   * Adds a document analysis to the queue
   */
  static queueDocumentAnalysis(file: File): string {
    return queueService.addTask('document', file)
  }
  
  /**
   * Processes a document analysis task
   */
  static async processDocumentAnalysis(task: AnalysisTask): Promise<ExtractionResult> {
    if (task.type !== 'document') {
      throw new Error('Unsupported task type')
    }
    
    const file = task.content as File
    
    // Future logic to extract text from document
    // For now, we simply use the filename as a demonstration
    const extractedText = `Analyzed document: ${file.name}`
    
    // Retrieve previous results
    const previousResults = queueService.getPreviousResults()
    
    // Create analyzer with previous context
    const analyzer = createDeepSeekAnalyzer({
      modelName: 'deepseek-chat',
      previousResults
    })
    
    // Analyze the extracted text
    const result = await analyzer.analyzeText(extractedText)
    
    // Store the result in the task
    task.result = result
    
    return result
  }
}

/**
 * Adapter for processing image analyses via the queue service
 */
export class ImageAnalysisAdapter {
  /**
   * Adds an image analysis to the queue
   */
  static queueImageAnalysis(file: File): string {
    return queueService.addTask('image', file)
  }
  
  /**
   * Processes an image analysis task
   */
  static async processImageAnalysis(task: AnalysisTask): Promise<ExtractionResult> {
    if (task.type !== 'image') {
      throw new Error('Unsupported task type')
    }
    
    const file = task.content as File
    
    // Future logic to analyze the image
    // For now, we simply use the filename as a demonstration
    const extractedText = `Analyzed image: ${file.name}`
    
    // Retrieve previous results
    const previousResults = queueService.getPreviousResults()
    
    // Create analyzer with previous context
    const analyzer = createDeepSeekAnalyzer({
      modelName: 'deepseek-chat',
      previousResults
    })
    
    // Analyze the extracted text
    const result = await analyzer.analyzeText(extractedText)
    
    // Store the result in the task
    task.result = result
    
    return result
  }
}

/**
 * Initialize queue processors for the queue service
 */
export function initializeQueueProcessors(): void {
  // Replace the processTask method of the queue service
  queueService['processTask'] = async (task: AnalysisTask): Promise<void> => {
    try {
      let result: ExtractionResult
      
      // Process based on task type
      switch (task.type) {
        case 'text':
          result = await TextAnalysisAdapter.processTextAnalysis(task)
          break
        case 'document':
          result = await DocumentAnalysisAdapter.processDocumentAnalysis(task)
          break
        case 'image':
          result = await ImageAnalysisAdapter.processImageAnalysis(task)
          break
        default:
          throw new Error(`Unsupported task type: ${task.type}`)
      }
      
      task.result = result
    } catch (error) {
      console.error('Error processing task:', error)
      throw error
    }
  }
}

// Initialize processors at startup
initializeQueueProcessors() 