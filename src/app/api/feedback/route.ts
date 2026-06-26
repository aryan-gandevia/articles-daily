import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendFeedbackEmail } from "@/lib/email";

const RATE_LIMIT_MINUTES = 5;

async function getUserId(request: NextRequest): Promise<string | null> {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) return null;
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user.id;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const feedbackText = formData.get("feedbackText") as string;
    const includeMetadata = formData.get("includeMetadata") === "true";
    const screenshots = formData.getAll("screenshots") as File[];

    if (!feedbackText || feedbackText.trim().length === 0) {
      return NextResponse.json(
        { error: "Feedback text is required" },
        { status: 400 }
      );
    }

    if (countWords(feedbackText) > 200) {
      return NextResponse.json(
        { error: "Feedback must be 200 words or less" },
        { status: 400 }
      );
    }

    if (screenshots.length > 3) {
      return NextResponse.json(
        { error: "Maximum 3 screenshots allowed" },
        { status: 400 }
      );
    }

    // Rate limiting
    const userId = await getUserId(request);
    const ipAddress = getClientIp(request);

    const { data: existingLimit } = await supabase
      .from("feedback_rate_limits")
      .select("last_sent_at")
      .or(`user_id.eq.${userId || "00000000-0000-0000-0000-000000000000"},ip_address.eq.${ipAddress}`)
      .order("last_sent_at", { ascending: false })
      .limit(1)
      .single();

    if (existingLimit) {
      const lastSent = new Date(existingLimit.last_sent_at);
      const minutesSince = (Date.now() - lastSent.getTime()) / (1000 * 60);
      if (minutesSince < RATE_LIMIT_MINUTES) {
        const waitMinutes = Math.ceil(RATE_LIMIT_MINUTES - minutesSince);
        return NextResponse.json(
          { error: `Please wait ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"} before sending more feedback` },
          { status: 429 }
        );
      }
    }

    // Upsert rate limit
    await supabase.from("feedback_rate_limits").upsert(
      {
        user_id: userId || null,
        ip_address: userId ? null : ipAddress,
        last_sent_at: new Date().toISOString(),
      },
      { onConflict: userId ? "user_id" : "ip_address" }
    );

    // Get user metadata if requested
    let username: string | undefined;
    let userEmail: string | undefined;
    if (userId && includeMetadata) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, email")
        .eq("id", userId)
        .single();
      username = profile?.username;
      userEmail = profile?.email || undefined;
    }

    // Convert screenshots to base64
    const screenshotAttachments = await Promise.all(
      screenshots.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        return {
          filename: file.name,
          content: base64,
          contentType: file.type,
        };
      })
    );

    // Send email
    const toEmail = process.env.FEEDBACK_EMAIL || "aryan.gandevia@gmail.com";
    const result = await sendFeedbackEmail({
      feedbackText: feedbackText.trim(),
      username,
      userEmail,
      screenshots: screenshotAttachments,
      toEmail,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Feedback] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
