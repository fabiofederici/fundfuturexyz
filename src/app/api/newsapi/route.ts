// src/app/api/newsapi/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        console.log('Fetching latest 20 items from Supabase');

        // Single optimized query
        const { data: articles, error } = await supabase
            .from('news_items')
            .select('*')
            .order('date', { ascending: false })
            .limit(20);

        if (error) throw error;

        console.log('Fetched articles count:', articles?.length || 0);

        const formattedResults = articles.map(article => ({
            title: article.title,
            type: article.type,
            url: article.url,
            body: article.body,
            summary: article.summary,
            date: article.date,
            source: 'supabase'  // Keep this for verification
        }));

        return NextResponse.json({
            results: formattedResults,
            stats: {
                totalResults: formattedResults.length,
                withEvents: formattedResults.filter(r => r.type === 'event').length,
                standalone: formattedResults.filter(r => r.type === 'article').length,
                dataSource: 'supabase',
                timestamp: new Date().toISOString()
            }
        }, {
            headers: {
                'X-Data-Source': 'supabase',
                'X-Data-Count': articles.length.toString()
            }
        });

    } catch (error) {
        console.error('API Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({
            error: 'API request failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}