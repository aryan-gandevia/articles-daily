"use client";

import { motion } from "framer-motion";

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-muted text-sm">Curating today&apos;s articles...</p>
        <p className="text-muted/50 text-xs mt-1">
          Fetching from HN, GitHub, DEV, InfoQ, and Stack Overflow
        </p>
      </motion.div>
    </div>
  );
}
