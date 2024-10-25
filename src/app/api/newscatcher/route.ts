// src/app/api/newscatcher/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiToken = process.env.NEWSCATCHER_API_KEY;

        if (!apiToken) {
            console.error('API token is missing');
            return NextResponse.json({ error: 'API token not configured' }, { status: 500 });
        }

        // Log the API token length and first/last few characters for debugging
        console.log('API Token info:', {
            length: apiToken.length,
            prefix: apiToken.substring(0, 4),
            suffix: apiToken.substring(apiToken.length - 4),
        });

        // Build the URL with query parameters
        const params = new URLSearchParams({
            q: 'Fund Tokenization',
            lang: 'en',
            sort_by: 'relevancy',
            page: '1',
            page_size: '100'
        });

        // Make request using their exact parameters
        const response = await fetch(
            // `https://v3-api.newscatcherapi.com/api/search?${params}`,
            `https://api.newscatcherapi.com/v2/search?${params}`,
            {
                method: 'GET',
                headers: {
                    'x-api-key': apiToken,
                    'Accept': 'application/json'
                }
            }
        );

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));

        const responseText = await response.text();
        console.log('First 200 chars of response:', responseText.substring(0, 200));

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} - ${responseText}`);
        }

        // Parse the JSON response
        const data = JSON.parse(responseText);
        return NextResponse.json(data);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'API request failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}