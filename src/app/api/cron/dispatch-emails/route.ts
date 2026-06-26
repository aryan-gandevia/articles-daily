import { NextRequest, NextResponse } from "next/server";
import { getTodaysArticles, getSubscribers } from "@/lib/supabase";
import { sendDigestEmails } from "@/lib/email";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Verify the request is from our cron job
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting email dispatch...");

    const articles = await getTodaysArticles();
    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        emailsSent: 0,
        emailsFailed: 0,
        message: "No articles found today, skipping email dispatch.",
      });
    }

    const subscribers = await getSubscribers();
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const { sent, failed } = await sendDigestEmails(
      subscribers,
      articles,
      appUrl
    );

    console.log(`[Cron] Email dispatch complete: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      articlesCount: articles.length,
      subscribersCount: subscribers.length,
      emailsSent: sent,
      emailsFailed: failed,
      dispatchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Email dispatch failed:", error);
    return NextResponse.json(
      { error: "Failed to dispatch emails" },
      { status: 500 }
    );
  }
}
