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
    excerpt: string;
    link: string;
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
    const defaultPreviewText = `Your ${month} ${year} News Roundup`;

    return (
        <Html>
            <Head />
            <Preview>{previewText || defaultPreviewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Heading style={header}>
                        Monthly Newsletter
                    </Heading>
                    <Text style={subheader}>
                        {month} {year} News Roundup
                    </Text>
                    <Hr style={hr} />

                    {/* News Items */}
                    <Section style={newsSection}>
                        {newsItems.map((item, index) => (
                            <Section key={index} style={newsItem}>
                                <Text style={newsDate}>{item.date}</Text>
                                <Heading as="h2" style={newsTitle}>
                                    {item.title}
                                </Heading>
                                <Text style={newsExcerpt}>{item.excerpt}</Text>
                                <Button style={button} href={item.link}>
                                    Read More
                                </Button>
                                {index < newsItems.length - 1 && <Hr style={hr} />}
                            </Section>
                        ))}
                    </Section>

                    {/* Footer */}
                    <Hr style={hr} />
                    <Section style={footer}>
                        <Text style={footerText}>
                            You&apos;re receiving this email because you subscribed to our newsletter.
                        </Text>
                        <Link href="{{unsubscribe}}" style={footerLink}>
                            Unsubscribe
                        </Link>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '600px',
};

const header = {
    fontSize: '24px',
    lineHeight: '1.3',
    fontWeight: '700',
    textAlign: 'center' as const,
    color: '#484848',
};

const subheader = {
    fontSize: '18px',
    lineHeight: '1.4',
    textAlign: 'center' as const,
    color: '#484848',
};

const newsSection = {
    padding: '20px 0',
};

const newsItem = {
    marginBottom: '24px',
};

const newsDate = {
    fontSize: '14px',
    color: '#666666',
    marginBottom: '8px',
};

const newsTitle = {
    fontSize: '20px',
    lineHeight: '1.4',
    color: '#484848',
    marginBottom: '8px',
};

const newsExcerpt = {
    fontSize: '16px',
    lineHeight: '1.4',
    color: '#484848',
    marginBottom: '16px',
};

const button = {
    backgroundColor: '#5c6ac4',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    marginBottom: '24px',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};

const footer = {
    textAlign: 'center' as const,
    color: '#706a7b',
};

const footerText = {
    fontSize: '14px',
    color: '#706a7b',
    marginBottom: '8px',
};

const footerLink = {
    fontSize: '14px',
    color: '#5c6ac4',
};

export default MonthlyNewsletter;
