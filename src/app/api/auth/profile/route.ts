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

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("[Profile] Failed to fetch profile:", fetchError);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }

  // Only allow notifications if email is provided
  const sanitizedEmail = email ? email.trim() : null;
  const finalNotificationsEnabled = notificationsEnabled && !!sanitizedEmail;

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email: sanitizedEmail,
      notifications_enabled: finalNotificationsEnabled,
    }, { onConflict: "id" });

  if (updateError) {
    console.error("[Profile] Failed to update profile:", updateError);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email: sanitizedEmail,
    notificationsEnabled: finalNotificationsEnabled,
  });
}
