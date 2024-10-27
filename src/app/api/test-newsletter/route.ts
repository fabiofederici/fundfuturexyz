// src/app/api/send-newsletter/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { MonthlyNewsletter } from '@/emails/MonthlyNewsletter';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Contact {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
    unsubscribed: boolean;
}

interface SendResult {
    email: string;
    success: boolean;
    id?: string;
    error?: string;
}

interface ResendSuccessResponse {
    id: string;
}

interface ResendErrorResponse {
    error: {
        message: string;
        name: string;
    };
}

interface ResendListResponse {
    data: Contact[] | null;
    error?: {
        message: string;
        name: string;
    };
}

type ResendResponse = ResendSuccessResponse | ResendErrorResponse;

export async function POST(request: Request) {
    // Add a comment to prevent the linting error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unusedRequest = request;

    try {
        // Get the previous month's data
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
        const month = lastMonth.toLocaleString('default', { month: 'long' });
        const year = lastMonth.getFullYear().toString();

        // TODO: Replace this with your actual news fetching logic
        const newsItems = [
            {
                title: "Example News Item 1",
                date: "October 15, 2023",
                excerpt: "This is an example news item from last month...",
                link: "https://your-site.com/news/1"
            },
        ];

        // Get all subscribers from your Resend audience
        const audienceId = process.env.RESEND_AUDIENCE_ID?.replace('aud_', '');
        if (!audienceId) {
            throw new Error('Resend Audience ID is not configured');
        }

        console.log('Fetching contacts for audience:', audienceId);

        // Get the list of subscribers
        const audienceResponse = await resend.contacts.list({
            audienceId
        }) as ResendListResponse;

        // Debug log the response
        console.log('Audience Response:', JSON.stringify(audienceResponse, null, 2));

        if ('error' in audienceResponse && audienceResponse.error) {
            throw new Error(`Failed to fetch audience: ${audienceResponse.error.message}`);
        }

        if (!audienceResponse.data || !Array.isArray(audienceResponse.data)) {
            console.error('Invalid audience data:', audienceResponse);
            throw new Error('Invalid audience data received');
        }

        const subscribers = audienceResponse.data;
        console.log(`Found ${subscribers.length} subscribers`);

        if (subscribers.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No subscribers found in the audience'
            }, { status: 404 });
        }

        // Filter out unsubscribed contacts
        const activeSubscribers = subscribers.filter(sub => !sub.unsubscribed);
        console.log(`${activeSubscribers.length} active subscribers after filtering`);

        // Send the newsletter to each subscriber
        const results: SendResult[] = await Promise.all(
            activeSubscribers.map(async (subscriber): Promise<SendResult> => {
                try {
                    console.log(`Sending to ${subscriber.email}...`);
                    const result = await resend.emails.send({
                        from: 'Your Newsletter <newsletter@yourdomain.com>',
                        to: subscriber.email,
                        subject: `${month} ${year} Newsletter`,
                        react: MonthlyNewsletter({
                            month,
                            year,
                            newsItems,
                            previewText: `Your ${month} ${year} News Roundup`
                        }) as React.ReactElement,
                    }) as ResendResponse;

                    if ('error' in result && result.error) {
                        throw new Error(result.error.message);
                    }

                    console.log(`Successfully sent to ${subscriber.email}`);
                    return {
                        email: subscriber.email,
                        success: true,
                        id: (result as ResendSuccessResponse).id
                    };
                } catch (error) {
                    console.error(`Failed to send to ${subscriber.email}:`, error);
                    return {
                        email: subscriber.email,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            })
        );

        // Filter out failed sends
        const successfulSends = results.filter((result): result is SendResult & { success: true } => result.success);
        const failedSends = results.filter((result): result is SendResult & { success: false } => !result.success);

        return NextResponse.json({
            success: true,
            message: `Newsletter sent to ${successfulSends.length} subscribers (${failedSends.length} failed)`,
            results: {
                successful: successfulSends,
                failed: failedSends
            }
        });

    } catch (error) {
        console.error('Failed to send newsletter:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to send newsletter',
                error: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
