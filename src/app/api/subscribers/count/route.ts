import { NextResponse } from "next/server";
import { getSubscriberCount } from "@/lib/supabase";

export const MAX_SUBSCRIBERS = 70;

export async function GET() {
  try {
    const count = await getSubscriberCount();
    return NextResponse.json({
      count,
      max: MAX_SUBSCRIBERS,
      full: count >= MAX_SUBSCRIBERS,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Subscribers] Failed to count subscribers:", error);
    return NextResponse.json(
      { error: "Failed to count subscribers", count: 0, max: MAX_SUBSCRIBERS, full: false },
      { status: 500 }
    );
  }
}
