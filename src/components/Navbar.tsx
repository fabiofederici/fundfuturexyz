// src/components/Navbar.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

export function Navbar() {
    return (
        <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ease: "easeInOut", duration: 0.42 }}
            className="fixed top-0 left-0 w-full text-foreground py-4 border-b border-border bg-background z-50 select-none">
            <div className="container pl-4 pr-4 max-w-4xl flex justify-between items-center">
                {/* Text-Based Logo Section */}
                <div className="flex items-center">
                    <span className="text-xl ">FundFuture</span>
                </div>

                {/* Tagline Section */}
                <div className="sm:appearance-none text-sm text-right text-muted-foreground overflow-hidden whitespace-nowrap text-ellipsis w-1/2">
                    The latest in onchain asset management & fund tokenization news.
                </div>
            </div>
        </motion.nav>
    );
}
