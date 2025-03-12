"use client"

import { useEffect, useRef, useState } from 'react'
import { Entity, Relationship } from '@/lib/entity-extraction'

interface EntityGraphProps {
  entities: Entity[]
  relationships: Relationship[]
}

/**
 * Component for visualizing entity relationships as an interactive graph
 * Displays entities as nodes and relationships as edges in a force-directed or hierarchical layout.
 * Uses vis-network for rendering and Font Awesome for icons.
 */
export function EntityGraph({ entities, relationships }: EntityGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  // Add state for hierarchical layout - default to true to start with hierarchical view
  const [isHierarchical, setIsHierarchical] = useState(true)
  // Add loading state for Font Awesome
  const [iconsLoaded, setIconsLoaded] = useState(false)
  
  // Preload Font Awesome upfront with a better loading strategy
  useEffect(() => {
    const fontAwesomeLink = document.querySelector('link[href*="fontawesome"]');
    if (!fontAwesomeLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      
      // Set up onload handler to track when icons are ready
      link.onload = () => {
        setIconsLoaded(true);
      };
      
      // Handle case where Font Awesome is already cached
      if (document.fonts) {
        document.fonts.ready.then(() => {
          setIconsLoaded(true);
        });
      }
      
      // Add with high priority
      document.head.insertBefore(link, document.head.firstChild);
    } else {
      // Font Awesome is already loaded
      setIconsLoaded(true);
    }
  }, []);
  
  // Check and track dark mode
  useEffect(() => {
    // Initial check
    setIsDarkMode(document.documentElement.classList.contains('dark'))
    
    // Create observer to watch for changes to the classList
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'))
        }
      })
    })
    
    // Start observing
    observer.observe(document.documentElement, { attributes: true })
    
    return () => observer.disconnect()
  }, [])
  
  // Icon configurations object - defined outside the effect to avoid recreating on each render
  const iconConfig = {
    person: {
      code: '\uf007', // person icon
      darkColor: '#60a5fa',
      lightColor: '#3b82f6'
    },
    organization: {
      code: '\uf1ad', // building icon
      darkColor: '#f87171',
      lightColor: '#ef4444'
    },
    location: {
      code: '\uf3c5', // map-marker icon
      darkColor: '#34d399',
      lightColor: '#10b981'
    },
    date: {
      code: '\uf073', // calendar icon
      darkColor: '#fbbf24',
      lightColor: '#f59e0b'
    },
    other: {
      code: '\uf111', // circle icon
      darkColor: '#9ca3af',
      lightColor: '#6b7280'
    }
  };
  
  // Helper function to get icon configuration based on entity type
  function getIconForEntityType(type: string, isDark: boolean) {
    const typeKey = type.toLowerCase() as keyof typeof iconConfig;
    const config = iconConfig[typeKey] || iconConfig.other;
    
    return {
      face: 'FontAwesome',
      code: config.code,
      size: 50,
      color: isDark ? config.darkColor : config.lightColor
    };
  }
  
  useEffect(() => {
    if (!containerRef.current || !iconsLoaded) return
    
    // Si aucune entité, ne pas tenter de créer un graphe
    if (entities.length === 0) {
      // Nettoyer le conteneur si nécessaire
      if (containerRef.current.firstChild) {
        containerRef.current.innerHTML = '';
      }
      return;
    }
    
    // Dynamically import vis-network to avoid SSR issues
    const importVisNetwork = async () => {
      try {
        const vis = await import('vis-network/standalone')
        const { Network, DataSet } = vis
        
        // Create nodes dataset
        const nodes = new DataSet(
          entities.map(entity => ({
            id: entity.id,
            label: entity.name,
            title: `${entity.name} (${entity.type})`,
            group: entity.type,
            value: entity.mentions,
            // Make font color adapt to dark mode
            font: { color: isDarkMode ? '#f9fafb' : '#18181b' },
            shape: 'icon',
            icon: getIconForEntityType(entity.type, isDarkMode)
          }))
        )
        
        // Create edges dataset
        const edges = new DataSet(
          relationships.map(rel => ({
            id: rel.id,
            from: rel.source,
            to: rel.target,
            title: `Strength: ${rel.strength}`,
            width: Math.sqrt(rel.strength),
            value: rel.strength,
            arrows: isHierarchical ? 'to' : undefined // Add arrows for hierarchical view
          }))
        )
        
        // Configure network options
        const options = {
          nodes: {
            shape: 'icon',
            scaling: {
              min: 10,
              max: 30,
              label: {
                enabled: true,
                min: 14,
                max: 20
              }
            },
            font: {
              size: 14,
              // Use the system font stack that matches your application
              face: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            },
            borderWidth: 2,
            borderWidthSelected: 3,
            shadow: {
              enabled: false // Disable shadow for cleaner look
            }
          },
          edges: {
            width: 1,
            color: { 
              inherit: 'from'
            },
            smooth: {
              enabled: true,
              type: 'continuous',
              roundness: 0.5
            },
            hoverWidth: 2,
            selectionWidth: 2,
          },
          physics: {
            enabled: !isHierarchical, // Disable physics when using hierarchical layout
            stabilization: {
              enabled: true,
              iterations: isHierarchical ? 200 : 100
            },
            barnesHut: {
              gravitationalConstant: -80,
              springConstant: 0.001,
              springLength: 200
            }
          },
          // Add layout configuration with hierarchy options
          layout: {
            randomSeed: 42, // Fixed seed for consistent layouts
            hierarchical: {
              enabled: isHierarchical,
              direction: 'UD', // UD = Up-Down, DU = Down-Up, LR = Left-Right, RL = Right-Left
              sortMethod: 'directed', // Options: hubsize, directed
              levelSeparation: 150, // Distance between levels
              nodeSpacing: 120, // Distance between nodes on the same level
              treeSpacing: 200, // Distance between different trees
              blockShifting: true,
              edgeMinimization: true,
              parentCentralization: true,
              shakeTowards: 'leaves' // Options: roots, leaves
            }
          },
          interaction: {
            hover: true,
            hoverConnectedEdges: true,
            selectConnectedEdges: true,
            navigationButtons: false,
            keyboard: true,
            tooltipDelay: 200,
            zoomView: true
          },
          groups: {
            person: { 
              color: { background: '#3b82f6', border: '#2563eb' },
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: iconConfig.person.code,
                size: 50,
                color: isDarkMode ? iconConfig.person.darkColor : iconConfig.person.lightColor
              }
            },       
            organization: { 
              color: { background: '#ef4444', border: '#dc2626' },
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: iconConfig.organization.code,
                size: 50,
                color: isDarkMode ? iconConfig.organization.darkColor : iconConfig.organization.lightColor
              }
            }, 
            location: { 
              color: { background: '#10b981', border: '#059669' },
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: iconConfig.location.code,
                size: 50,
                color: isDarkMode ? iconConfig.location.darkColor : iconConfig.location.lightColor
              }
            },     
            date: { 
              color: { background: '#f59e0b', border: '#d97706' },
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: iconConfig.date.code,
                size: 50,
                color: isDarkMode ? iconConfig.date.darkColor : iconConfig.date.lightColor
              }
            },     
            other: { 
              color: { background: '#6b7280', border: '#4b5563' },
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: iconConfig.other.code,
                size: 50,
                color: isDarkMode ? iconConfig.other.darkColor : iconConfig.other.lightColor
              }
            }      
          }
        }
        
        // Create network with null check for containerRef.current
        const container = containerRef.current
        if (container) {
          // Clean up existing network instances first
          container.innerHTML = ''
          
          // Create new network
          const network = new Network(container, { nodes, edges }, options)
          
          // Add hover effect manually since vis-network doesn't have built-in cursor changes
          network.on("hoverNode", () => {
            container.style.cursor = 'pointer'
          })
          
          network.on("blurNode", () => {
            container.style.cursor = 'default'
          })
          
          network.on("hoverEdge", () => {
            container.style.cursor = 'pointer'
          })
          
          network.on("blurEdge", () => {
            container.style.cursor = 'default'
          })
          
          // Force the rendu initial
          network.fit()
        }
      } catch (error) {
        console.error('Error loading vis-network:', error)
      }
    }
    
    importVisNetwork()
  }, [entities, relationships, isDarkMode, isHierarchical, iconsLoaded]) // Added iconsLoaded to dependencies
  
  return (
    <div className="w-full border rounded-lg overflow-hidden border-zinc-200 dark:border-zinc-800">
      {entities.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-16 bg-zinc-50 dark:bg-zinc-900 min-h-[400px]">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-zinc-300 dark:text-zinc-700 mb-4"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">No entities to visualize yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
            Analyze text, document or image to visualize relationships between detected entities.
          </p>
        </div>
      ) : (
        <div className="w-full flex flex-col">
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-end">
            <button
              onClick={() => setIsHierarchical(!isHierarchical)}
              className="text-sm px-3 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            >
              {isHierarchical ? 'Force Layout' : 'Hierarchical Layout'}
            </button>
          </div>
          <div className="w-full" style={{ height: '500px' }}>
            {!iconsLoaded ? (
              <div className="w-full h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
                  <p className="text-zinc-500 dark:text-zinc-400">Loading visualization...</p>
                </div>
              </div>
            ) : (
              <div 
                ref={containerRef} 
                className="w-full h-full" 
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
} 