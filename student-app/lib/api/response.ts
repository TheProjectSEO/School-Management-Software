/**
 * API Response Utilities
 * Ensures proper Content-Type headers and consistent error handling
 */

import { NextResponse } from "next/server";

/**
 * Create a JSON response with explicit Content-Type header
 * This prevents HTTP 406 errors from content negotiation issues
 */
export function jsonResponse<T>(
  data: T,
  options?: {
    status?: number;
    headers?: HeadersInit;
  }
): NextResponse<T> {
  const headers = new Headers(options?.headers);

  // Explicitly set Content-Type to application/json
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return NextResponse.json(data, {
    status: options?.status || 200,
    headers,
  });
}

/**
 * Create an error response with proper typing
 */
export function errorResponse(
  message: string,
  options?: {
    status?: number;
    details?: unknown;
    headers?: HeadersInit;
  }
): NextResponse<{ error: string; details?: unknown }> {
  return jsonResponse(
    {
      error: message,
      ...(options?.details ? { details: options.details } : {}),
    },
    {
      status: options?.status || 500,
      headers: options?.headers,
    }
  );
}

/**
 * Create a success response with proper typing
 */
export function successResponse<T>(
  data: T,
  options?: {
    status?: number;
    message?: string;
    headers?: HeadersInit;
  }
): NextResponse<{ success: boolean; message?: string; data: T }> {
  return jsonResponse(
    {
      success: true,
      ...(options?.message ? { message: options.message } : {}),
      data,
    },
    {
      status: options?.status || 200,
      headers: options?.headers,
    }
  );
}

/**
 * Handle Supabase errors consistently
 */
export function handleSupabaseError(error: unknown, context: string): NextResponse {
  console.error(`Supabase error in ${context}:`, error);

  // Check if it's a Supabase error with details
  if (error && typeof error === "object" && "code" in error) {
    const supabaseError = error as { code?: string; message?: string; details?: string };

    // Handle specific error codes
    switch (supabaseError.code) {
      case "PGRST116": // Row not found
        return errorResponse("Resource not found", { status: 404, details: supabaseError.message });

      case "PGRST301": // RLS policy violation
        return errorResponse("Access denied", { status: 403, details: supabaseError.message });

      case "23505": // Unique violation
        return errorResponse("Resource already exists", { status: 409, details: supabaseError.message });

      case "23503": // Foreign key violation
        return errorResponse("Invalid reference", { status: 400, details: supabaseError.message });

      default:
        return errorResponse(
          supabaseError.message || "Database error occurred",
          { status: 500, details: supabaseError.details }
        );
    }
  }

  // Generic error
  return errorResponse("An unexpected error occurred", {
    status: 500,
    details: error instanceof Error ? error.message : "Unknown error",
  });
}
