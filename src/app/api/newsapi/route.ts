// src/app/api/newsapi/route.ts
import { NextResponse } from 'next/server';

// Configuration
const PRIORITY_SOURCES = ["BlackRock", "Franklin Templeton"];
const TITLE_SUFFIXES_TO_REMOVE = [
    ' - Decrypt',
    ' | Investing.com',
    ': Report',
    ' By Investing.com'
];

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

function processResults(articles: NewsArticle[], events: Event[]): { title: string; eventUri: string | null; }[] {
    // Step 1: Create a map of eventUri to all related articles
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

    // Step 2: Process each event, choosing the best title
    const processedResults: { title: string; eventUri: string | null; }[] = [];
    const seenTitles = new Set<string>();

    // Process events and their articles
    events.forEach(event => {
        const relatedArticles = eventArticlesMap.get(event.uri) || [];
        let bestTitle = event.title.eng;

        // Check if any related article has a priority source
        const priorityArticle = relatedArticles.find(article =>
            hasPrioritySource(article.title)
        );

        if (priorityArticle) {
            bestTitle = priorityArticle.title;
        }

        bestTitle = cleanTitle(bestTitle);

        if (!seenTitles.has(bestTitle.toLowerCase())) {
            processedResults.push({
                title: bestTitle,
                eventUri: event.uri
            });
            seenTitles.add(bestTitle.toLowerCase());
        }
    });

    // Process standalone articles
    standaloneArticles.forEach(article => {
        const cleanedTitle = cleanTitle(article.title);
        if (!seenTitles.has(cleanedTitle.toLowerCase())) {
            processedResults.push({
                title: cleanedTitle,
                eventUri: null
            });
            seenTitles.add(cleanedTitle.toLowerCase());
        }
    });

    return processedResults;
}

export async function GET(): Promise<NextResponse> {
    try {
        const apiKey = process.env.NEWSAPI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        // Fetch articles and events
        const [articlesResponse, eventsResponse] = await Promise.all([
            fetch('https://newsapi.ai/api/v1/article/getArticlesForTopicPage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uri: "6cb69db2-9f62-4974-9c1f-630c1f80f5bc",
                    dataType: ["news", "pr", "blog"],
                    resultType: "articles",
                    articlesSortBy: "date",
                    apiKey
                })
            }),
            fetch('https://newsapi.ai/api/v1/event/getEventsForTopicPage', {
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
            })
        ]);

        const articlesData = (await articlesResponse.json()) as ArticleResponse;
        const eventsData = (await eventsResponse.json()) as EventResponse;

        const articles = articlesData.articles?.results || [];
        const events = eventsData.events?.results || [];

        // Process results
        const processedResults = processResults(articles, events);

        // Format for final display
        const formattedResults = processedResults.map(item => ({
            title: `${item.title}${item.eventUri ? ' *' : ''}`,
            type: item.eventUri ? 'event' as const : 'article' as const
        }));

        // Prepare stats
        const stats = {
            originalArticles: articles.length,
            originalEvents: events.length,
            finalResults: formattedResults.length,
            withEvents: formattedResults.filter(r => r.type === 'event').length,
            standalone: formattedResults.filter(r => r.type === 'article').length
        };

        console.log('Processing stats:', stats);

        return NextResponse.json({
            results: formattedResults,
            stats
        });

    } catch (error) {
        console.error('API Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({
            error: 'API request failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}