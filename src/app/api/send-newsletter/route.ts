// src/app/api/send-newsletter/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { MonthlyNewsletter } from '@/emails/MonthlyNewsletter';
import { getPreviousMonthArticles } from '@/lib/get-articles';
import { headers } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Contact {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
    unsubscribed: boolean;
}

interface ListResponse {
    data: {
        object: string;
        data: Contact[];
    } | null;
    error: null | {
        message: string;
        name: string;
    };
}

interface BatchSuccessResponse {
    data: {
        data: Array<{
            id: string;
        }>;
    };
    error: null;
}

interface SendResult {
    email: string;
    success: boolean;
    id?: string;
    error?: string;
}

export async function POST(request: Request) {
    try {
        // Verify the request is authorized
        const headersList = await headers();
        const authHeader = headersList.get('authorization');
        const origin = new URL(request.url).origin;
        const isInternalCall = request.headers.get('x-internal-token') === process.env.INTERNAL_API_KEY;
        const isCronCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;

        if (!isInternalCall && !isCronCall) {
            console.error('Unauthorized newsletter send attempt from:', origin);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Rest of your existing code...
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
        const month = lastMonth.toLocaleString('default', { month: 'long' });
        const year = lastMonth.getFullYear().toString();

        // Get the articles from the previous month
        const newsItems = await getPreviousMonthArticles();

        // Log for debugging
        console.log(`Found ${newsItems.length} articles for ${month} ${year}`);
        newsItems.forEach(item => console.log(`- ${item.date}: ${item.title} (${item.type})`));

        // Validate we have content
        if (newsItems.length === 0) {
            console.log('No articles found for the previous month');
            return NextResponse.json({
                success: false,
                message: 'No articles found for the previous month'
            }, { status: 404 });
        }

        // Get audience ID
        const rawAudienceId = process.env.RESEND_AUDIENCE_ID;
        if (!rawAudienceId) {
            throw new Error('Resend Audience ID is not configured');
        }

        // Remove 'aud_' prefix if it exists
        const audienceId = rawAudienceId.replace('aud_', '');
        console.log('Fetching contacts for audience:', audienceId);

        // Get the list of subscribers
        try {
            const contactsResponse = await resend.contacts.list({ audienceId }) as ListResponse;
            console.log('Raw Resend Response:', JSON.stringify(contactsResponse, null, 2));

            if (!contactsResponse.data?.data) {
                throw new Error(`Invalid response from Resend API: ${JSON.stringify(contactsResponse)}`);
            }

            // Extract contacts and filter out unsubscribed
            const allSubscribers = contactsResponse.data.data;
            const subscribers = allSubscribers.filter(sub => !sub.unsubscribed);
            console.log(`Found ${allSubscribers.length} total subscribers, ${subscribers.length} active`);
            console.log('Active subscribers:', subscribers.map(sub => sub.email));

            if (subscribers.length === 0) {
                return NextResponse.json({
                    success: false,
                    message: 'No subscribers found in the audience'
                }, { status: 404 });
            }

            // Prepare batch of emails
            const emailBatch = subscribers.map(subscriber => ({
                from: 'Your Newsletter <newsletter@fundfuture.xyz>',
                to: subscriber.email,
                subject: `${month} ${year} Newsletter`,
                react: MonthlyNewsletter({
                    month,
                    year,
                    newsItems,
                    previewText: `Your ${month} ${year} News Roundup - ${newsItems.length} Updates`
                }) as React.ReactElement
            }));

            console.log(`Sending batch of ${emailBatch.length} emails...`);

            // Send batch
            const batchResponse = await resend.batch.send(emailBatch) as BatchSuccessResponse;
            console.log('Batch send results:', JSON.stringify(batchResponse, null, 2));

            if (!batchResponse.data?.data) {
                throw new Error('Invalid batch send response');
            }

            // Process results
            const results: SendResult[] = subscribers.map((subscriber, index) => {
                const result = batchResponse.data.data[index];
                if (!result?.id) {
                    return {
                        email: subscriber.email,
                        success: false,
                        error: 'Failed to get send confirmation'
                    };
                }

                return {
                    email: subscriber.email,
                    success: true,
                    id: result.id
                };
            });

            // Filter results
            const successfulSends = results.filter((result): result is SendResult & { success: true } => result.success);
            const failedSends = results.filter((result): result is SendResult & { success: false } => !result.success);

            // Return detailed response
            return NextResponse.json({
                success: true,
                message: `Newsletter sent to ${successfulSends.length} subscribers (${failedSends.length} failed)`,
                details: {
                    month,
                    year,
                    articleCount: newsItems.length,
                    articleTypes: newsItems.reduce((acc: Record<string, number>, item) => {
                        acc[item.type] = (acc[item.type] || 0) + 1;
                        return acc;
                    }, {}),
                    subscribers: successfulSends.map(send => send.email)
                },
                results: {
                    successful: successfulSends,
                    failed: failedSends
                }
            });

        } catch (error) {
            console.error('Failed to process contacts:', error);
            throw error;
        }

    } catch (error) {
        console.error('Failed to send newsletter:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to send newsletter',
                error: error instanceof Error ? error.stack : undefined,
                details: error
            },
            { status: 500 }
        );
    }
}