"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextAnalyzer } from "@/components/text-analyzer"
import { DocumentAnalyzer } from "@/components/document-analyzer"
import { ImageAnalyzer } from "@/components/image-analyzer"
import { EntityGraph } from "@/components/entity-graph"
import { EntityList } from "@/components/entity-list"
import { EntityStats } from "@/components/entity-stats"
import { AnalysisQueue } from "@/components/analysis-queue"
import { ExtractionResult } from "@/lib/entity-extraction"
import { queueService } from "@/lib/queue-service"

/**
 * Main application page component
 */
export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<ExtractionResult>({
    entities: [],
    relationships: []
  })
  
  // Subscribe to task completion events at the page level to ensure DOM updates
  useEffect(() => {
    const unsubscribe = queueService.onTaskCompleted((task) => {
      if (task.status === 'completed') {
        // Update with latest cumulative results when any task completes
        const results = queueService.getPreviousResults();
        console.log("Task completed, updating with results:", results);
        setAnalysisResult(results);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Force re-render when queue changes to ensure DOM updates
  useEffect(() => {
    const unsubscribe = queueService.onQueueChanged(() => {
      // Simply trigger a re-render by getting the latest results
      const results = queueService.getPreviousResults();
      if (results.entities.length > 0 || results.relationships.length > 0) {
        console.log("Queue changed, updating with results:", results);
        setAnalysisResult(prev => {
          // Only update if the result has actually changed
          if (prev.entities.length !== results.entities.length || 
              prev.relationships.length !== results.relationships.length) {
            return results;
          }
          return prev;
        });
      }
    });
    
    return unsubscribe;
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 transition-colors duration-300">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">Arakne OSINT</h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400">
          AI-assisted entity extraction and relationship visualization
        </p>
      </header>
      
      <Tabs defaultValue="text" className="w-full mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="text">Text Analysis</TabsTrigger>
              <TabsTrigger className="flex-1" value="document">Document Analysis</TabsTrigger>
              <TabsTrigger className="flex-1" value="image">Image Analysis</TabsTrigger>
            </TabsList>
          </div>
          <div className="lg:col-span-2"></div>
        </div>
        
        <TabsContent value="text" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <TextAnalyzer />
            </div>
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-6">
                <EntityList entities={analysisResult.entities} />
                <EntityStats 
                  entities={analysisResult.entities} 
                  relationships={analysisResult.relationships} 
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="document" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <DocumentAnalyzer />
            </div>
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-6">
                <EntityList entities={analysisResult.entities} />
                <EntityStats 
                  entities={analysisResult.entities} 
                  relationships={analysisResult.relationships} 
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="image" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ImageAnalyzer />
            </div>
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-6">
                <EntityList entities={analysisResult.entities} />
                <EntityStats 
                  entities={analysisResult.entities} 
                  relationships={analysisResult.relationships} 
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Entity Relationship Graph</h2>
        <EntityGraph 
          entities={analysisResult.entities} 
          relationships={analysisResult.relationships} 
        />
      </div>
      
      <footer className="text-center text-zinc-500 dark:text-zinc-400 mt-12 pb-8">
        <p>Arakne OSINT - AI-assisted Open Source Intelligence Tool</p>
      </footer>
      
      {/* Analysis Queue - Floating Display */}
      <AnalysisQueue />
    </div>
  )
}
