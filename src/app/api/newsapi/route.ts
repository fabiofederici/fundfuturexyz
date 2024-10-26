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
    body?: string;
}

interface MedoidArticle {
    url: string;
    title: string;
    dateTime: string;
}

interface Story {
    uri: string;
    medoidArticle?: MedoidArticle;
}

interface Event {
    uri: string;
    title: {
        eng: string;
    };
    eventDate: string;
    summary?: {
        eng?: string;
    };
    stories?: Story[];
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

interface FormattedNewsItem {
    title: string;
    type: 'article' | 'event';
    url?: string;
    body?: string;
    summary?: string;
    date: string;
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


export async function GET(): Promise<NextResponse> {
    try {
        const apiKey = process.env.NEWSAPI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const [articlesResponse, eventsResponse] = await Promise.all([
            fetch('https://newsapi.ai/api/v1/article/getArticlesForTopicPage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uri: "6cb69db2-9f62-4974-9c1f-630c1f80f5bc",
                    dataType: ["news", "pr", "blog"],
                    resultType: "articles",
                    articlesSortBy: "date",
                    articlesIncludeArticleBody: true,
                    articlesArticleBodyLen: -1,
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
                    includeStoryMedoidArticle: true,
                    eventImageCount: 1,
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

        const formattedResults = processResults(articles, events);

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