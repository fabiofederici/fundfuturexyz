// src/app/api/cron/monthly-newsletter/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getBaseUrl(request: Request): Promise<string> {
    // For production deployments, always use NEXT_PUBLIC_SITE_URL
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
    }

    // For preview deployments
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // Fallback to request URL
    const url = new URL(request.url);
    if (url.origin !== 'null') {
        return url.origin;
    }

    // Local development fallback
    return 'http://localhost:3000';
}

export async function GET(request: Request) {
    try {
        // Verify the request is from Vercel Cron
        const headersList = await headers();
        const authHeader = headersList.get('authorization');

        if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('Unauthorized cron attempt');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const baseUrl = await getBaseUrl(request);
        const newsletterUrl = `${baseUrl}/api/send-newsletter`;

        console.log('INTERNAL_API_KEY exists:', !!process.env.INTERNAL_API_KEY);
        console.log('CRON_SECRET exists:', !!process.env.CRON_SECRET);
        console.log('Newsletter URL:', newsletterUrl);

        const requestHeaders = {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'x-internal-token': process.env.INTERNAL_API_KEY ?? '',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        } as const;

        console.log('Request headers:', {
            'Authorization': requestHeaders.Authorization ? 'Bearer [REDACTED]' : 'undefined',
            'x-internal-token': requestHeaders['x-internal-token'] ? '[REDACTED]' : 'undefined',
            'Content-Type': requestHeaders['Content-Type'],
            'Accept': requestHeaders.Accept
        });

        const response = await fetch(newsletterUrl, {
            method: 'POST',
            headers: requestHeaders
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Newsletter API failed with status ${response.status}: ${text}`);
        }

        // Ensure we're getting JSON back
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON response but got ${contentType}: ${text}`);
        }

        const result = await response.json();

        console.log('Monthly newsletter cron completed:', result);

        return NextResponse.json({
            success: true,
            message: 'Monthly newsletter sent',
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Monthly newsletter cron failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Monthly newsletter cron failed',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}