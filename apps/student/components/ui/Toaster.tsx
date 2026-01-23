"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast notification wrapper using Sonner
 * Place this in your root layout to enable toast notifications
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme="light"
      toastOptions={{
        style: {
          fontFamily: "var(--font-lexend), sans-serif",
        },
        classNames: {
          toast: "shadow-lg border border-slate-200",
          title: "font-medium text-slate-900",
          description: "text-slate-600",
          actionButton: "bg-msu-maroon text-white hover:bg-msu-maroon/90",
          cancelButton: "bg-slate-100 text-slate-600 hover:bg-slate-200",
          closeButton: "text-slate-400 hover:text-slate-600",
        },
      }}
    />
  );
}
