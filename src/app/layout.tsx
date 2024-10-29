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
    manifest: '/manifest.json',
    openGraph: {
        title: 'FundFuture',
        description: 'The latest in onchain funds & tokenization news.',
        url: 'https://fundfuture.xyz/',
        siteName: 'FundFuture',
        images: [
            {
                url: '/img/og-image.png',  // Path relative to the public directory
                width: 1200,
                height: 630,
                alt: 'FundFuture Preview',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    // Twitter specific (optional but recommended)
    twitter: {
        card: 'summary_large_image',
        title: 'FundFuture - The latest in onchain funds & tokenization news.',
        description: 'The latest in onchain funds & tokenization news.',
        images: ['/img/og-image.png'],
    },
    // Icons configuration
    icons: {
        // Favicon
        icon: '/favicon.ico',
        // Apple touch icon
        apple: '/img/apple-touch-icon.png',
    }
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