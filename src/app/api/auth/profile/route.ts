import { NextRequest, NextResponse } from "next/server";
import { supabase, logAppEvent, getSubscriberCount } from "@/lib/supabase";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAX_SUBSCRIBERS = 70;

async function getUserId(request: NextRequest): Promise<string | null> {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) return null;

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user.id;
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, notificationsEnabled } = await request.json();

    // Only allow notifications if email is provided
    const sanitizedEmail = email ? email.trim() : null;

    if (sanitizedEmail && !EMAIL_REGEX.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Enforce subscriber cap if enabling notifications
    if (notificationsEnabled && sanitizedEmail) {
      const subscriberCount = await getSubscriberCount();
      const { data: currentUser } = await supabase
        .from("profiles")
        .select("notifications_enabled")
        .eq("id", userId)
        .single();
      const alreadySubscribed = currentUser?.notifications_enabled || false;

      if (!alreadySubscribed && subscriberCount >= MAX_SUBSCRIBERS) {
        return NextResponse.json(
          { error: "Daily digest subscriptions are temporarily full. Please try again later." },
          { status: 409 }
        );
      }
    }

    const finalNotificationsEnabled = notificationsEnabled && !!sanitizedEmail;

    // Check if profile exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from("profiles")
        .update({
          email: sanitizedEmail,
          notifications_enabled: finalNotificationsEnabled,
        })
        .eq("id", userId);
    } else {
      // Should not normally happen (profile created at signup), but handle it
      const { data: usernameData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();
      result = await supabase.from("profiles").insert({
        id: userId,
        username: usernameData?.username || "unknown",
        email: sanitizedEmail,
        notifications_enabled: finalNotificationsEnabled,
      });
    }

    if (result.error) {
      console.error("[Profile] Failed to update profile:", result.error);
      await logAppEvent("error", "api-profile", "Failed to update profile", {
        error: result.error.message,
        userId,
      });
      return NextResponse.json(
        { error: `Failed to update profile: ${result.error.message || result.error.code}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email: sanitizedEmail,
      notificationsEnabled: finalNotificationsEnabled,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Profile] Error:", error);
    await logAppEvent("error", "api-profile", "Unexpected profile update error", {
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
