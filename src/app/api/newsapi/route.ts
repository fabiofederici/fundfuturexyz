// src/app/api/newsapi/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/ - decrypt$/, '')
        .replace(/ \| investing\.com$/, '')
        .replace(/: report$/, '')
        .replace(/ by investing\.com$/, '')
        .replace(/^breaking:?\s*/i, '')
        .replace(/^update:?\s*/i, '')
        .replace(/ by invezz/i, '')
        .replace(/\s*-\s*ledger insights\s*-\s*blockchain for enterprise$/, '');
}

export async function GET() {
    try {
        const { data: articles, error } = await supabase
            .from('news_items')
            .select('*')
            .order('date', { ascending: false })
            .limit(100);

        if (error) throw error;

        const uniqueTitles = new Map();
        articles.forEach(article => {
            const normalizedTitle = normalizeTitle(article.title);
            if (!uniqueTitles.has(normalizedTitle) ||
                new Date(article.date) > new Date(uniqueTitles.get(normalizedTitle).date)) {
                uniqueTitles.set(normalizedTitle, article);
            }
        });

        const uniqueArticles = Array.from(uniqueTitles.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 20);

        const formattedResults = uniqueArticles.map(article => ({
            title: article.title,
            type: article.type,
            url: article.url,
            body: article.body,
            summary: article.summary,
            date: article.date,
            source: 'supabase'
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
                'X-Data-Count': formattedResults.length.toString()
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