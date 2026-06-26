"use client";

import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 1 }}
      className="mt-16 pb-8 text-center"
    >
      <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />
      <p className="text-xs text-muted/50">
        Curated from Hacker News, GitHub, DEV.to, InfoQ, and Stack Overflow
      </p>
      <p className="text-xs text-muted/30 mt-1">
        Articles Daily — Built for engineers who read
      </p>
    </motion.footer>
  );
}
