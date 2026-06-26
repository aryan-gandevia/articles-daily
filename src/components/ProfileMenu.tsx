"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

interface User {
  id: string;
  username: string;
  email: string | null;
  notificationsEnabled: boolean;
}

interface SubscriberCount {
  count: number;
  max: number;
  full: boolean;
}

interface ProfileMenuProps {
  user: User;
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const { signOut, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user.email || "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(user.notificationsEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<SubscriberCount | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Fetch subscriber count when menu opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/subscribers/count")
      .then((res) => res.json())
      .then((data) => setSubscriberCount(data))
      .catch((err) => console.error("[ProfileMenu] Failed to fetch subscriber count:", err));
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || null,
          notificationsEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to save preferences");
      } else {
        setMessage("Saved");
        await refresh();
      }
    } catch {
      setMessage("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This will permanently remove all your favourites and cannot be undone."
    );
    if (!confirmed) return;

    const res = await fetch("/api/auth/account", { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      window.location.reload();
    } else {
      alert(data.error || "Failed to delete account");
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-surface text-muted hover:text-foreground border border-border/50 hover:border-border transition-all cursor-pointer"
        title="Profile"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="max-w-[100px] truncate hidden sm:inline">{user.username}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-72 bg-card rounded-xl border border-border shadow-lg z-50 p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">{user.username}</h3>
              <p className="text-xs text-muted mb-4">Manage your account and notifications</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Email (optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (!e.target.value.trim()) setNotificationsEnabled(false);
                    }}
                    placeholder="Add email for notifications"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface border border-border/50 text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <label
                  className={`flex items-start gap-2 text-sm cursor-pointer ${
                    email.trim() && !subscriberCount?.full
                      ? "text-muted"
                      : "text-muted/40 cursor-not-allowed"
                  }`}
                  title={
                    subscriberCount?.full
                      ? "Daily digest subscriptions are temporarily full"
                      : email.trim()
                      ? ""
                      : "Add an email first to subscribe"
                  }
                >
                  <input
                    type="checkbox"
                    checked={notificationsEnabled && !!email.trim() && !subscriberCount?.full}
                    onChange={(e) => {
                      if (!email.trim() || subscriberCount?.full) return;
                      setNotificationsEnabled(e.target.checked);
                    }}
                    disabled={!email.trim() || subscriberCount?.full}
                    className="mt-0.5 rounded border-border accent-accent disabled:opacity-40"
                  />
                  <span>
                    Send me the daily article digest via email
                    {subscriberCount?.full && (
                      <span className="block text-xs text-red-500 mt-1">
                        Subscriptions temporarily full ({subscriberCount.count}/{subscriberCount.max})
                      </span>
                    )}
                  </span>
                </label>

                {message && (
                  <p className={`text-xs ${message === "Saved" ? "text-emerald-500" : "text-red-500"}`}>
                    {message}
                  </p>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2 text-sm rounded-lg bg-accent text-white font-medium hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </button>

                <div className="border-t border-border/50 pt-3 space-y-2">
                  <button
                    onClick={async () => {
                      await signOut();
                      window.location.reload();
                    }}
                    className="w-full py-2 text-sm rounded-lg bg-surface text-muted hover:text-foreground border border-border/50 hover:border-border transition-all cursor-pointer"
                  >
                    Sign out
                  </button>

                  <button
                    onClick={handleDeleteAccount}
                    className="w-full py-2 text-sm rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
                  >
                    Delete account
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
