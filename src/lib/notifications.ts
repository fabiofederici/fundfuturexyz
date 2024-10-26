// src/lib/notifications.ts
type NotificationLevel = 'info' | 'warning' | 'error';

interface SlackField {
    title: string;
    value: string;
    short?: boolean;
}

interface SlackAttachment {
    color?: string;
    fields?: SlackField[];
    footer?: string;
    footer_icon?: string;
}

interface NotificationOptions {
    emoji?: string;
    channel?: string;
    attachments?: SlackAttachment[];
}

class NotificationService {
    private webhookUrl: string;

    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }

    private async send(
        message: string,
        level: NotificationLevel = 'info',
        options: NotificationOptions = {}
    ) {
        const { emoji = '📰', channel, attachments = [] } = options;

        const colors = {
            info: '#2196f3',
            warning: '#ff9800',
            error: '#f44336'
        };

        try {
            const payload = {
                text: `${emoji} ${message}`,
                channel,
                attachments: [
                    ...attachments,
                    {
                        color: colors[level],
                        fields: [
                            {
                                title: 'Environment',
                                value: process.env.VERCEL_ENV || 'development',
                                short: true
                            },
                            {
                                title: 'Timestamp',
                                value: new Date().toISOString(),
                                short: true
                            }
                        ],
                        footer: 'News Service Monitor',
                        footer_icon: '⚡'
                    }
                ]
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error('Failed to send Slack notification:', await response.text());
            }
        } catch (error) {
            console.error('Error sending Slack notification:', error);
        }
    }

    async newsUpdateSuccess(articlesCount: number) {
        await this.send(
            `Successfully updated news articles`,
            'info',
            {
                emoji: '✅',
                attachments: [
                    {
                        fields: [
                            {
                                title: 'Articles Processed',
                                value: articlesCount.toString(),
                                short: true
                            }
                        ]
                    }
                ]
            }
        );
    }

    async newsUpdateError(error: Error, context: Record<string, string | number>) {
        await this.send(
            `Failed to update news articles`,
            'error',
            {
                emoji: '🚨',
                attachments: [
                    {
                        fields: [
                            {
                                title: 'Error',
                                value: error.message,
                                short: false
                            },
                            {
                                title: 'Context',
                                value: JSON.stringify(context, null, 2),
                                short: false
                            }
                        ]
                    }
                ]
            }
        );
    }

    async apiQuotaWarning(remainingCalls: number) {
        await this.send(
            `News API quota running low`,
            'warning',
            {
                emoji: '⚠️',
                attachments: [
                    {
                        fields: [
                            {
                                title: 'Remaining API Calls',
                                value: remainingCalls.toString(),
                                short: true
                            }
                        ]
                    }
                ]
            }
        );
    }
}

export const notifications = new NotificationService(
    process.env.SLACK_WEBHOOK_URL || ''
);