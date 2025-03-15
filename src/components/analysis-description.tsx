"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExtractionResult } from "@/lib/entity-extraction"
import { queueService } from "@/lib/queue-service"

interface AnalysisDescriptionProps {
  entities: ExtractionResult['entities']
  relationships: ExtractionResult['relationships']
}

/**
 * Component that displays a description of the current analysis state
 * provided by DeepSeek
 */
export function AnalysisDescription({ entities, relationships }: AnalysisDescriptionProps) {
  const [description, setDescription] = useState<string>("")
  
  // Generate a description from the entities and relationships
  useEffect(() => {
    if (entities.length === 0) {
      setDescription("No entities detected. Please submit content for analysis.")
      return
    }
    
    // Group entities by type
    const entityTypeCount: Record<string, number> = {}
    entities.forEach(entity => {
      entityTypeCount[entity.type] = (entityTypeCount[entity.type] || 0) + 1
    })
    
    // Get summaries from entities
    const summaries = entities
      .filter(entity => entity.summary)
      .map(entity => `${entity.name} (${entity.type}): ${entity.summary}`)
      .slice(0, 3) // Limit to 3 most important entities
    
    // Create a description
    let desc = `Analysis containing ${entities.length} entities and ${relationships.length} relationships. `
    
    // Add entity type breakdown
    desc += "Entity types: " + Object.entries(entityTypeCount)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(", ") + ". "
    
    // Add summaries if available
    if (summaries.length > 0) {
      desc += "\n\nMain entities:\n" + summaries.join("\n")
    }
    
    setDescription(desc)
  }, [entities, relationships])
  
  // Listen for task completion to update the description
  useEffect(() => {
    const unsubscribe = queueService.onTaskCompleted((task) => {
      if (task.status === 'completed' && task.result) {
        // When a task completes, we might want to add information about the latest analysis
        if (task.type) {
          setDescription(prev => {
            if (!prev.includes("Latest analysis:")) {
              return prev + `\n\nLatest analysis: ${task.type} (${new Date().toLocaleTimeString()})`
            }
            // Update the time of the latest analysis
            return prev.replace(
              /Latest analysis:.*/,
              `Latest analysis: ${task.type} (${new Date().toLocaleTimeString()})`
            )
          })
        }
      }
    })
    
    return unsubscribe
  }, [])
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analysis Description</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm">{description}</pre>
      </CardContent>
    </Card>
  )
} 