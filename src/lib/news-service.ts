// src/lib/news-service.ts
import { createClient } from '@supabase/supabase-js';
import { notifications } from './notifications';
import type {
    NewsArticle,
    Event,
    FormattedNewsItem
} from '@/types/news';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Move these from your original file
const PRIORITY_SOURCES = ["BlackRock", "Franklin Templeton"];
const TITLE_SUFFIXES_TO_REMOVE = [
    ' - Decrypt',
    ' | Investing.com',
    ': Report',
    ' By Investing.com'
];

function cleanTitle(title: string): string {
    let cleanedTitle = title;
    for (const suffix of TITLE_SUFFIXES_TO_REMOVE) {
        if (cleanedTitle.endsWith(suffix)) {
            cleanedTitle = cleanedTitle.slice(0, -suffix.length);
        }
    }
    return cleanedTitle;
}

function hasPrioritySource(title: string): boolean {
    return PRIORITY_SOURCES.some(source =>
        title.includes(source)
    );
}

function processResults(
    articles: NewsArticle[],
    events: Event[]
): FormattedNewsItem[] {
    const eventArticlesMap = new Map<string, NewsArticle[]>();
    const standaloneArticles: NewsArticle[] = [];

    articles.forEach(article => {
        if (article.eventUri) {
            const existingArticles = eventArticlesMap.get(article.eventUri) || [];
            existingArticles.push(article);
            eventArticlesMap.set(article.eventUri, existingArticles);
        } else {
            standaloneArticles.push(article);
        }
    });

    const processedResults: (NewsArticle & { eventUri: string | null; summary?: string })[] = [];
    const seenTitles = new Set<string>();

    // Process events with related articles
    events.forEach(event => {
        const relatedArticles = eventArticlesMap.get(event.uri) || [];
        let bestTitle = event.title.eng;
        let url: string | undefined = undefined;
        let dateTime = event.eventDate;

        // First check for priority source in related articles
        const priorityArticle = relatedArticles.find(article =>
            hasPrioritySource(article.title)
        );

        if (priorityArticle) {
            bestTitle = priorityArticle.title;
            url = priorityArticle.url;
            dateTime = priorityArticle.dateTime;
        } else {
            // If no priority article, use medoidArticle URL and date if available
            const medoidArticle = event.stories?.[0]?.medoidArticle;
            if (medoidArticle) {
                url = medoidArticle.url;
                dateTime = medoidArticle.dateTime;
            }
        }

        bestTitle = cleanTitle(bestTitle);

        if (!seenTitles.has(bestTitle.toLowerCase())) {
            processedResults.push({
                title: bestTitle,
                eventUri: event.uri,
                dateTime: dateTime,
                url: url || '',
                summary: event.summary?.eng,
                body: undefined
            });
            seenTitles.add(bestTitle.toLowerCase());
        }
    });

    // Process standalone articles
    standaloneArticles.forEach(article => {
        const cleanedTitle = cleanTitle(article.title);
        if (!seenTitles.has(cleanedTitle.toLowerCase())) {
            processedResults.push({
                ...article,
                title: cleanedTitle,
                eventUri: null
            });
            seenTitles.add(cleanedTitle.toLowerCase());
        }
    });

    // Format the results
    const formattedResults: FormattedNewsItem[] = processedResults.map(item => ({
        title: `${item.title}${item.eventUri ? '' : ''}`,
        type: item.eventUri ? 'event' : 'article',
        date: item.dateTime,
        url: item.url,
        body: item.body,
        summary: item.summary
    }));

    // Sort by date (newest first)
    return formattedResults.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });
}

export class NewsService {
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async fetchAndCacheNews() {
        try {
            const [articlesResponse, eventsResponse] = await Promise.all([
                this.fetchArticles(),
                this.fetchEvents()
            ]);

            const articles = articlesResponse.articles?.results || [];
            const events = eventsResponse.events?.results || [];

            const formattedResults = processResults(articles, events);

            // Store in Supabase
            const { error } = await supabaseAdmin
                .from('news_items')
                .upsert(
                    formattedResults.map((item: FormattedNewsItem) => ({
                        title: item.title,
                        type: item.type,
                        url: item.url,
                        body: item.body,
                        summary: item.summary,
                        date: item.date,
                        event_uri: item.type === 'event' ? item.uri : null,
                        updated_at: new Date().toISOString()
                    })),
                    {
                        onConflict: 'title,date',
                        ignoreDuplicates: false
                    }
                );

            if (error) throw error;

            await notifications.newsUpdateSuccess(formattedResults.length);

            return {
                success: true,
                processed: formattedResults.length
            };
        } catch (error) {
            await notifications.newsUpdateError(error as Error, {
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    private async fetchArticles() {
        const response = await fetch('https://newsapi.ai/api/v1/article/getArticlesForTopicPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uri: "6cb69db2-9f62-4974-9c1f-630c1f80f5bc",
                dataType: ["news", "pr", "blog"],
                resultType: "articles",
                articlesSortBy: "date",
                articlesIncludeArticleBody: true,
                articlesArticleBodyLen: -1,
                apiKey: this.apiKey
            })
        });

        if (!response.ok) {
            throw new Error(`Articles API failed: ${response.statusText}`);
        }

        return response.json();
    }

    private async fetchEvents() {
        const response = await fetch('https://newsapi.ai/api/v1/event/getEventsForTopicPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uri: "6cb69db2-9f62-4974-9c1f-630c1f80f5bc",
                resultType: "events",
                eventsSortBy: "date",
                includeEventSummary: true,
                includeEventStories: true,
                includeStoryMedoidArticle: true,
                eventImageCount: 1,
                includeStoryTitle: true,
                includeStoryDate: true,
                storyImageCount: 1,
                apiKey: this.apiKey
            })
        });

        if (!response.ok) {
            throw new Error(`Events API failed: ${response.statusText}`);
        }

        return response.json();
    }
}