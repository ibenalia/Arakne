"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Entity, EntityType, Relationship } from '@/lib/entity-extraction'

interface EntityStatsProps {
  entities: Entity[]
  relationships: Relationship[]
}

/**
 * Component for visualizing entity statistics
 */
export function EntityStats({ entities, relationships }: EntityStatsProps) {
  // Couleurs pour les différents types d'entités
  const typeColors: Record<EntityType, string> = {
    'person': '#3b82f6',       // Blue
    'organization': '#ef4444', // Red
    'location': '#10b981',     // Green
    'date': '#f59e0b',         // Amber
    'other': '#6b7280'         // Gray
  }

  // Calculer les statistiques d'occurrence pour chaque entité
  const entityOccurrences = entities.map(entity => ({
    name: entity.name,
    type: entity.type,
    value: entity.mentions,
    color: typeColors[entity.type]
  })).sort((a, b) => b.value - a.value)

  // Calculer la force de relation pour chaque entité
  const entityStrengths = entities.map(entity => {
    // Trouver toutes les relations où cette entité est impliquée
    const entityRelations = relationships.filter(
      rel => rel.source === entity.id || rel.target === entity.id
    )
    
    // Calculer la force totale
    const totalStrength = entityRelations.reduce((acc, rel) => acc + rel.strength, 0)
    
    return {
      name: entity.name,
      type: entity.type,
      value: totalStrength,
      color: typeColors[entity.type]
    }
  }).sort((a, b) => b.value - a.value)

  // Calculer le poids relatif de chaque entité (nombre de connexions)
  const entityConnections = entities.map(entity => {
    // Trouver toutes les relations où cette entité est impliquée
    const connectionCount = relationships.filter(
      rel => rel.source === entity.id || rel.target === entity.id
    ).length
    
    return {
      name: entity.name,
      type: entity.type,
      value: connectionCount,
      color: typeColors[entity.type]
    }
  }).sort((a, b) => b.value - a.value)

  // Fonction pour générer les barres horizontales du graphique
  const renderBarChart = (data: { name: string; type: string; value: number; color: string }[]) => {
    // Calculer la valeur maximale pour normaliser les largeurs
    const maxValue = Math.max(...data.map(item => item.value), 1)
    
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-1/3 text-sm truncate" title={item.name}>
              {item.name}
            </div>
            <div className="w-2/3 flex items-center space-x-2">
              <div 
                className="h-6 rounded-sm transition-all duration-500 flex items-center px-2"
                style={{ 
                  width: `${Math.max((item.value / maxValue) * 100, 5)}%`,
                  backgroundColor: item.color
                }}
              >
                <span className="text-xs text-white font-medium truncate">
                  {item.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Si aucune donnée, afficher un message
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
      <CardHeader>
        <CardTitle>Entity Statistics</CardTitle>
        <CardDescription>
          Visualize entity frequency, connections, and relationship strength
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="occurrences">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="occurrences">Occurrences</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="strength">Relationship Strength</TabsTrigger>
          </TabsList>
          
          <TabsContent value="occurrences" className="pt-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Number of times each entity is mentioned in the text
            </div>
            {renderBarChart(entityOccurrences)}
          </TabsContent>
          
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