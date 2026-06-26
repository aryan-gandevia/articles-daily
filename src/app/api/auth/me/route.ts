import { NextRequest, NextResponse } from "next/server";
import { supabase, logAppEvent } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ user: null });
    }

    // Verify the token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      // Try refresh token
      const refreshToken = request.cookies.get("refresh_token")?.value;
      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (!refreshError && refreshData.session && refreshData.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", refreshData.user.id)
            .single();

          const response = NextResponse.json({
            user: {
              id: refreshData.user.id,
              username: profile?.username || "Unknown",
              email: profile?.email || null,
              notificationsEnabled: profile?.notifications_enabled || false,
            },
          });

          // Update cookies with new tokens
          response.cookies.set("access_token", refreshData.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
          });

          response.cookies.set("refresh_token", refreshData.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
          });

          return response;
        }
      }

      return NextResponse.json({ user: null });
    }

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        username: profile?.username || "Unknown",
        email: profile?.email || null,
        notificationsEnabled: profile?.notifications_enabled || false,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Auth] Me error:", error);
    await logAppEvent("error", "auth-me", "Failed to fetch current user", {
      error: errorMessage,
    });
    return NextResponse.json({ user: null });
  }
}
