// src/app/components/NewsItem.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface NewsItemProps {
    title: string;
    type: 'article' | 'event';
    url?: string;
    body?: string;
    summary?: string;
    date: string;
}

export default function NewsItem({ title, type, url, body, summary, date }: NewsItemProps) {
    const [clicks, setClicks] = useState(0);
    const description = type === 'article' ? body : summary;

    // Create a unique key for this article in localStorage
    const storageKey = `newsClicks_${url || title}`;

    useEffect(() => {
        // Load saved clicks from localStorage
        const savedClicks = localStorage.getItem(storageKey);
        if (savedClicks) {
            setClicks(parseInt(savedClicks, 10));
        }
    }, [storageKey]);

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const handleClick = () => {
        if (url) {
            // Increment click count
            const newClicks = clicks + 1;
            setClicks(newClicks);
            localStorage.setItem(storageKey, newClicks.toString());
            window.open(url, '_blank');
        }
    };

    return (
        <motion.div className="relative group"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ ease: "easeInOut", duration: 0.42 }}>
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
                            <Button size="icon" variant="outline" className="text-xs pointer-events-none">
                            {clicks}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}