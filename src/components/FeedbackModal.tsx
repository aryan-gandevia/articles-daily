"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_WORDS = 200;
const MAX_SCREENSHOTS = 3;

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [feedbackText, setFeedbackText] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedbackText("");
      setScreenshots([]);
      setIncludeMetadata(true);
      setSubmitted(false);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const wordCount = feedbackText.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const remainingWords = Math.max(0, MAX_WORDS - wordCount);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addScreenshots(files);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const addScreenshots = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    if (imageFiles.length + screenshots.length > MAX_SCREENSHOTS) {
      setError(`Maximum ${MAX_SCREENSHOTS} screenshots allowed`);
      return;
    }
    setScreenshots((prev) => [...prev, ...imageFiles].slice(0, MAX_SCREENSHOTS));
    setError(null);
  };

  const handlePaste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length > 0) {
      e.preventDefault();
      addScreenshots(files);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isOpen, screenshots.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("feedbackText", feedbackText);
    formData.append("includeMetadata", includeMetadata.toString());
    screenshots.forEach((file) => formData.append("screenshots", file));

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send feedback");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Failed to send feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[15%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-card rounded-2xl shadow-2xl z-50 p-6 max-h-[80vh] overflow-y-auto"
          >
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Thanks for your feedback!</h2>
                <p className="text-sm text-muted mb-6">We&apos;ll review it soon.</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-surface text-muted hover:text-foreground border border-border/50 hover:border-border transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-1">Send Feedback</h2>
                <p className="text-sm text-muted mb-5">
                  Found a bug or have a suggestion? Let us know.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Describe your feedback..."
                      rows={5}
                      className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border/50 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
                      required
                    />
                    <p className={`text-xs mt-1.5 ${wordCount > MAX_WORDS ? "text-red-500" : "text-muted"}`}>
                      {remainingWords} words remaining
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Screenshots (optional, max {MAX_SCREENSHOTS}) — paste or attach
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-sm rounded-lg bg-surface text-muted hover:text-foreground border border-border/50 hover:border-border transition-all cursor-pointer"
                    >
                      Attach screenshots
                    </button>

                    {screenshots.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {screenshots.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-xs text-muted bg-surface px-2 py-1 rounded border border-border/50"
                          >
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeScreenshot(index)}
                              className="text-muted hover:text-rose-500 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {user && (
                    <label className="flex items-start gap-2 text-sm text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMetadata}
                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                        className="mt-0.5 rounded border-border accent-accent"
                      />
                      <span>Include my account info (username, email) so you can follow up</span>
                    </label>
                  )}

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-lg bg-surface text-muted hover:text-foreground border border-border/50 hover:border-border transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || wordCount > MAX_WORDS || wordCount === 0}
                      className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? "Sending..." : "Send Feedback"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
