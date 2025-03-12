"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { ImageAnalysisAdapter } from '@/lib/queue-adapter'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Input } from './ui/input'
import Image from 'next/image'
import { useDeepseekOperation } from '@/lib/use-deepseek-operation'
import { Spinner } from './ui/spinner'

/**
 * Form schema for image upload validation
 */
const formSchema = z.object({
  // Utiliser any côté serveur, vérifié côté client avec validation personnalisée
  image: z.any()
})

/**
 * Component for image upload and entity extraction
 */
export function ImageAnalyzer() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const { isProcessing, runOperation } = useDeepseekOperation({ 
    operation: "Image analysis" 
  })
  
  // Vérifier si nous sommes côté client
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      image: undefined
    }
  })

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

  /**
   * Process the submitted image and extract entities
   */
  async function onSubmit() {
    const imageValue = form.getValues().image
    if (!imageValue || !(imageValue instanceof FileList) || imageValue.length === 0) {
      return;
    }
    
    const file = imageValue[0]
    
    await runOperation(async () => {
      // Simulation du téléchargement avec progression
      await simulateUpload(file, setUploadProgress)
      
      // Ajouter l'image à la queue d'analyse
      const taskId = ImageAnalysisAdapter.queueImageAnalysis(file)
      console.log(`Image analysis task added with ID: ${taskId}`)
      
      return { success: true }
    })
  }
  
  /**
   * Generate image preview when a file is selected
   */
  const handleImageChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0]
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === 'string') {
            setImagePreview(e.target.result)
          }
        }
        reader.readAsDataURL(file)
      } else {
        setImagePreview(null)
      }
      
      form.setValue('image', files)
    }
  }
  
  /**
   * Custom validation of the file
   */
  const validateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      form.setError('image', { message: 'Please select an image file.' })
      return
    }
    
    handleImageChange(files)
  }

  // Si nous sommes en rendu serveur, afficher une version simplifiée
  if (!isClient) {
    return (
      <Card className="border dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>Image Analysis</CardTitle>
          <CardDescription>
            Upload images to extract text and entities using OCR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 border rounded-lg border-dashed border-zinc-300 dark:border-zinc-700 h-full flex items-center justify-center">
            <p className="text-zinc-500 dark:text-zinc-400 text-center">
              Loading image analyzer...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader>
        <CardTitle>Image Analysis</CardTitle>
        <CardDescription>
          Upload images to extract text and entities using OCR
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="cursor-pointer dark:bg-zinc-900 dark:border-zinc-800"
                        onChange={validateFile}
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Accepted formats: JPG, PNG, WEBP, GIF
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {imagePreview && (
              <div className="mt-4 mb-4">
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden max-h-48 relative h-48">
                  <Image 
                    src={imagePreview} 
                    alt="Image preview" 
                    fill
                    className="object-contain" 
                    unoptimized={imagePreview.startsWith('data:')}
                  />
                </div>
              </div>
            )}
            
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
              ) : "Analyze Image"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 