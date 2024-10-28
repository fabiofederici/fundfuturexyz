// src/app/api/test-newsletter/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { MonthlyNewsletter } from '@/emails/MonthlyNewsletter';
import { getPreviousMonthArticles } from '@/lib/get-articles';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        // Get the current month's data for the test
        const today = new Date();
        const month = today.toLocaleString('default', { month: 'long' });
        const year = today.getFullYear().toString();

        // Get the articles from the previous month for testing
        const newsItems = await getPreviousMonthArticles();
        console.log(`Found ${newsItems.length} articles for newsletter test`);

        // Group articles by type for logging
        const articleTypes = newsItems.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        console.log('Article types:', articleTypes);

        // Get audience ID and add 'aud_' prefix if not present
        const audienceId = process.env.RESEND_AUDIENCE_ID;
        if (!audienceId) {
            throw new Error('Resend Audience ID is not configured');
        }
        const fullAudienceId = audienceId.startsWith('aud_') ? audienceId : `aud_${audienceId}`;

        // First, add the email to the audience
        try {
            await resend.contacts.create({
                email,
                audienceId: fullAudienceId,
                unsubscribed: false
            });
            console.log('Added email to audience:', email);
        } catch (error) {
            console.log('Error adding to audience (might already exist):', error);
            // Continue even if this fails - the email might already be in the audience
        }

        const getUnsubscribeUrl = (email: string) =>
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email).replace(/\+/g, '%2B')}`;

        // Send test newsletter
        const result = await resend.emails.send({
            from: 'FundFuture <digest@fundfuture.xyz>',
            to: email,
            subject: `${month} ${year} Digest Test`,
            react: MonthlyNewsletter({
                month,
                year,
                newsItems,
                previewText: `The latest in onchain funds & tokenization news.`,
                unsubscribeUrl: getUnsubscribeUrl(email)  // Use email instead of subscriber.email
                // previewText: `${month} onchain funds & tokenization news. - ${newsItems.length} Updates`
            }) as React.ReactElement,
            text: `${month} ${year} Digest - FundFuture Newsletter`,
            headers: {
                'List-Unsubscribe': `<${getUnsubscribeUrl(email)}>`,  // Use email here too
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
        }) as ResendResponse;

        if ('error' in result && result.error) {
            throw new Error(result.error.message || 'Failed to send email');
        }

        return NextResponse.json({
            success: true,
            message: 'Test newsletter sent successfully',
            details: {
                articleCount: newsItems.length,
                articleTypes
            },
            id: (result as ResendSuccessResponse).id
        });

    } catch (error) {
        console.error('Failed to send test newsletter:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to send test newsletter',
            },
            { status: 500 }
        );
    }
}