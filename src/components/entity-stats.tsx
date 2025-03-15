"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Entity, EntityType, Relationship } from '@/lib/entity-extraction'

interface EntityStatsProps {
  entities: Entity[]
  relationships: Relationship[]
  onEntityClick?: (entityName: string, entityType: EntityType) => void
}

/**
 * Component for visualizing entity statistics
 */
export function EntityStats({ entities, relationships, onEntityClick }: EntityStatsProps) {
  // Colors for different entity types
  const typeColors: Record<EntityType, string> = {
    'person': '#3b82f6',       // Blue
    'organization': '#ef4444', // Red
    'location': '#10b981',     // Green
    'date': '#f59e0b',         // Amber
    'other': '#6b7280'         // Gray
  }

  // Calculate relationship strength for each entity
  const entityStrengths = entities.map(entity => {
    // Find all relationships where this entity is involved
    const entityRelations = relationships.filter(
      rel => rel.source === entity.id || rel.target === entity.id
    )
    
    // Calculate total strength
    const totalStrength = entityRelations.reduce((acc, rel) => acc + rel.strength, 0)
    
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      value: totalStrength,
      color: typeColors[entity.type]
    }
  }).sort((a, b) => b.value - a.value)

  // Calculate relative weight of each entity (number of connections)
  const entityConnections = entities.map(entity => {
    // Find all relationships where this entity is involved
    const connectionCount = relationships.filter(
      rel => rel.source === entity.id || rel.target === entity.id
    ).length
    
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      value: connectionCount,
      color: typeColors[entity.type]
    }
  }).sort((a, b) => b.value - a.value)

  // Function to generate horizontal bar chart
  const renderBarChart = (data: { id: string; name: string; type: EntityType; value: number; color: string }[]) => {
    // Take only top 10 for visibility
    const topItems = data.slice(0, 10)
    
    // Find maximum value for scaling
    const maxValue = Math.max(...topItems.map(item => item.value), 1)
    
    // Don't render if no data
    if (topItems.length === 0) {
      return (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          No data to display
        </div>
      )
    }
    
    return (
      <div className="space-y-2">
        {topItems.map(item => (
          <div key={item.id} className="relative">
            <div className="flex items-center justify-between mb-1">
              <button 
                className="text-sm font-medium hover:underline text-left truncate max-w-[70%]"
                onClick={() => onEntityClick && onEntityClick(item.name, item.type)}
                title={item.name}
              >
                {item.name}
              </button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.value}</span>
            </div>
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
              <div 
                className="h-full rounded"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`, 
                  backgroundColor: item.color,
                  minWidth: '2px' // Ensure very small values are still visible
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // If no data, display a message
  if (entities.length === 0) {
    return (
      <Card className="border dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Entity Statistics</CardTitle>
          <CardDescription>
            No entities to analyze yet
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 text-zinc-500 dark:text-zinc-400">
          Analyze text, documents, or images to see entity statistics here.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border dark:border-zinc-800">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-xl">Entity Statistics</CardTitle>
        <CardDescription>
          Visualize entity connections and relationship strength
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connections">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="strength">Relationship Strength</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connections" className="pt-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Number of connections each entity has with others
            </div>
            {renderBarChart(entityConnections)}
          </TabsContent>
          
          <TabsContent value="strength" className="pt-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Total relationship strength for each entity
            </div>
            {renderBarChart(entityStrengths)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 