// src/app/api/unsubscribe/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            console.error('No email provided');
            return new NextResponse('Email parameter is required', { status: 400 });
        }

        const rawAudienceId = process.env.RESEND_AUDIENCE_ID;
        if (!rawAudienceId) {
            throw new Error('Resend Audience ID is not configured');
        }

        // Log the decoded email
        const decodedEmail = decodeURIComponent(email);
        console.log('Processing unsubscribe for:', decodedEmail);

        // Get contacts list
        const contactsResponse = await resend.contacts.list({
            audienceId: rawAudienceId
        });

        console.log('Contacts response:', JSON.stringify(contactsResponse, null, 2));

        if (!contactsResponse.data?.data) {
            console.error('Failed to fetch contacts:', contactsResponse);
            throw new Error('Failed to fetch contacts');
        }

        // Find the contact
        const contact = contactsResponse.data.data.find(c => {
            const matches = c.email.toLowerCase() === decodedEmail.toLowerCase();
            console.log(`Comparing ${c.email} with ${decodedEmail}: ${matches}`);
            return matches;
        });

        if (!contact) {
            console.error('Contact not found in audience. Available contacts:',
                contactsResponse.data.data.map(c => c.email));
            throw new Error('Contact not found');
        }

        console.log('Found contact:', contact);

        // Update contact's unsubscribe status
        const updateResponse = await resend.contacts.update({
            audienceId: rawAudienceId,
            id: contact.id,
            unsubscribed: true
        });

        console.log('Update response:', JSON.stringify(updateResponse, null, 2));

        // Verify the update
        const verifyContact = await resend.contacts.get({
            audienceId: rawAudienceId,
            id: contact.id
        });

        console.log('Verification response:', JSON.stringify(verifyContact, null, 2));

        // Only show success if we can verify the update worked
        if (!verifyContact.data?.unsubscribed) {
            throw new Error('Failed to verify unsubscribe status update');
        }

        return new NextResponse(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Unsubscribed</title>
                    <style>
                        body {
                            font-family: system-ui, sans-serif;
                            padding: 2rem;
                            max-width: 600px;
                            margin: 0 auto;
                            line-height: 1.5;
                        }
                    </style>
                </head>
                <body>
                    <h1>Successfully Unsubscribed</h1>
                    <p>You have been successfully unsubscribed from the FundFuture newsletter.</p>
                </body>
            </html>
        `, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Detailed unsubscribe error:', error);
        return new NextResponse(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Unsubscribe Error</title>
                    <style>
                        body {
                            font-family: system-ui, sans-serif;
                            padding: 2rem;
                            max-width: 600px;
                            margin: 0 auto;
                            line-height: 1.5;
                        }
                        .error {
                            color: #dc2626;
                        }
                    </style>
                </head>
                <body>
                    <h1 class="error">Unsubscribe Error</h1>
                    <p>Sorry, we encountered an error while processing your unsubscribe request.</p>
                    <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
                </body>
            </html>
        `, {
            status: 500,
            headers: {
                'Content-Type': 'text/html',
            },
        });
    }
}

export async function POST(request: Request) {
    return GET(request);
}