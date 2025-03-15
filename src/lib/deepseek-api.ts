import { ExtractionResult, Entity, Relationship } from './entity-extraction'
import OpenAI from 'openai'

// Types for DeepSeek results
interface DeepSeekEntity {
  name: string
  type: string
  aliases: string[]
  summary: string
  // mentions field removed as we'll count them locally
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
  apiKey?: string // Made optional since we'll use server-side API
  modelName: 'deepseek-chat' | 'deepseek-coder' // Supported models
  temperature?: number
  maxTokens?: number
  previousResults?: ExtractionResult // Previous results to include
}

/**
 * Default configuration for DeepSeek API integration
 */
const defaultConfig: DeepSeekConfig = {
  // Removed API key from client-side code
  modelName: 'deepseek-chat', // DeepSeek Chat model is recommended for its reasoning capabilities
  temperature: 0.2, // Low value for more deterministic results
  maxTokens: 8192, // Token limit for the response
  previousResults: { entities: [], relationships: [] } // No previous results by default
}

/**
 * DeepSeek API client for entity extraction and relationship analysis
 */
export class DeepSeekAnalyzer {
  private client: OpenAI | null = null
  private config: DeepSeekConfig

  constructor(config?: Partial<DeepSeekConfig>) {
    this.config = { ...defaultConfig, ...config }
    
    // Initialize OpenAI client only if SERVER_ONLY_DEEPSEEK is false and we're running on server
    if (typeof window === 'undefined' && process.env.SERVER_ONLY_DEEPSEEK !== 'true' && this.config.apiKey) {
      // Initialize OpenAI client compatible with DeepSeek API (server-side only)
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'
      })
    }
  }

  /**
   * Analyzes text using DeepSeek API to extract entities and identify relationships,
   * taking into account previous results if available
   */
  async analyzeText(text: string): Promise<ExtractionResult> {
    try {
      // Check if we're using server-side API directly or going through our API route
      if (this.client) {
        // Original direct API call (server-side only)
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
      } else {
        // Client-side path: Call our server-side API route that keeps the API key private
        const response = await fetch('/api/deepseek', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            previousResults: this.config.previousResults,
            modelName: this.config.modelName,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error calling DeepSeek API')
        }

        const responseData = await response.json()
        const result = JSON.parse(responseData.result) as DeepSeekResult

        // Convert the result to the format expected by the application
        return this.formatResult(result)
      }
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
Analyze this text thoroughly to extract named entities and their relationships for OSINT purposes:

Text:
${minifiedText}

For each entity, I need:
1. Name: The primary name of the entity
2. Type: Classify as "person", "organization", "location", "date", or "other"
3. Aliases: Alternative names or references to this entity found in the text
4. Summary: A brief description/summary of this entity based on context (2-3 sentences)

For relationships between entities:
1. Source: Name of the first entity
2. Target: Name of the second entity
3. Strength: A numerical value from 1-10 indicating relationship strength
   - Consider frequency of co-occurrence in the same context
   - Consider the semantic connection strength between entities
   - Higher values (8-10) indicate very strong/direct connections
   - Medium values (4-7) indicate moderate connections
   - Lower values (1-3) indicate weak or inferred connections

Be comprehensive and accurate:
- Extract ALL significant entities, not just prominent ones
- Be accurate with entity types
- Try to find meaningful connections between entities
- Identify any alternative names/aliases for each entity
`;

    // Add previous data if available
    if (hasPreviousResults) {
      // Optimization: Send only essential data from previous results
      const simplifiedPreviousEntities = this.config.previousResults?.entities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        summary: e.summary,
        aliases: e.aliases
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
Previous analysis context:
${JSON.stringify(simplifiedPrevious)}

When incorporating the previous context:
- Keep existing entity IDs for continuing entities
- Update or add to information for existing entities (improve summary, add aliases)
- Add new entities you discover
- Maintain existing relationship IDs when applicable
- Reconsider relationship strengths based on new information
- Create new relationships between existing and new entities as appropriate
`;
    }

    prompt += `
Expected JSON format:
{
  "entities": [
    {
      "name": "EntityName",
      "type": "person|organization|location|date|other",
      "aliases": ["Nickname", "Alternate Reference"],
      "summary": "Brief description based on the context"
    }
  ],
  "relationships": [
    {
      "source": "SourceEntityName",
      "target": "TargetEntityName",
      "strength": 1-10
    }
  ]
}`;

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
    
    const MAX_LENGTH = 10000;
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
    const entities: Entity[] = result.entities.map((entity: DeepSeekEntity) => {
      return {
        id: `${this.getEntityTypePrefix(entity.type)}-${entity.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: entity.name,
        type: this.mapEntityType(entity.type),
        aliases: entity.aliases || [], // Use aliases if provided
        summary: entity.summary // Add summary provided by DeepSeek
      };
    });

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