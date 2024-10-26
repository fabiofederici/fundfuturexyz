'use client';

import { useEffect, useState } from 'react';
import NewsItem from '@/components/NewsItem';
import { motion } from 'framer-motion';
import {SkeletonCard} from "@/components/SkeletonCard";

interface NewsItemData {
    title: string;
    type: 'article' | 'event';
    url?: string;
    body?: string;
    summary?: string;
    date: string;
}

interface ApiResponse {
    results: NewsItemData[];
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
    const [data, setData] = useState<NewsItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/newsapi')
            .then(async (res) => {
                const text = await res.text();
                try {
                    const data: ApiResponse = JSON.parse(text);
                    if (data.error) {
                        setError(`${data.error}: ${data.details || 'No details available'}`);
                    } else {
                        console.log('Stats:', data.stats);
                        setData(data.results);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error('Parse error:', error);
                    setError(`Failed to parse response: ${text.substring(0, 100)}... Error: ${errorMessage}`);
                }
            })
            .catch((error: Error) => {
                setError(`Failed to fetch: ${error.message}`);
                console.error('Fetch error:', error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ease: "easeInOut", duration: 0.42 }}
            className="flex flex-col justify-center gap-y-[124px] max-w-4xl mx-auto pt-14"
        >

                {Array.from({ length: 20 }).map((_, index) => (
                <SkeletonCard key={index} />
            ))}
        </motion.div>
    );
    }

    if (error) {
        return <div className="p-4 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto pt-16">
            {/*<h1 className="p-4">*/}
            {/*    The latest {data.length} headlines in onchain funds & tokenization*/}
            {/*</h1>*/}
            <div>
                {data.map((item, index) => (
                    <NewsItem
                        key={index}
                        {...item}
                    />
                ))}
            </div>
        </div>
    );
}