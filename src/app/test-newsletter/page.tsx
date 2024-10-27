// src/app/test-newsletter/page.tsx
'use client';

import { useState } from 'react';

export default function TestNewsletterPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const response = await fetch('/api/test-newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send test newsletter');
            }

            setStatus('success');
            setMessage('Test newsletter sent! Check your email.');
            setEmail('');
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'An error occurred');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="bg-white p-8 rounded-lg shadow">
                    <h1 className="text-2xl font-bold mb-6">Test Newsletter</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                                ${status === 'loading'
                                ? 'bg-gray-400'
                                : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Test Newsletter'}
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3 rounded ${
                            status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}