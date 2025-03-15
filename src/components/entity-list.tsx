"use client"

import { useState, useEffect, useRef } from 'react'
import { Entity, EntityType } from '@/lib/entity-extraction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface EntityListProps {
  entities: Entity[]
  selectedEntity?: { name: string; type: EntityType }
  initialActiveTab?: TabValue
}

type TabValue = 'all' | 'person' | 'organization' | 'location' | 'date' | 'other'

/**
 * Component for displaying extracted entities as a categorized list
 */
export function EntityList({ entities, selectedEntity, initialActiveTab = 'all' }: EntityListProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(initialActiveTab)
  const selectedEntityRef = useRef<HTMLDivElement>(null)
  
  // Group entities by type
  const people = entities.filter(entity => entity.type === 'person')
  const organizations = entities.filter(entity => entity.type === 'organization')
  const locations = entities.filter(entity => entity.type === 'location')
  const dates = entities.filter(entity => entity.type === 'date')
  const others = entities.filter(entity => entity.type === 'other')
  
  // Effect to handle when selectedEntity changes - update active tab and scroll to entity
  useEffect(() => {
    if (selectedEntity) {
      // Set the active tab based on the entity type
      setActiveTab(selectedEntity.type === 'other' ? 'other' : selectedEntity.type)
      
      // Allow time for the component to update before scrolling
      setTimeout(() => {
        if (selectedEntityRef.current) {
          selectedEntityRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add a highlight effect
          selectedEntityRef.current.classList.add('bg-primary/10')
          setTimeout(() => {
            if (selectedEntityRef.current) {
              selectedEntityRef.current.classList.remove('bg-primary/10')
            }
          }, 2000)
        }
      }, 100)
    }
  }, [selectedEntity])

  // Function to set the ref for the selected entity
  const setSelectedRef = (element: HTMLDivElement | null) => {
    if (element) {
      selectedEntityRef.current = element
    }
  }
  
  // Determine which entities to show based on active tab
  const getEntitiesForTab = (tab: TabValue) => {
    switch(tab) {
      case 'all': return entities
      case 'person': return people
      case 'organization': return organizations
      case 'location': return locations
      case 'date': return dates
      case 'other': return others
      default: return entities
    }
  }
  
  return (
    <Card className="border dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-xl">Extracted Entities</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full">
          <div className="flex overflow-x-auto border-b dark:border-zinc-800 px-2">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'all' ? 'border-b-2 border-primary text-primary dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
            >
              All ({entities.length})
            </button>
            <button 
              onClick={() => setActiveTab('person')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'person' ? 'border-b-2 border-primary text-primary dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
            >
              People ({people.length})
            </button>
            <button 
              onClick={() => setActiveTab('organization')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'organization' ? 'border-b-2 border-primary text-primary dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
            >
              Orgs ({organizations.length})
            </button>
            <button 
              onClick={() => setActiveTab('location')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'location' ? 'border-b-2 border-primary text-primary dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
            >
              Locs ({locations.length})
            </button>
            <button 
              onClick={() => setActiveTab('date')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'date' ? 'border-b-2 border-primary text-primary dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
            >
              Dates ({dates.length})
            </button>
            <button 
              onClick={() => setActiveTab('other')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'other' ? 'border-b-2 border-primary text-primary dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
            >
              Others ({others.length})
            </button>
          </div>
          
          <div className="p-4 max-h-[400px] h-[400px] overflow-y-auto custom-scrollbar">
            {renderEntityList(getEntitiesForTab(activeTab), selectedEntity, setSelectedRef)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Gets a user-friendly label for an entity type
 */
function getEntityTypeLabel(type: Entity['type']): string {
  switch (type) {
    case 'person': return 'Person'
    case 'organization': return 'Organization'
    case 'location': return 'Location'
    case 'date': return 'Date'
    case 'other': return 'Other'
    default: return type
  }
}

/**
 * Gets a color class for an entity type
 */
function getEntityTypeColor(type: Entity['type']): string {
  switch (type) {
    case 'person': return 'bg-blue-500'
    case 'organization': return 'bg-green-500'
    case 'location': return 'bg-amber-500'
    case 'date': return 'bg-purple-500'
    case 'other': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}

/**
 * Helper function to render a list of entities
 */
function renderEntityList(
  entities: Entity[], 
  selectedEntity?: { name: string; type: EntityType },
  setRef?: (node: HTMLDivElement | null) => void
) {
  if (entities.length === 0) {
    return (
      <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
        No entities found in this category
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {entities.map(entity => {
        const isSelected = selectedEntity && 
          selectedEntity.name === entity.name && 
          selectedEntity.type === entity.type

        return (
          <div 
            key={entity.id}
            ref={isSelected && setRef ? setRef : null}
            className="p-3 border rounded-md dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{entity.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {getEntityTypeLabel(entity.type)}
                </p>
              </div>
              <div className={`w-2 h-2 rounded-full ${getEntityTypeColor(entity.type)}`} />
            </div>
            
            {entity.summary && (
              <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 border-t dark:border-zinc-800 pt-2">
                <p>{entity.summary}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
} 