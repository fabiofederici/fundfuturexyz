// src/emails/MonthlyNewsletter.tsx
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface NewsItem {
    title: string;
    date: string;
    link: string;
    clicks: number;
}

interface MonthlyNewsletterProps {
    month: string;
    year: string;
    newsItems: NewsItem[];
    previewText?: string;
}

export const MonthlyNewsletter = ({
                                      month,
                                      year,
                                      newsItems,
                                      previewText,
                                  }: MonthlyNewsletterProps) => {
    const defaultPreviewText = `${month} onchain funds & tokenization news.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText || defaultPreviewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Heading style={header}>
                        FundFuture | {month} {year} Digest
                    </Heading>
                    {/*<Text style={subheader}>*/}
                    {/*    {month} {year} News Roundup*/}
                    {/*</Text>*/}
                    <Text style={subheader}>
                        The latest in onchain funds & tokenization news.
                    </Text>
                    <Hr style={hr} />

                    {/* News Items */}
                    <Section style={newsSection}>
                        {newsItems.map((item, index) => (
                            <Section key={index} style={newsItem}>
                                <Text style={newsDate}>{item.date} | {item.clicks} Clicks | <a href={item.link} style={newsLink}>Read More</a></Text>
                                <Heading as="h2" style={newsTitle}>
                                    {item.title}
                                </Heading>
                                {index < newsItems.length - 1 && <Hr style={hr} />}
                            </Section>
                        ))}
                    </Section>

                    <Button style={button} href="https://fundfuture.xyz/" target="_blank">Go To The FundFuture</Button>

                    {/* Footer */}
                    <Hr style={hr} />
                    <Section style={footer}>
                        <Text style={footerText}>
                            You&apos;re receiving this email because you subscribed to our newsletter.
                            <br/>
                            <Link href="{{{ unsubscribe }}}" style={footerLink}>
                                Unsubscribe
                            </Link>
                        </Text>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} FundFuture
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#fefefe',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '14px 0 14px',
    maxWidth: '500px',
};

const header = {
    fontSize: '21px',
    lineHeight: '1.3',
    fontWeight: '500',
    textAlign: 'left' as const,
    color: '#484848',
};

const newsLink = {
    color: '#010101',
    textDecoration: 'none',
    fontWeight: '500',
}

const subheader = {
    fontSize: '16px',
    lineHeight: '1.4',
    textAlign: 'left' as const,
    color: '#484848',
};

const newsSection = {
    padding: '14px 0',
};

const newsItem = {
    marginBottom: '14px',
};

const newsDate = {
    fontSize: '14px',
    color: '#666666',
    marginBottom: '8px',
    textDecoration: 'none',
};


const newsTitle = {
    fontSize: '20px',
    lineHeight: '1.4',
    color: '#484848',
    marginBottom: '8px',
    fontWeight: '600',
};

const button = {
    backgroundColor: '#010101',
    borderRadius: '0px',
    color: '#fefefe',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    marginBottom: '24px',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '14px 0',
};

const footer = {
    textAlign: 'left' as const,
    color: '#706a7b',
};

const footerText = {
    fontSize: '14px',
    color: '#706a7b',
    marginBottom: '8px',
};

const footerLink = {
    fontSize: '14px',
    color: '#010101',
};

export default MonthlyNewsletter;
