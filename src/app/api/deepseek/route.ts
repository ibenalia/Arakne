import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Define types for the entity extraction (similar to those in deepseek-api.ts)
interface DeepSeekEntity {
  id?: string
  name: string
  type: string
  summary: string
  aliases: string[]
}

interface DeepSeekRelationship {
  source: string
  target: string
  strength: number
}

interface ExtractionResult {
  entities: DeepSeekEntity[]
  relationships: DeepSeekRelationship[]
}

// This is a server-side only route - the API key will not be exposed to the client
export async function POST(req: NextRequest) {
  try {
    // Get the request data
    const requestData = await req.json()
    const { text, previousResults, modelName, temperature, maxTokens } = requestData

    // Verify that required data is present
    if (!text) {
      return NextResponse.json(
        { error: 'Missing text parameter' },
        { status: 400 }
      )
    }

    // Initialize OpenAI client with server-side API key
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
    })

    // Build the prompt similar to what we do in the DeepSeekAnalyzer class
    const prompt = buildPrompt(text, previousResults)

    // Make the API request
    const response = await client.chat.completions.create({
      model: modelName || 'deepseek-chat',
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
      temperature: temperature !== undefined ? temperature : 0.2,
      max_tokens: maxTokens || 10000,
      response_format: { type: 'json_object' }
    })

    // Extract and validate response
    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No response received from DeepSeek' },
        { status: 500 }
      )
    }

    // Return the raw response to be processed on the client
    return NextResponse.json({ result: content })
  } catch (error: unknown) {
    console.error('DeepSeek API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

// Helper function to build the prompt
function buildPrompt(text: string, previousResults?: ExtractionResult) {
  const minifiedText = text // You could implement text minification here if needed
  
  const hasPreviousResults = previousResults && 
    (previousResults.entities?.length > 0 || previousResults.relationships?.length > 0);

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
    const simplifiedPreviousEntities = previousResults?.entities.map((e: DeepSeekEntity) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      summary: e.summary,
      aliases: e.aliases
    })) || [];
    
    const simplifiedPreviousRelationships = previousResults?.relationships.map((r: DeepSeekRelationship) => ({
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