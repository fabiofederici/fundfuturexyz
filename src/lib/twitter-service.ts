// src/lib/services/twitter-service.ts
import crypto from 'crypto';

interface TwitterResponse {
    data: {
        id: string;
        text: string;
    };
}

interface TwitterRequestBody {
    text: string;
    reply?: {
        in_reply_to_tweet_id: string;
    };
}

interface OAuthParams {
    [key: string]: string;
    oauth_consumer_key: string;
    oauth_nonce: string;
    oauth_signature_method: string;
    oauth_timestamp: string;
    oauth_token: string;
    oauth_version: string;
}

export interface TwitterConfig {
    apiKey: string;
    apiKeySecret: string;
    accessToken: string;
    accessTokenSecret: string;
}

export class TwitterService {
    private readonly config: TwitterConfig;
    private readonly apiBaseUrl = 'https://api.twitter.com/2';
    private lastTweetTime: number = 0;
    private readonly MIN_TWEET_INTERVAL = 2000; // Minimum 2 seconds between tweets
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 5000; // 5 seconds

    constructor(config: TwitterConfig) {
        this.config = config;
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastTweet = now - this.lastTweetTime;

        if (timeSinceLastTweet < this.MIN_TWEET_INTERVAL) {
            await this.delay(this.MIN_TWEET_INTERVAL - timeSinceLastTweet);
        }

        this.lastTweetTime = Date.now();
    }

    private generateAuthHeader(method: string, url: string, params: Record<string, string> = {}) {
        const oauthParams: OAuthParams = {
            oauth_consumer_key: this.config.apiKey,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: this.config.accessToken,
            oauth_version: '1.0'
        };

        const allParams: Record<string, string> = { ...params, ...oauthParams };
        const paramString = Object.keys(allParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
            .join('&');

        const signatureBaseString = [
            method.toUpperCase(),
            encodeURIComponent(url),
            encodeURIComponent(paramString)
        ].join('&');

        const signingKey = `${encodeURIComponent(this.config.apiKeySecret)}&${encodeURIComponent(this.config.accessTokenSecret)}`;
        const signature = crypto
            .createHmac('sha1', signingKey)
            .update(signatureBaseString)
            .digest('base64');

        const oauthParamsWithSignature: Record<string, string> = {
            ...oauthParams,
            oauth_signature: signature
        };

        return 'OAuth ' + Object.keys(oauthParamsWithSignature)
            .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParamsWithSignature[key])}"`)
            .join(', ');
    }

    private async makeRequest(
        endpoint: string,
        method: string,
        data?: TwitterRequestBody,
        retryCount = 0
    ): Promise<TwitterResponse> {
        try {
            await this.waitForRateLimit();

            const url = `${this.apiBaseUrl}${endpoint}`;
            const authHeader = this.generateAuthHeader(method, url);

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                body: data ? JSON.stringify(data) : undefined,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
            }

            return response.json();
        } catch (error) {
            if (retryCount < this.MAX_RETRIES) {
                console.log(`Retrying request (${retryCount + 1}/${this.MAX_RETRIES})...`);
                await this.delay(this.RETRY_DELAY);
                return this.makeRequest(endpoint, method, data, retryCount + 1);
            }
            throw error;
        }
    }

    private formatTweetText(text: string, maxLength: number = 280): string {
        return text.slice(0, maxLength).trim();
    }

    async createThread(newsItem: {
        title: string;
        url: string;
        clicks?: number;
    }): Promise<{ tweetIds: string[] }> {
        try {
            // Create the first tweet with the title
            const firstTweet = await this.makeRequest('/tweets', 'POST', {
                text: this.formatTweetText(newsItem.title)
            });

            // Create the second tweet with the URL
            const secondTweet = await this.makeRequest('/tweets', 'POST', {
                text: `🔗 Read more:\n${newsItem.url}`,
                reply: {
                    in_reply_to_tweet_id: firstTweet.data.id
                }
            });

            const tweetIds = [firstTweet.data.id, secondTweet.data.id];

            console.log('Twitter thread created successfully:', {
                title: newsItem.title,
                tweetIds,
                timestamp: new Date().toISOString()
            });

            return { tweetIds };
        } catch (error) {
            console.error('Error creating Twitter thread:', {
                title: newsItem.title,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}