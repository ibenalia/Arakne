"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function ToastProvider() {
  const { theme } = useTheme();
  
  return (
    <Toaster
      position="top-left"
      toastOptions={{
        className: "border border-zinc-200 dark:border-zinc-700",
        style: {
          background: theme === "dark" ? "#09090b" : "#ffffff",
          color: theme === "dark" ? "#fafafa" : "#09090b",
        },
      }}
    />
  );
} 