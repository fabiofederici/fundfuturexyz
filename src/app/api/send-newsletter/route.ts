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

type ResendResponse = ResendSuccessResponse | ResendErrorResponse;

export async function POST() {
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
        const audienceId = process.env.RESEND_AUDIENCE_ID;
        if (!audienceId) {
            throw new Error('Resend Audience ID is not configured');
        }

        // Add 'aud_' prefix if not present
        const fullAudienceId = audienceId.startsWith('aud_') ? audienceId : `aud_${audienceId}`;
        console.log('Fetching contacts for audience:', fullAudienceId);

        // Get the list of subscribers
        const response = await resend.contacts.list({ audienceId: fullAudienceId });

        // Early validation of the response
        if (!response || !('data' in response) || !Array.isArray(response.data)) {
            console.error('Invalid response from Resend:', response);
            throw new Error('Invalid response from Resend API');
        }

        const subscribers = response.data as Contact[];
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
                        throw new Error(result.error.message || 'Failed to send email');
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