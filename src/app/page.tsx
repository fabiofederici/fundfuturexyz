'use client';

import { useEffect, useState } from 'react';

interface Article {
    title: string;
    link: string;
}

interface ApiResponse {
    articles?: Article[];
    error?: string;
    details?: string;
}

export default function Home() {
    const [status, setStatus] = useState('Loading...');

    useEffect(() => {
        fetch('/api/news')
            .then(async (res) => {
                const text = await res.text();
                console.log('Raw response:', text.substring(0, 200));
                try {
                    const data: ApiResponse = JSON.parse(text);
                    if (data.error) {
                        setStatus(`Error: ${data.error}\nDetails: ${data.details || 'No details available'}`);
                    } else {
                        const titles = data.articles?.map((article: Article) => article.title) || [];
                        setStatus(`Found ${titles.length} headlines:\n\n${titles.join('\n')}`);
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