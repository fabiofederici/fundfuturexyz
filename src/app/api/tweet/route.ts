// src/app/api/tweet/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createDailyTopArticleThread } from '@/lib/create-threads';

export const runtime = 'nodejs';
export const maxDuration = 30;

const isValidTwitterConfig = (): { valid: boolean; missing: string[] } => {
    const requiredEnvVars = [
        'TWITTER_API_KEY',
        'TWITTER_API_KEY_SECRET',
        'TWITTER_ACCESS_TOKEN',
        'TWITTER_ACCESS_TOKEN_SECRET'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    return {
        valid: missing.length === 0,
        missing
    };
};

export async function GET() {
    try {
        // Verify internal API key
        const headersList = await headers();
        const apiKey = headersList.get('x-internal-token');

        if (!process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY) {
            console.error('Unauthorized tweet attempt');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Validate Twitter configuration
        const { valid, missing } = isValidTwitterConfig();
        if (!valid) {
            return NextResponse.json({
                error: `Missing required environment variables: ${missing.join(', ')}`
            }, { status: 500 });
        }

        // Create thread for top article from previous day
        const result = await createDailyTopArticleThread({
            apiKey: process.env.TWITTER_API_KEY!,
            apiKeySecret: process.env.TWITTER_API_KEY_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
        });

        // If no article was found, return success but no tweet
        if (!result.tweeted) {
            return NextResponse.json({
                success: true,
                message: result.message || 'No tweet created',
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json({
            success: true,
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Tweet creation failed:', {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack
            } : 'Unknown error',
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Tweet creation failed',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}