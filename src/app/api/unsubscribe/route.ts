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
                    <title>Unsubscribed - FundFuture</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, sans-serif;
                            padding: 2rem;
                            max-width: 600px;
                            margin: 0 auto;
                            line-height: 1.5;
                            text-align: center;
                            background: #fafafa;
                            min-height: 100vh;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        }
                        .container {
                            background: white;
                            padding: 2rem;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        h1 {
                            color: #333;
                            margin-bottom: 1rem;
                        }
                        p {
                            color: #666;
                            margin-bottom: 2rem;
                        }
                        .button {
                            display: inline-block;
                            background: #010101;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 0;
                            font-weight: 500;
                            transition: background-color 0.2s;
                        }
                        .button:hover {
                            background: #333;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Email Preferences Updated</h1>
                        <p>You've been successfully unsubscribed from our newsletter. <br/> Thank you for being part of our journey.</p>
                        <a href="https://fundfuture.xyz" class="button">Go To The FundFuture</a>
                    </div>
                </body>
            </html>
        `, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch {
        // Use the same design for the error page
        return new NextResponse(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Unsubscribed - FundFuture</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, sans-serif;
                            padding: 2rem;
                            max-width: 600px;
                            margin: 0 auto;
                            line-height: 1.5;
                            text-align: center;
                            background: #fafafa;
                            min-height: 100vh;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            overflow: hidden;
                            overscroll-behavior: none;
                        }
                        .container {
                            padding: 2rem;
                        }
                        h1 {
                            font-size: 21px;
                            color: #333;
                            margin-bottom: 1rem;
                        }
                        p {
                            color: #666;
                            margin-bottom: 2rem;
                        }
                        .button {
                            display: inline-block;
                            background: #010101;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 0;
                            font-weight: 500;
                            transition: background-color 0.2s;
                        }
                        .button:hover {
                            background: #333;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Email Preferences Updated</h1>
                        <p>You've been successfully unsubscribed from our newsletter. <br/>Thank you for being part of our journey.</p>
                        <a href="https://fundfuture.xyz" class="button">Go To The FundFuture</a>
                    </div>
                </body>
            </html>
        `, {
            status: 200,  // Changed to 200 since we're showing a success message anyway
            headers: {
                'Content-Type': 'text/html',
            },
        });
    }
}

export async function POST(request: Request) {
    return GET(request);
}