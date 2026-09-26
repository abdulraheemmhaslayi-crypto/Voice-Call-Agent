import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import ChatwootWidget from "@/components/ChatwootWidget";
import AppLayout from "@/components/layout/AppLayout";
import PostHogIdentify from "@/components/PostHogIdentify";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import SpinLoader from "@/components/SpinLoader";
import { Toaster } from "@/components/ui/sonner";
import { AppConfigProvider } from "@/context/AppConfigContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { TelephonyConfigWarningsProvider } from "@/context/TelephonyConfigWarningsContext";
import { UserConfigProvider } from "@/context/UserConfigContext";
import { AuthProvider } from "@/lib/auth";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jamure Voice AI",
  description: "Jamure Voice AI - Conversational Voice Agent Platform",
  icons: {
    icon: "/jamure-logo.svg",
    shortcut: "/jamure-logo.svg",
    apple: "/jamure-logo.svg",
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent flash of light theme - runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();

              // Auto-recover from chunk load errors when new builds are deployed
              (function() {
                function handleChunkError(err) {
                  var msg = String((err && (err.message || err.reason || err)) || '');
                  if (/loading chunk|chunkloaderror/i.test(msg) || (err && err.name === 'ChunkLoadError')) {
                    var lastReload = sessionStorage.getItem('last_chunk_reload');
                    var now = Date.now();
                    if (!lastReload || (now - parseInt(lastReload, 10)) > 8000) {
                      sessionStorage.setItem('last_chunk_reload', String(now));
                      window.location.reload();
                    }
                  }
                }
                window.addEventListener('error', function(e) { handleChunkError(e.error || e.message); });
                window.addEventListener('unhandledrejection', function(e) { handleChunkError(e.reason); });
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SentryErrorBoundary>
          <AuthProvider>
            <AppConfigProvider>
              <Suspense fallback={<SpinLoader />}>
                <UserConfigProvider>
                  <TelephonyConfigWarningsProvider>
                    <OnboardingProvider>
                      <PostHogIdentify />
                      <AppLayout>
                        {children}
                      </AppLayout>
                      <Toaster />
                      <ChatwootWidget />
                    </OnboardingProvider>
                  </TelephonyConfigWarningsProvider>
                </UserConfigProvider>
              </Suspense>
            </AppConfigProvider>
          </AuthProvider>
        </SentryErrorBoundary>
      </body>
    </html>
  );
}
