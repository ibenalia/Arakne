"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

/**
 * Component for switching between light and dark mode
 */
export function ThemeSwitcher() {
  const [isDark, setIsDark] = useState(false)

  // Initialize theme based on user preference
  useEffect(() => {
    // Check if user prefers dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem("theme")
    
    // Set initial theme
    const initialDark = storedTheme === "dark" || (!storedTheme && prefersDark)
    setIsDark(initialDark)
    
    // Apply theme to document
    document.documentElement.classList.toggle("dark", initialDark)
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    const newDarkState = !isDark
    setIsDark(newDarkState)
    
    // Save to localStorage
    localStorage.setItem("theme", newDarkState ? "dark" : "light")
    
    // Apply to document
    document.documentElement.classList.toggle("dark", newDarkState)
  }

  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      className="rounded-full p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </Button>
  )
} 