import { NewsService } from '@/lib/news-service';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Common handler function for both GET and POST
async function handleRequest() {
    try {
        const headersList = await headers();
        const authHeader = headersList.get('authorization');

        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const newsService = new NewsService(process.env.NEWSAPI_API_KEY!);
        const result = await newsService.fetchAndCacheNews();

        return NextResponse.json(result);
    } catch (error) {
        console.error('News update failed:', error);
        return NextResponse.json(
            { error: 'Failed to update news' },
            { status: 500 }
        );
    }
}

// Support both GET and POST methods
export const GET = handleRequest;
export const POST = handleRequest;