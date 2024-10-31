// src/lib/get-articles.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NewsItem {
    title: string;
    date: string;
    excerpt: string;
    link: string;
    type: string;
    clicks: number;
}

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

export async function getPreviousMonthArticles(): Promise<NewsItem[]> {
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    const { data: articles, error } = await supabase
        .from('news_items')
        .select('*')
        .gte('date', firstDayLastMonth.toISOString())
        .lte('date', lastDayLastMonth.toISOString())
        .order('clicks', { ascending: false })
        .limit(50);

    if (error) throw error;
    if (!articles?.length) return [];

    const uniqueTitles = new Map();
    articles.forEach(article => {
        const normalizedTitle = normalizeTitle(article.title);
        if (!uniqueTitles.has(normalizedTitle) ||
            (article.clicks || 0) > (uniqueTitles.get(normalizedTitle).clicks || 0)) {
            uniqueTitles.set(normalizedTitle, article);
        }
    });

    const uniqueArticles = Array.from(uniqueTitles.values())
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
        .slice(0, 8);

    return uniqueArticles.map(article => ({
        title: article.title,
        date: new Date(article.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        excerpt: article.summary || article.body?.substring(0, 150) + '...' || article.title,
        link: article.url,
        type: article.type,
        clicks: article.clicks || 0
    }));
}