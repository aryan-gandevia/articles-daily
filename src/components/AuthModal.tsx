"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let result: string | null;
    if (mode === "signin") {
      result = await signIn(username, password);
    } else {
      result = await signUp(username, password, email || undefined, notifications);
    }

    setLoading(false);
    if (result) {
      setError(result);
    } else {
      onClose();
      setUsername("");
      setPassword("");
      setEmail("");
      setNotifications(false);
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
            className="fixed inset-x-4 top-[20%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-sm bg-card rounded-2xl shadow-2xl z-50 p-6"
          >
            <h2 className="text-xl font-bold text-foreground mb-1">
              {mode === "signin" ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-sm text-muted mb-5">
              {mode === "signin"
                ? "Sign in to access your favourites"
                : "Create an account to save favourite articles"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border/50 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                required
                minLength={3}
                maxLength={20}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border/50 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                required
                minLength={6}
              />

              {mode === "signup" && (
                <>
                  <input
                    type="email"
                    placeholder="Email (optional — for daily digest notifications)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border/50 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                  {email && (
                    <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications}
                        onChange={(e) => setNotifications(e.target.checked)}
                        className="rounded border-border accent-accent"
                      />
                      Send me the daily article digest via email
                    </label>
                  )}
                </>
              )}

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? "..."
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>

            <p className="text-xs text-muted text-center mt-4">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(null); }}
                    className="text-accent hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => { setMode("signin"); setError(null); }}
                    className="text-accent hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
