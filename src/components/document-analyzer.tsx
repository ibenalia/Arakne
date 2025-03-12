"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { useDeepseekOperation } from '@/lib/use-deepseek-operation'
import { DocumentAnalysisAdapter } from '@/lib/queue-adapter'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'

/**
 * Form schema for document upload validation
 */
const formSchema = z.object({
  document: z.custom<FileList>()
    .refine((files) => files && files.length > 0, "Document is required")
})

/**
 * Component for document upload and entity extraction
 */
export function DocumentAnalyzer() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const { isProcessing, runOperation } = useDeepseekOperation({ 
    operation: "Document analysis" 
  })
  
  // Vérifier si nous sommes côté client
  useEffect(() => {
    setIsClient(true)
  }, [])

  /**
   * Simulates a file upload with progress updates
   */
  const simulateUpload = async (file: File, progressCallback: (progress: number) => void) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      progressCallback(progress)
      if (progress >= 100) clearInterval(interval)
    }, 200)
    
    // Simulate delay for extraction
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Reset progress
    progressCallback(0)
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  /**
   * Process the uploaded document and extract entities
   */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    const file = values.document[0]
    
    await runOperation(async () => {
      // Simulation du téléchargement avec progression
      await simulateUpload(file, setUploadProgress)
      
      // Ajouter le document à la queue d'analyse
      const taskId = DocumentAnalysisAdapter.queueDocumentAnalysis(file)
      console.log(`Document analysis task added with ID: ${taskId}`)
      
      return { success: true }
    })
  }

  /**
   * Handle file selection
   */
  const handleFileChange = (files: FileList | null) => {
    if (files) {
      form.setValue('document', files)
    }
  }

  /**
   * Custom validation of the file
   */
  const validateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      form.setError('document', { message: 'Please select a document file.' })
      return
    }
    
    handleFileChange(files)
  }

  // Si nous sommes en rendu serveur, afficher une version simplifiée
  if (!isClient) {
    return (
      <Card className="border dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>Document Analysis</CardTitle>
          <CardDescription>
            Upload document files to extract entities and their relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 border rounded-lg border-dashed border-zinc-300 dark:border-zinc-700 h-full flex items-center justify-center">
            <p className="text-zinc-500 dark:text-zinc-400 text-center">
              Loading document analyzer...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader>
        <CardTitle>Document Analysis</CardTitle>
        <CardDescription>
          Upload document files to extract entities and their relationships
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="document"
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.rtf"
                        className="cursor-pointer dark:bg-zinc-900 dark:border-zinc-800"
                        onChange={validateFile}
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Accepted formats: PDF, DOC, DOCX, TXT, RTF
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full cursor-pointer hover:shadow-md"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  <span>Adding to queue...</span>
                </>
              ) : "Analyze Document"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 