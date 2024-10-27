// src/app/api/subscribe/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        // Check for API key and Audience ID
        const audienceId = process.env.RESEND_AUDIENCE_ID?.replace('aud_', '');

        if (!process.env.RESEND_API_KEY) {
            throw new Error('Resend API key is not configured');
        }

        if (!audienceId) {
            throw new Error('Resend Audience ID is not configured');
        }

        // Parse request body
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        console.log('Attempting to add contact:', email);
        console.log('Using Audience ID (without prefix):', audienceId);

        // Add contact to Resend Audience - using the UUID without the 'aud_' prefix
        const response = await resend.contacts.create({
            email,
            audienceId: audienceId,
            unsubscribed: false,
        });

        // Log the response for debugging
        console.log('Resend API response:', JSON.stringify(response, null, 2));

        // Type guard for error response
        if ('error' in response && response.error) {
            console.error('Resend API error:', response.error);
            return NextResponse.json(
                {
                    success: false,
                    message: response.error.message || 'Failed to subscribe',
                    error: {
                        message: response.error.message,
                        type: response.error.name
                    }
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully subscribed',
            contact: response
        });
    } catch (error) {
        // Log the full error
        console.error('Detailed subscription error:', error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to subscribe',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}