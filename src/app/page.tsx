'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
    title: string;
    type: 'article' | 'event';
}

interface ApiResponse {
    results: NewsItem[];
    stats: {
        articles: {
            original: number;
            withEventUri: number;
            final: number;
        };
        events: {
            original: number;
            final: number;
        };
    };
    error?: string;
    details?: string;
}

// Function to clean titles with specific suffix removals
function cleanTitle(title: string): string {
    const suffixesToRemove = [
        ' - Decrypt',
        ' | Investing.com',
        ': Report',
        ' By Investing.com'
    ];

    // Start with the original title
    let cleanedTitle = title;

    // Remove each suffix if it exists at the end of the title
    for (const suffix of suffixesToRemove) {
        if (cleanedTitle.endsWith(suffix)) {
            cleanedTitle = cleanedTitle.slice(0, -suffix.length);
        }
    }

    return cleanedTitle;
}

export default function Home() {
    const [status, setStatus] = useState('Loading...');

    useEffect(() => {
        fetch('/api/newsapi')
            .then(async (res) => {
                const text = await res.text();
                try {
                    const data: ApiResponse = JSON.parse(text);
                    if (data.error) {
                        setStatus(`Error: ${data.error}\nDetails: ${data.details || 'No details available'}`);
                    } else {
                        const titles = data.results.map(item => {
                            // Clean the title but preserve the event marker if it exists
                            const isEvent = item.title.endsWith(' *');
                            const cleanedTitle = cleanTitle(isEvent ? item.title.slice(0, -2) : item.title);
                            return isEvent ? `${cleanedTitle} *` : cleanedTitle;
                        });

                        // Log stats to console
                        console.log('Stats:', {
                            articles: data.stats.articles,
                            events: data.stats.events,
                            totalResults: titles.length
                        });

                        setStatus(
                            `The latest ${titles.length} headlines in onchain funds & tokenization:\n\n` +
                            titles.join('\n')
                        );
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error('Parse error:', error);
                    setStatus(`Failed to parse response: ${text.substring(0, 100)}...\nError: ${errorMessage}`);
                }
            })
            .catch((error: Error) => {
                setStatus(`Failed to fetch: ${error.message}`);
                console.error('Fetch error:', error);
            });
    }, []);

    return (
        <pre style={{ padding: '20px', whiteSpace: 'pre-wrap' }}>
      {status}
    </pre>
    );
}