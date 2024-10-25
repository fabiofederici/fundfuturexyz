// src/app/api/news/route.ts
import { NextResponse } from 'next/server';

interface NewsArticle {
    title: string;
    url: string;
    dateTime: string;
    eventUri: string | null;
}

interface Event {
    uri: string;
    title: {
        eng: string;
    };
    eventDate: string;
}

interface ArticleResponse {
    articles?: {
        results: NewsArticle[];
    };
}

interface EventResponse {
    events?: {
        results: Event[];
    };
}

function extractMainDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        const hostParts = urlObj.hostname.split('.');
        return hostParts.slice(Math.max(hostParts.length - 2, 0)).join('.');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        console.error('Error parsing URL:', url);
        return url;
    }
}

function filterAndDeduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    // First, keep only articles with null eventUri
    const nullEventArticles = articles.filter(article => !article.eventUri);

    console.log(`Kept ${nullEventArticles.length} articles with null eventUri out of ${articles.length}`);

    // Then deduplicate based on domain and title
    const seen = new Map<string, boolean>();
    return nullEventArticles.filter(article => {
        const mainDomain = extractMainDomain(article.url);
        const key = `${mainDomain}|${article.title.toLowerCase().trim()}`;
        if (seen.has(key)) {
            console.log('Dropping duplicate article:', article.title);
            return false;
        }
        seen.set(key, true);
        return true;
    });
}

function deduplicateEvents(events: Event[]): Event[] {
    const seen = new Map<string, boolean>();
    return events.filter(event => {
        const normalizedTitle = event.title.eng.toLowerCase().trim();
        if (seen.has(normalizedTitle)) {
            console.log('Dropping duplicate event:', event.title.eng);
            return false;
        }
        seen.set(normalizedTitle, true);
        return true;
    });
}

export async function GET(): Promise<NextResponse> {
    try {
        const apiKey = process.env.NEWSAPI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        // Fetch articles
        const articlesResponse = await fetch('https://newsapi.ai/api/v1/article/getArticlesForTopicPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uri: "6cb69db2-9f62-4974-9c1f-630c1f80f5bc",
                dataType: ["news", "pr", "blog"],
                resultType: "articles",
                articlesSortBy: "date",
                apiKey
            })
        });

        // Fetch events
        const eventsResponse = await fetch('https://newsapi.ai/api/v1/event/getEventsForTopicPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uri: "6cb69db2-9f62-4974-9c1f-630c1f80f5bc",
                resultType: "events",
                eventsSortBy: "date",
                includeEventSummary: true,
                includeEventStories: true,
                eventImageCount: 1,
                includeStoryBasicStats: true,
                includeStoryTitle: true,
                includeStoryDate: true,
                storyImageCount: 1,
                apiKey
            })
        });

        const articlesData = (await articlesResponse.json()) as ArticleResponse;
        const eventsData = (await eventsResponse.json()) as EventResponse;

        // Get the original data
        const articles = articlesData.articles?.results || [];
        const events = eventsData.events?.results || [];

        // Process filtering and deduplication
        const processedArticles = filterAndDeduplicateArticles(articles);
        const processedEvents = deduplicateEvents(events);

        // Track stats
        const stats = {
            articles: {
                original: articles.length,
                withEventUri: articles.filter(article => article.eventUri).length,
                final: processedArticles.length
            },
            events: {
                original: events.length,
                final: processedEvents.length
            }
        };

        // Combine and format response
        const formattedResponse = {
            results: [
                ...processedArticles.map(article => ({
                    title: article.title,
                    type: 'article' as const
                })),
                ...processedEvents.map(event => ({
                    title: `${event.title.eng} *`,
                    type: 'event' as const
                }))
            ],
            stats
        };

        return NextResponse.json(formattedResponse);

    } catch (error) {
        console.error('API Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({
            error: 'API request failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}