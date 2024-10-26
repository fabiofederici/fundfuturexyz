// src/types/news.ts

export interface NewsArticle {
    title: string;
    url: string;
    dateTime: string;
    eventUri: string | null;
    body?: string;
    uri: string;
}

export interface MedoidArticle {
    url: string;
    title: string;
    dateTime: string;
}

export interface Story {
    uri: string;
    medoidArticle?: MedoidArticle;
}

export interface Event {
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

export interface ProcessedNewsItem extends NewsArticle {
    eventUri: string | null;
    summary?: string;
    uri: string;
    article_uri?: string | null;  // Changed to allow null
}

export interface FormattedNewsItem {
    title: string;
    type: 'article' | 'event';
    date: string;
    url?: string;
    body?: string;
    summary?: string;
    uri?: string;
    article_uri?: string | null;  // Changed to allow null
    event_uri?: string | null;    // Changed to allow null
}