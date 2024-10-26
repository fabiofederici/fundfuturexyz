// src/components/FloatingBox.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast"
import Image from "next/image";

export function FloatingBox() {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            console.log('Submitting email:', email);

            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email
                })
            });

            const data = await response.json();
            console.log('API Response:', data);

            if (!data.success) {
                throw new Error(data.message || 'Failed to subscribe');
            }

            toast({
                title: "Success!",
                description: "You've been subscribed to FundFuture.",
            });
            setOpen(false);
            setEmail("");
        } catch (error) {
            console.error('Subscription error:', error);
            toast({
                title: "Error",
                description: error instanceof Error
                    ? `Subscription failed: ${error.message}`
                    : "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Common button styles
    const buttonStyles = "select-none bg-foreground text-background/50 hover:text-background transition-all shadow-lg text-sm md:px-4 md:py-2 h-10 md:h-auto flex items-center justify-center";
    const glamButtonStyles = "select-none bg-background text-foreground/50 hover:text-foreground transition-all shadow-lg text-sm md:px-4 md:py-2 h-10 md:h-auto flex items-center justify-center";
    const mobileSquareStyles = "w-10 md:w-auto aspect-square md:aspect-auto";
    const squareButtonStyles = "w-10 aspect-square"; // Always square

    return (
        <>
        {/* Newsletter and Twitter Buttons - Centered */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ease: "easeInOut", duration: 0.42 }}
                className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50"
            >
                <button
                    onClick={() => setOpen(true)}
                    className={`${buttonStyles} ${mobileSquareStyles} gap-2`}
                >
                    <Mail className="h-4 w-4" />
                    <span className="hidden md:inline">Delivered to your inbox</span>
                </button>

                <a
                    href="https://x.com/fundfuturexyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${buttonStyles} ${squareButtonStyles} group`}
                >
                    <Image
                        src="/img/x.svg"
                        alt="X (Twitter)"
                        width={16}
                        height={16}
                        className="opacity-50 group-hover:opacity-100 dark:invert scale-100 md:scale-150"
                    />
                </a>
            </motion.div>

            {/* GLAM Button - Bottom Right */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ease: "easeInOut", duration: 0.42 }}
                className="fixed bottom-4 right-4 z-50"
            >
                <a
                    href="https://glam.systems/"
                    target="_blank"
                    className={`${glamButtonStyles} ${mobileSquareStyles}`}
                >
                    <span className="hidden md:inline">Supported by GLAM &nbsp;</span>
                    <span className="md:inline-block">*.+</span>
                </a>
            </motion.div>

            {/* Newsletter Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Subscribe to FundFuture</DialogTitle>
                        <DialogDescription>
                            Get our monthly digest of onchain funds & tokenization news.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="flex justify-end gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Subscribing..." : "Subscribe"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}