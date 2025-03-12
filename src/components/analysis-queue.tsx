"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AnalysisTask, queueService } from '@/lib/queue-service'
import { AlertTriangle, Clock, Check, X, ChevronDown, ChevronUp, Trash2, RefreshCw } from 'lucide-react'

/**
 * Component to display and manage the analysis queue
 */
export function AnalysisQueue() {
  const [tasks, setTasks] = useState<AnalysisTask[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = queueService.onQueueChanged(() => {
      const currentTasks = queueService.getTasks();
      
      // If a new task is added, open the CollapsibleTrigger
      if (currentTasks.length > tasks.length) {
        setIsOpen(true);
      }
      
      // Also open if there are any processing tasks
      const hasProcessingTasks = currentTasks.some(task => task.status === 'processing');
      if (hasProcessingTasks) {
        setIsOpen(true);
      }
      
      setTasks(currentTasks);
    })
    
    // Load initial list
    setTasks(queueService.getTasks())
    
    return unsubscribe
  }, [tasks.length])
  
  // Function to get task content preview
  const getTaskContent = (task: AnalysisTask) => {
    switch (task.type) {
      case 'text':
        const text = task.content as string
        return text.substring(0, 15) + (text.length > 15 ? '...' : '')
      case 'document':
        const file = task.content as File
        return file.name.substring(0, 15) + (file.name.length > 15 ? '...' : '')
      case 'image':
        const image = task.content as File
        return image.name.substring(0, 15) + (image.name.length > 15 ? '...' : '')
      default:
        return `#${task.id.substring(5, 12)}`
    }
  }
  
  // Function to get task type label
  const getTaskType = (task: AnalysisTask) => {
    switch (task.type) {
      case 'text':
        return 'Text Analysis'
      case 'document':
        return 'Document Analysis'
      case 'image':
        return 'Image Analysis'
      default:
        return 'Task'
    }
  }
  
  // Function to display status icon
  const renderStatusIcon = (task: AnalysisTask) => {
    switch (task.status) {
      case 'pending':
        return <Clock size={16} className="text-gray-500" />
      case 'processing':
        return <RefreshCw size={16} className="text-blue-500 animate-spin" />
      case 'completed':
        return <Check size={16} className="text-green-600" />
      case 'failed':
        return <X size={16} className="text-red-600" />
      default:
        return null
    }
  }
  
  // Function to display status badge (for the collapsed view)
  const renderStatus = (task: AnalysisTask) => {
    switch (task.status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock size={14} /> Pending</Badge>
      case 'processing':
        return <Badge variant="secondary" className="flex items-center gap-1"><RefreshCw size={14} className="animate-spin" /> Processing</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1"><Check size={14} /> Completed</Badge>
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle size={14} /> Failed</Badge>
      default:
        return null
    }
  }
  
  // Function to cancel a task
  const cancelTask = (taskId: string) => {
    // TODO: Implement task cancellation
    console.log('Cancelling task:', taskId)
  }
  
  // Get the latest task and tasks count
  const latestTask = tasks.length > 0 ? tasks[0] : null
  const totalCount = tasks.length
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible 
        open={isOpen} 
        onOpenChange={setIsOpen}
        className="w-64"
      >
        <CollapsibleTrigger asChild>
          <Card className="flex shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
            <div className="flex-1 px-3 flex items-center justify-between">
              <div className="w-4"></div>
              <div className="flex items-center justify-center">
                {latestTask ? (
                  <>
                    {renderStatus(latestTask)}
                  </>
                ) : (
                  <span className="text-xs font-medium text-gray-500">No active tasks</span>
                )}
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </Card>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mt-2 shadow-md max-h-[60vh] overflow-y-auto">
            <CardContent className="py-3">
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs font-medium">Analysis Queue ({totalCount})</div>
              </div>
              
              {totalCount > 0 ? (
                <div className="space-y-1">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="py-2 px-3 border-b last:border-b-0 flex items-center justify-between"
                    >
                      <div className="font-medium text-xs flex flex-col">
                        <span>{getTaskType(task)}</span>
                        <span className="font-normal mt-1">{getTaskContent(task)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStatusIcon(task)}
                        {task.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6 p-0"
                            onClick={() => cancelTask(task.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No tasks in queue
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
} 