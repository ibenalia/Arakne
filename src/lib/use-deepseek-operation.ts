"use client";

import { useState } from "react";

interface UseDeepseekOperationOptions {
  operation: string;
}

export function useDeepseekOperation({ operation }: UseDeepseekOperationOptions) {
  const [isProcessing, setIsProcessing] = useState(false);

  async function runOperation<T>(callback: () => Promise<T>): Promise<T> {
    setIsProcessing(true);
    
    try {
      const result = await callback();
      return result;
    } catch (error) {
      console.error(`${operation} failed:`, error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }
  
  return { isProcessing, runOperation };
} 