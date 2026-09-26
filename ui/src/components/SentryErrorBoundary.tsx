"use client";

import * as Sentry from "@sentry/nextjs";
import { ReactNode } from "react";

// Wraps the app tree so render errors are caught with React's componentStack
// attached. Sentry's LinkedErrors integration picks up the componentStack from
// error.cause, so events arrive in Sentry tagged with the component path
// instead of collapsing into opaque React-internal frames.
export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isChunkError = /loading chunk|chunkloaderror/i.test(errorMsg) || (error as any)?.name === "ChunkLoadError";

        if (isChunkError && typeof window !== "undefined") {
          const lastReload = sessionStorage.getItem("last_chunk_reload");
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
            sessionStorage.setItem("last_chunk_reload", String(now));
            window.location.reload();
            return (
              <div className="flex flex-col items-center justify-center min-h-screen gap-3 p-6 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Updating to latest version...</p>
              </div>
            );
          }
        }

        return (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground max-w-md">{errorMsg}</p>
            <button
              onClick={() => {
                if (isChunkError) {
                  window.location.reload();
                } else {
                  resetError();
                }
              }}
              className="px-4 py-2 rounded-md border bg-background hover:bg-accent text-sm"
            >
              {isChunkError ? "Reload Page" : "Try again"}
            </button>
          </div>
        );
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
