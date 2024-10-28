// src/lib/create-threads.ts
import { TwitterService, type TwitterConfig } from './twitter-service';
import { getArticleToTweet } from './get-daily-article';

function formatDateForTweet(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
    }).format(date);
}

export async function createDailyTopArticleThread(twitterConfig: TwitterConfig) {
    // Validate Twitter credentials
    if (!twitterConfig.apiKey || !twitterConfig.accessToken) {
        throw new Error('Twitter credentials are not properly configured');
    }

    const twitterService = new TwitterService(twitterConfig);
    const articleToTweet = await getArticleToTweet();

    // In the very unlikely case we have no articles at all
    if (!articleToTweet) {
        return {
            success: false,
            message: 'No articles available to tweet',
            tweeted: false
        };
    }

    try {
        // Format the tweet based on whether it's from yesterday or older
        const isFromYesterday = new Date(articleToTweet.date).getDate() === new Date().getDate() - 1;
        const titlePrefix = isFromYesterday
            ? `Top story from yesterday:`
            : `Featured story from ${formatDateForTweet(articleToTweet.date)}:`;

        const thread = await twitterService.createThread({
            title: `${titlePrefix}\n${articleToTweet.title}`,
            url: articleToTweet.url,
            clicks: articleToTweet.clicks
        });

        return {
            success: true,
            tweeted: true,
            article: {
                title: articleToTweet.title,
                clicks: articleToTweet.clicks,
                date: articleToTweet.date
            },
            tweetIds: thread.tweetIds
        };
    } catch (error) {
        return {
            success: false,
            tweeted: false,
            article: {
                title: articleToTweet.title,
                clicks: articleToTweet.clicks,
                date: articleToTweet.date
            },
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}