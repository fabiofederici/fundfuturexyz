// src/app/api/subscribe/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // Log the API key (first few characters)
        const apiKey = process.env.NEXT_PUBLIC_LOOPS_API_KEY;
        console.log('API Key available:', !!apiKey);
        if (!apiKey) {
            throw new Error('API key is not configured');
        }

        // Parse request body
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        console.log('Attempting to subscribe:', email);

        // Make request to Loops.so
        const response = await fetch('https://app.loops.so/api/v1/contacts/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                email,
                source: "website_footer",
                subscribed: true,
            })
        });

        // Log the raw response
        console.log('Loops API response status:', response.status);
        const responseData = await response.json();
        console.log('Loops API response:', responseData);

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: responseData.message || 'Failed to subscribe',
                    details: responseData
                },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully subscribed'
        });
    } catch (error) {
        // Log the full error
        console.error('Detailed subscription error:', error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to subscribe',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}