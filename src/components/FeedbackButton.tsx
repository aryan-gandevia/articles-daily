"use client";

import { useState } from "react";
import { FeedbackModal } from "./FeedbackModal";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-4 sm:left-6 sm:bottom-6 z-40 px-3 py-1.5 text-sm rounded-lg bg-surface text-muted hover:text-foreground border border-border/50 hover:border-border shadow-sm transition-all cursor-pointer"
        title="Send feedback"
      >
        Feedback
      </button>
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
