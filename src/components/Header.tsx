"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { ProfileMenu } from "@/components/ProfileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeedbackButton } from "@/components/FeedbackButton";

interface HeaderProps {
  articleCount: number;
  fetchedAt?: string;
  user?: { id: string; username: string; email: string | null; notificationsEnabled: boolean } | null;
  onAuthClick: () => void;
}

export function Header({ articleCount, fetchedAt, user, onAuthClick }: HeaderProps) {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mb-10"
    >
      {/* Top bar with auth */}
      <div className="flex items-center justify-between mb-6">
        <FeedbackButton />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <ProfileMenu user={user} />
          ) : (
            <button
              onClick={onAuthClick}
              className="px-3 py-1.5 text-sm rounded-lg bg-surface text-muted hover:text-foreground border border-border/50 hover:border-border transition-all cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center"
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Articles{" "}
          <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
            Daily
          </span>
        </h1>
        <p className="text-muted mt-3 text-lg">{today}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-sm text-muted/70">
            {articleCount} articles curated from 5 sources
          </span>
          {fetchedAt && (
            <>
              <span className="text-muted/30">·</span>
              <span className="text-sm text-muted/70">
                Updated {format(new Date(fetchedAt), "h:mm a")}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Subtle divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-8 mx-auto w-24 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
    </motion.header>
  );
}
