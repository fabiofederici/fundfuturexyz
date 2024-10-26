// src/lib/news-service.ts
import { createClient } from '@supabase/supabase-js';
import { notifications } from './notifications';
import type {
    NewsArticle,
    Event,
    FormattedNewsItem,
    ProcessedNewsItem  // Added this
} from '@/types/news';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

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

    const processedResults: ProcessedNewsItem[] = [];
    const seenTitles = new Set<string>();

    // Process events with related articles
    events.forEach(event => {
        const relatedArticles = eventArticlesMap.get(event.uri) || [];
        let bestTitle = event.title.eng;
        let url: string | undefined = undefined;
        let dateTime = event.eventDate;
        let articleUri = null;

        // First check for priority source in related articles
        const priorityArticle = relatedArticles.find(article =>
            hasPrioritySource(article.title)
        );

        if (priorityArticle) {
            bestTitle = priorityArticle.title;
            url = priorityArticle.url;
            dateTime = priorityArticle.dateTime;
            articleUri = priorityArticle.uri;
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
                dateTime: dateTime,
                url: url || '',
                eventUri: event.uri,
                body: undefined,
                uri: event.uri,
                article_uri: articleUri,
                summary: event.summary?.eng
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
                eventUri: null,
                uri: article.uri,
                article_uri: article.uri
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
        summary: item.summary,
        uri: item.uri,
        article_uri: item.article_uri || null,
        event_uri: item.eventUri || null
    }));

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

    // In the fetchAndCacheNews method of news-service.ts
    async fetchAndCacheNews() {
        try {
            const [articlesResponse, eventsResponse] = await Promise.all([
                this.fetchArticles(),
                this.fetchEvents()
            ]);

            const articles = articlesResponse.articles?.results || [];
            const events = eventsResponse.events?.results || [];

            const formattedResults = processResults(articles, events);

            // Single upsert with column names
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
                        article_uri: item.article_uri,
                        event_uri: item.event_uri,
                        updated_at: new Date().toISOString()
                    })),
                    {
                        onConflict: 'article_uri,event_uri', // Use column names directly
                        ignoreDuplicates: true
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