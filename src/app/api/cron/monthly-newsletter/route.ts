// src/app/api/cron/monthly-newsletter/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 5 minutes

export async function GET(request: Request) {
    try {
        // Verify the request is from Vercel Cron
        const headersList = await headers();
        const authHeader = headersList.get('authorization');

        if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('Unauthorized cron attempt');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get the origin from the request URL
        const origin = new URL(request.url).origin;

        // Call the newsletter endpoint with authorization
        const response = await fetch(`${origin}/api/send-newsletter`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        });

        const result = await response.json();

        // Log the result
        console.log('Monthly newsletter cron completed:', result);

        return NextResponse.json({
            success: true,
            message: 'Monthly newsletter sent',
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Monthly newsletter cron failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Monthly newsletter cron failed',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}