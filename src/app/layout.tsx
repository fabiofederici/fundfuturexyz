// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/Navbar";
import { FloatingBox } from "@/components/FloatingBox";
import { Toaster } from "@/components/ui/toaster";  // Add this import
import '@/styles/satoshi.css';
import '@fontsource/inter';

export const metadata: Metadata = {
    title: "FundFuture",
    description: "The latest in onchain funds & tokenization news.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className="bg-background text-foreground">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <Navbar />
            {children}
            <FloatingBox />
            <Toaster />
            <Analytics />
            <SpeedInsights />
        </ThemeProvider>
        </body>
        </html>
    );
}