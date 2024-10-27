import { NewsService } from '@/lib/news-service';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface NewsUpdateResult {
    success: boolean;
    processed: number;
    upserted: number;
}

async function handleRequest() {
    const startTime = Date.now();

    try {
        // Validate authorization
        const headersList = await headers();  // Added await here
        const authHeader = headersList.get('authorization');

        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('Unauthorized access attempt to news update endpoint');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Validate API key
        if (!process.env.NEWSAPI_API_KEY) {
            console.error('NEWSAPI_API_KEY is not configured');
            return NextResponse.json(
                { error: 'API key configuration missing' },
                { status: 500 }
            );
        }

        const newsService = new NewsService(process.env.NEWSAPI_API_KEY);
        const result = await newsService.fetchAndCacheNews() as NewsUpdateResult;

        const duration = Date.now() - startTime;

        // Enhanced response with more details
        return NextResponse.json({
            success: true,
            data: {
                ...result,
                duration_ms: duration
            }
        });
    } catch (error) {
        const duration = Date.now() - startTime;

        // Enhanced error logging
        console.error('News update failed:', {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack
            } : error,
            duration_ms: duration
        });

        // More detailed error response
        return NextResponse.json({
            error: 'Failed to update news',
            details: error instanceof Error ? error.message : 'Unknown error',
            duration_ms: duration
        }, {
            status: 500
        });
    }
}

// Support both GET and POST methods
export const GET = handleRequest;
export const POST = handleRequest;