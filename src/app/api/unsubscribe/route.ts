// src/app/api/unsubscribe/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return new NextResponse('Email parameter is required', { status: 400 });
        }

        // Get audience ID
        const rawAudienceId = process.env.RESEND_AUDIENCE_ID;
        if (!rawAudienceId) {
            throw new Error('Resend Audience ID is not configured');
        }

        // Remove audience prefix if it exists
        const audienceId = rawAudienceId.replace('aud_', '');

        // Update the contact's unsubscribed status
        await resend.contacts.update({
            audienceId,
            id: email,
            unsubscribed: true
        });

        // Redirect to a confirmation page or show a confirmation message
        return new NextResponse('You have been successfully unsubscribed.', {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            }
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return new NextResponse('Error processing unsubscribe request', { status: 500 });
    }
}

export async function POST(request: Request) {
    // Handle the one-click unsubscribe POST request
    // This needs to be implemented for compliance with bulk sending requirements
    return GET(request);
}