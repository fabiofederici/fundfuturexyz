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
    summary: string;
}

export async function getPreviousMonthArticles(): Promise<NewsItem[]> {
    // Get date range for previous month
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    console.log('Fetching articles between:', {
        start: firstDayLastMonth.toISOString(),
        end: lastDayLastMonth.toISOString()
    });

    // Fetch articles from Supabase
    const { data: articles, error } = await supabase
        .from('news_items')
        .select('*')
        .gte('date', firstDayLastMonth.toISOString())
        .lte('date', lastDayLastMonth.toISOString())
        .order('date', { ascending: false });

    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }

    if (!articles) {
        console.log('No articles found for the period');
        return [];
    }

    console.log(`Found ${articles.length} articles for the previous month`);

    // Format the articles for the newsletter
    return articles.map(article => ({
        title: article.title,
        date: new Date(article.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        excerpt: article.summary || article.body?.substring(0, 150) + '...' || article.title,
        link: article.url,
        type: article.type,
        summary: article.summary
    }));
}