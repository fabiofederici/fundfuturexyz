// src/types/news.ts
export interface NewsArticle {
    title: string;
    url: string;
    dateTime: string;
    eventUri: string | null;
    body?: string;
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

export interface FormattedNewsItem {
    title: string;
    type: 'article' | 'event';
    url?: string;
    body?: string;
    summary?: string;
    date: string;
    uri?: string;
}