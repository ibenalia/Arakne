"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useDeepseekOperation } from '@/lib/use-deepseek-operation'
import { TextAnalysisAdapter } from '@/lib/queue-adapter'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Spinner } from './ui/spinner'

/**
 * Form schema for text input validation
 */
const formSchema = z.object({
  text: z.string().min(10, {
    message: "Text must be at least 10 characters.",
  }),
})

/**
 * Component for text input and entity extraction
 */
export function TextAnalyzer() {
  const { isProcessing, runOperation } = useDeepseekOperation({ 
    operation: "Text analysis" 
  })
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
    },
  })

  /**
   * Process the submitted text and extract entities
   */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    await runOperation(async () => {
      // Add the text to the analysis queue
      const taskId = TextAnalysisAdapter.queueTextAnalysis(values.text)
      console.log(`Text analysis task added with ID: ${taskId}`)
      
      return { success: true }
    })
  }

  return (
    <Card className="border dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader>
        <CardTitle>Text Analysis</CardTitle>
        <CardDescription>
          Enter or paste text to extract entities and their relationships
        </CardDescription>
      </CardHeader>
      <CardContent>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Paste your text here (news articles, reports, documents, etc.)"
                      className="min-h-[200px] max-h-[400px] overflow-y-auto resize-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-900 dark:border-zinc-800"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              ) : "Analyze Text"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 