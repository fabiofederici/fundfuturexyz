// src/app/components/NewsItem.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NewsItemProps {
    title: string;
    type: 'article' | 'event';
    url?: string;
    body?: string;
    summary?: string;
    date: string;
    article_uri?: string;
    event_uri?: string;
}

export default function NewsItem({ title, type, url, body, summary, date }: NewsItemProps) {
    const [clicks, setClicks] = useState(0);
    const description = type === 'article' ? body : summary;

    // Subscribe to real-time updates for clicks
    useEffect(() => {
        // Initial fetch of clicks
        const fetchClicks = async () => {
            const { data, error } = await supabase
                .from('news_items')
                .select('clicks')
                .eq('title', title)
                .single();

            if (data && !error) {
                setClicks(data.clicks || 0);
            }
        };

        fetchClicks();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('news_clicks')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'news_items',
                    filter: `title=eq.${title}`
                },
                (payload) => {
                    if (payload.new.clicks !== undefined) {
                        setClicks(payload.new.clicks);
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [title]);

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const getOpacityClass = () => {
        const opacityValues = [
            'opacity-10',  // 0 clicks (initial)
            'opacity-15',  // 1 click
            'opacity-20',  // 2 clicks
            'opacity-25',  // 3 clicks
            'opacity-30',  // 4 clicks
            'opacity-35',  // 5 clicks
            'opacity-40',  // 6 clicks
            'opacity-45',  // 7 clicks
            'opacity-50',  // 8 clicks
            'opacity-55',  // 9 clicks
            'opacity-60',  // 10 clicks
            'opacity-65',  // 11 clicks
            'opacity-70',  // 12 clicks
            'opacity-75',  // 13 clicks
            'opacity-80',  // 14 clicks
            'opacity-85',  // 15 clicks
            'opacity-90',  // 16 clicks
            'opacity-95',  // 17 clicks
            'opacity-100', // 18 clicks and beyond
        ];

        return opacityValues[Math.min(clicks, opacityValues.length - 1)] || 'opacity-100';
    };

    const handleClick = async () => {
        if (url) {
            try {
                // Update clicks in Supabase
                const { error } = await supabase
                    .from('news_items')
                    .update({ clicks: clicks + 1 })
                    .eq('title', title);

                if (!error) {
                    // Optimistically update local state
                    setClicks(prev => prev + 1);
                    // Open the URL after successful update
                    window.open(url, '_blank');
                } else {
                    console.error('Error updating clicks:', error);
                }
            } catch (error) {
                console.error('Error updating clicks:', error);
            }
        }
    };

    return (
        <motion.div
            className="relative group"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ease: "easeInOut", duration: 0.42 }}
        >
            <div
                onClick={handleClick}
                className="cursor-pointer p-4 border-b hover:bg-muted/50 dark:hover:bg-muted/25 opacity-80 hover:opacity-100 transition-all"
            >
                <div className="flex flex-col">
                    <div className="font-semibold mb-1">{title}</div>
                    {description && (
                        <div className="text-sm text-muted-foreground overflow-hidden whitespace-nowrap text-ellipsis">
                            {description}
                        </div>
                    )}
                    <div className="flex justify-between items-center mt-2 text-xs font-mono text-muted-foreground/50">
                        <div>
                            {formattedDate}
                        </div>
                        <div>
                            <Button
                                size="icon"
                                variant="default"
                                className={`text-xs pointer-events-none ${getOpacityClass()} transition-opacity duration-200`}
                            >
                                {clicks}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}