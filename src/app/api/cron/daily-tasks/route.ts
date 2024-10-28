// src/app/api/cron/daily-tasks/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function makeInternalRequest(path: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'x-internal-token': process.env.INTERNAL_API_KEY || '',
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Request to ${path} failed with status ${response.status}: ${text}`);
    }

    return response.json();
}

export async function POST() {
    try {
        // Verify the request is authorized
        const headersList = await headers();
        const authHeader = headersList.get('authorization');

        if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('Unauthorized cron attempt');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Execute both tasks in parallel
        const startTime = Date.now();
        const [newsResult, tweetResult] = await Promise.allSettled([
            makeInternalRequest('/api/cron/update-news'),
            makeInternalRequest('/api/tweet')
        ]);

        // Process results
        const results = {
            news: newsResult.status === 'fulfilled' ? newsResult.value : { error: newsResult.reason },
            tweet: tweetResult.status === 'fulfilled' ? tweetResult.value : { error: tweetResult.reason }
        };

        // Log results
        console.log('Daily tasks completed:', {
            news: newsResult.status,
            tweet: tweetResult.status,
            duration_ms: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            results,
            timestamp: new Date().toISOString(),
            duration_ms: Date.now() - startTime
        });
    } catch (error) {
        console.error('Daily tasks failed:', {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack
            } : 'Unknown error',
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Daily tasks failed',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

export async function GET() {
    return POST();
}