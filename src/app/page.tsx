'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
    title: string;
    type: 'article' | 'event';
}

interface ApiResponse {
    results: NewsItem[];
    stats: {
        originalArticles: number;
        originalEvents: number;
        finalResults: number;
        withEvents: number;
        standalone: number;
    };
    error?: string;
    details?: string;
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
                        // Log stats to console
                        console.log('Stats:', data.stats);

                        setStatus(
                            `The latest ${data.results.length} headlines in onchain funds & tokenization:\n\n` +
                            data.results.map(item => item.title).join('\n')
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