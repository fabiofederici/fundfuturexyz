// src/lib/news-service.ts
import { createClient } from '@supabase/supabase-js';
import { notifications } from './notifications';
import type {
    NewsArticle,
    Event,
    FormattedNewsItem,
    ProcessedNewsItem
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

// Enhanced title cleaning function
function cleanTitle(title: string): string {
    let cleanedTitle = title.trim();
    for (const suffix of TITLE_SUFFIXES_TO_REMOVE) {
        if (cleanedTitle.toLowerCase().endsWith(suffix.toLowerCase())) {
            cleanedTitle = cleanedTitle.slice(0, -suffix.length).trim();
        }
    }
    // Remove multiple spaces and normalize whitespace
    return cleanedTitle.replace(/\s+/g, ' ');
}

// Generate a normalized version of the title for comparison
function getNormalizedTitle(title: string): string {
    return cleanTitle(title)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
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
    const seenNormalizedTitles = new Map<string, ProcessedNewsItem>();

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

    // Process events with related articles
    events.forEach(event => {
        const relatedArticles = eventArticlesMap.get(event.uri) || [];
        let bestTitle = event.title.eng;
        let url: string | undefined = undefined;
        let dateTime = event.eventDate;
        let articleUri = null;

        // Priority source check
        const priorityArticle = relatedArticles.find(article =>
            hasPrioritySource(article.title)
        );

        if (priorityArticle) {
            bestTitle = priorityArticle.title;
            url = priorityArticle.url;
            dateTime = priorityArticle.dateTime;
            articleUri = priorityArticle.uri;
        } else {
            const medoidArticle = event.stories?.[0]?.medoidArticle;
            if (medoidArticle) {
                url = medoidArticle.url;
                dateTime = medoidArticle.dateTime;
            }
        }

        bestTitle = cleanTitle(bestTitle);
        const normalizedTitle = getNormalizedTitle(bestTitle);

        const existingItem = seenNormalizedTitles.get(normalizedTitle);
        if (!existingItem || new Date(dateTime) > new Date(existingItem.dateTime)) {
            const processedItem = {
                title: bestTitle,
                dateTime: dateTime,
                url: url || '',
                eventUri: event.uri,
                body: undefined,
                uri: event.uri,
                article_uri: articleUri,
                summary: event.summary?.eng
            };
            seenNormalizedTitles.set(normalizedTitle, processedItem);
            processedResults.push(processedItem);
        }
    });

    // Process standalone articles
    standaloneArticles.forEach(article => {
        const cleanedTitle = cleanTitle(article.title);
        const normalizedTitle = getNormalizedTitle(cleanedTitle);

        const existingItem = seenNormalizedTitles.get(normalizedTitle);
        if (!existingItem || new Date(article.dateTime) > new Date(existingItem.dateTime)) {
            const processedItem = {
                ...article,
                title: cleanedTitle,
                eventUri: null,
                uri: article.uri,
                article_uri: article.uri
            };
            seenNormalizedTitles.set(normalizedTitle, processedItem);
            processedResults.push(processedItem);
        }
    });

    // Format the results
    const formattedResults: FormattedNewsItem[] = processedResults.map(item => ({
        title: item.title,
        type: item.eventUri ? 'event' : 'article',
        date: item.dateTime,
        url: item.url,
        body: item.body,
        summary: item.summary,
        uri: item.uri,
        article_uri: item.article_uri || null,
        event_uri: item.eventUri || null
    }));

    return formattedResults.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
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

            // Get existing articles to check for updates
            const { data: existingItems } = await supabaseAdmin
                .from('news_items')
                .select('title, article_uri, event_uri, date');

            // Filter out items that haven't changed
            const itemsToUpsert = formattedResults.filter(newItem => {
                const existingItem = existingItems?.find(item =>
                    item.article_uri === newItem.article_uri &&
                    item.event_uri === newItem.event_uri
                );
                return !existingItem ||
                    existingItem.title !== newItem.title ||
                    new Date(existingItem.date).getTime() !== new Date(newItem.date).getTime();
            });

            if (itemsToUpsert.length > 0) {
                const { error } = await supabaseAdmin
                    .from('news_items')
                    .upsert(
                        itemsToUpsert.map(item => ({
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
                            onConflict: 'article_uri,event_uri',
                            ignoreDuplicates: false // Changed to false to allow updates
                        }
                    );

                if (error) throw error;
            }

            await notifications.newsUpdateSuccess(formattedResults.length);

            return {
                success: true,
                processed: formattedResults.length,
                upserted: itemsToUpsert.length
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