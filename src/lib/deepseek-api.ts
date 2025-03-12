import { ExtractionResult, Entity, Relationship } from './entity-extraction'
import OpenAI from 'openai'

// Types for DeepSeek results
interface DeepSeekEntity {
  name: string
  type: string
  summary: string
}

interface DeepSeekRelationship {
  source: string
  target: string
  strength: number
}

interface DeepSeekResult {
  entities: DeepSeekEntity[]
  relationships: DeepSeekRelationship[]
}

// Configuration interface for DeepSeek API
interface DeepSeekConfig {
  apiKey: string
  modelName: 'deepseek-chat' | 'deepseek-coder' // Supported models
  temperature?: number
  maxTokens?: number
  previousResults?: ExtractionResult // Previous results to include
}

/**
 * Default configuration for DeepSeek API integration
 */
const defaultConfig: DeepSeekConfig = {
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
  modelName: 'deepseek-chat', // DeepSeek Chat model is recommended for its reasoning capabilities
  temperature: 0.2, // Low value for more deterministic results
  maxTokens: 4000, // Token limit for the response
  previousResults: { entities: [], relationships: [] } // No previous results by default
}

/**
 * DeepSeek API client for entity extraction and relationship analysis
 */
export class DeepSeekAnalyzer {
  private client: OpenAI
  private config: DeepSeekConfig

  constructor(config?: Partial<DeepSeekConfig>) {
    this.config = { ...defaultConfig, ...config }
    
    // Initialize OpenAI client compatible with DeepSeek API
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: 'https://api.deepseek.com/v1', // DeepSeek API base URL
      dangerouslyAllowBrowser: true
    })
  }

  /**
   * Analyzes text using DeepSeek API to extract entities and identify relationships,
   * taking into account previous results if available
   */
  async analyzeText(text: string): Promise<ExtractionResult> {
    try {
      const prompt = this.buildPrompt(text)
      
      const response = await this.client.chat.completions.create({
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in text analysis who accurately extracts named entities and their relationships. OSINT is your specialty.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      })

      // Extract and validate JSON response
      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response received from DeepSeek')
      }

      const result = JSON.parse(content) as DeepSeekResult
      
      // Verify the response has the expected format
      if (!result.entities || !Array.isArray(result.entities) || !result.relationships || !Array.isArray(result.relationships)) {
        throw new Error('Invalid response format from DeepSeek')
      }

      // Convert the result to the format expected by the application
      return this.formatResult(result)
    } catch (error) {
      console.error('Erreur lors de l\'analyse avec DeepSeek:', error)
      throw error
    }
  }

  /**
   * Builds the prompt for DeepSeek API, including previous results if available
   */
  private buildPrompt(text: string): string {
    // Preprocessing and minification of text to reduce tokens
    const minifiedText = this.minifyText(text);
    
    const hasPreviousResults = this.config.previousResults && 
      (this.config.previousResults.entities.length > 0 || this.config.previousResults.relationships.length > 0);

    let prompt = `
Analyze this text, extract entities+relationships:

Text:
${minifiedText}
`;

    // Add previous data if available
    if (hasPreviousResults) {
      // Optimization: Send only essential data from previous results
      const simplifiedPreviousEntities = this.config.previousResults?.entities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        summary: e.summary
      })) || [];
      
      const simplifiedPreviousRelationships = this.config.previousResults?.relationships.map(r => ({
        source: r.source,
        target: r.target,
        strength: r.strength
      })) || [];
      
      const simplifiedPrevious = {
        entities: simplifiedPreviousEntities,
        relationships: simplifiedPreviousRelationships
      };
      
      prompt += `
Previous-context:
${JSON.stringify(simplifiedPrevious)}

Rules: keep existing IDs, complete info, link new+existing entities, reuse ID patterns.
`;
    }

    prompt += `
Expected JSON format:
{"entities":[{"name":"EntityName","type":"EntityType","summary":"BriefSummary"}],"relationships":[{"source":"SourceEntity","target":"TargetEntity","strength":1-10}]}`;

    return prompt;
  }

  private minifyText(text: string): string {
    if (!text) return '';
    
    let result = text.replace(/\s+/g, ' ');
    
    const segments = new Map<string, number>();
    const words = result.split(' ');
    
    for (let i = 0; i < words.length - 5; i++) {
      const segment = words.slice(i, i + 5).join(' ');
      if (segment.length > 20) {
        segments.set(segment, (segments.get(segment) || 0) + 1);
      }
    }
    
    segments.forEach((count, segment) => {
      if (count > 2) {
        const regex = new RegExp(`(${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?:.*?\\1){2,}`, 'g');
        result = result.replace(regex, `$1 [repeated ${count} times]`);
      }
    });
    
    const abbreviations: [RegExp, string][] = [
      [/\b(c'est-à-dire|c'est à dire)\b/gi, 'càd'],
      [/\b(par exemple)\b/gi, 'ex:'],
      [/\b(notamment)\b/gi, 'not.'],
      [/\b(également)\b/gi, 'ég.'],
      [/\b(en ce qui concerne)\b/gi, 're:'],
      [/\b(particulièrement)\b/gi, 'part.'],
      [/\b(monsieur|madame|mademoiselle)\b/gi, 'M./Mme'],
      [/\b(corporation|incorporated|limited|company)\b/gi, 'Corp.']
    ];
    
    for (const [pattern, replacement] of abbreviations) {
      result = result.replace(pattern, replacement);
    }
    
    const entityKeywords = [
      'président', 'directeur', 'PDG', 'CEO', 'fondateur', 'créé', 'basé', 
      'siège', 'situé', 'personne', 'organisation', 'entreprise', 'société', 'groupe',
      'lieu', 'ville', 'pays', 'région', 'date', 'jour', 'mois', 'année', 'siècle'
    ];
    
    for (const keyword of entityKeywords) {
      const pattern = new RegExp(`[^.!?]*\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
      const matches = result.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const trimmed = match.trim();
          if (trimmed.length > 10) { 
            result = result.replace(match, `[!IMPORTANT!]${match}[!/IMPORTANT!]`);
          }
        }
      }
    }
    
    const MAX_LENGTH = 4000;
    if (result.length > MAX_LENGTH) {
      const firstPart = result.substring(0, MAX_LENGTH * 0.6);
      const lastPart = result.substring(result.length - MAX_LENGTH * 0.4);
      result = firstPart + " [...text truncated...] " + lastPart;
    }
    
    return result;
  }

  /**
   * Formats the DeepSeek result to match the application's expected format
   */
  private formatResult(result: DeepSeekResult): ExtractionResult {
    // Transform entities returned by DeepSeek to application format
    const entities: Entity[] = result.entities.map((entity: DeepSeekEntity) => ({
      id: `${this.getEntityTypePrefix(entity.type)}-${entity.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: entity.name,
      type: this.mapEntityType(entity.type),
      mentions: 1, // Default value, could be improved
      aliases: [],
      summary: entity.summary // Add summary provided by DeepSeek
    }))

    // Transform relationships returned by DeepSeek to application format
    const relationships: Relationship[] = result.relationships.map((rel: DeepSeekRelationship) => {
      // Find IDs of source and target entities
      const sourceEntity = entities.find(e => e.name === rel.source)
      const targetEntity = entities.find(e => e.name === rel.target)
      
      if (!sourceEntity || !targetEntity) {
        console.warn(`Relation ignored: ${rel.source} -> ${rel.target} (missing entity)`)
        return null
      }
      
      return {
        id: `rel-${sourceEntity.id}-${targetEntity.id}`,
        source: sourceEntity.id,
        target: targetEntity.id,
        strength: rel.strength
      }
    }).filter(Boolean) as Relationship[]

    return {
      entities,
      relationships
    }
  }

  /**
   * Maps DeepSeek entity type to application entity type
   */
  private mapEntityType(type: string): Entity['type'] {
    type = type.toLowerCase()
    if (type.includes('person')) return 'person'
    if (type.includes('org')) return 'organization'
    if (type.includes('loc')) return 'location'
    if (type.includes('date')) return 'date'
    return 'other'
  }

  /**
   * Gets entity type prefix for ID generation
   */
  private getEntityTypePrefix(type: string): string {
    type = type.toLowerCase()
    if (type.includes('person')) return 'person'
    if (type.includes('org')) return 'org'
    if (type.includes('loc')) return 'loc'
    if (type.includes('date')) return 'date'
    return 'other'
  }
}

/**
 * Factory function to create a DeepSeek analyzer instance
 */
export function createDeepSeekAnalyzer(config?: Partial<DeepSeekConfig>): DeepSeekAnalyzer {
  return new DeepSeekAnalyzer(config)
} 