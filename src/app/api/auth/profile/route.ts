import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function getUserId(request: NextRequest): Promise<string | null> {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) return null;

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user.id;
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, notificationsEnabled } = await request.json();

  // Only allow notifications if email is provided
  const sanitizedEmail = email ? email.trim() : null;
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
}
