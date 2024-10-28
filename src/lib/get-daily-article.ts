// src/lib/get-daily-article.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NewsItem {
    title: string;
    date: string;
    url: string;
    type: string;
    article_uri: string | null;
    clicks: number;
}

export async function getArticleToTweet(): Promise<NewsItem | null> {
    try {
        // First try: Get most clicked article from yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
        const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

        const { data: yesterdayArticles, error: yesterdayError } = await supabase
            .from('news_items')
            .select('*')
            .gte('date', startOfYesterday.toISOString())
            .lte('date', endOfYesterday.toISOString())
            .order('clicks', { ascending: false })
            .limit(1);

        if (yesterdayError) {
            throw yesterdayError;
        }

        // If we found an article from yesterday, use it
        if (yesterdayArticles && yesterdayArticles.length > 0) {
            console.log('Using most clicked article from yesterday:', {
                title: yesterdayArticles[0].title,
                clicks: yesterdayArticles[0].clicks,
                date: yesterdayArticles[0].date
            });
            return yesterdayArticles[0];
        }

        // Second try: Get most clicked article from past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentArticles, error: recentError } = await supabase
            .from('news_items')
            .select('*')
            .gte('date', thirtyDaysAgo.toISOString())
            .order('clicks', { ascending: false })
            .limit(50); // Get top 50 to pick a random one from

        if (recentError) {
            throw recentError;
        }

        if (!recentArticles || recentArticles.length === 0) {
            console.log('No articles found in the past 30 days');
            return null;
        }

        // Pick a random article from the top clicked ones
        const randomIndex = Math.floor(Math.random() * Math.min(recentArticles.length, 10)); // Random from top 10
        const selectedArticle = recentArticles[randomIndex];

        console.log('Using random article from past 30 days:', {
            title: selectedArticle.title,
            clicks: selectedArticle.clicks,
            date: selectedArticle.date,
            totalCandidates: recentArticles.length
        });

        return selectedArticle;
    } catch (error) {
        console.error('Error fetching article to tweet:', error);
        throw error;
    }
}