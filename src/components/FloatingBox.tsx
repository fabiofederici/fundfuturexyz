// src/components/FloatingBox.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

export function FloatingBox() {
    return (
        <a href="https://glam.systems/" target="_blank" className="select-none">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ease: "easeInOut", duration: 0.42 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-sm bg-foreground text-background/50 hover:text-background transition-all px-4 py-2 shadow-lg z-50">
            Supported by GLAM *.+
        </motion.div>
        </a>
    );
}
