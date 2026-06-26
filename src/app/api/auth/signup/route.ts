import { NextRequest, NextResponse } from "next/server";
import { supabase, logAppEvent } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, notificationsEnabled } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if username is taken
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Create auth user with fake email (Supabase requires email)
    const fakeEmail = `${username.toLowerCase()}@articles-daily.app`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true, // Skip email verification
    });

    if (authError || !authData.user) {
      console.error("[Auth] Failed to create user:", authError);
      await logAppEvent("error", "auth-signup", "Failed to create auth user", {
        error: authError?.message || "Unknown error",
      });
      return NextResponse.json(
        { error: authError?.message || "Failed to create account" },
        { status: 500 }
      );
    }

    // Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        username,
        email: email || null,
        notifications_enabled: notificationsEnabled || false,
      });

    if (profileError) {
      console.error("[Auth] Failed to create profile:", profileError);
      await logAppEvent("error", "auth-signup", "Failed to create profile", {
        error: profileError.message,
        userId: authData.user.id,
      });
      // Clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    // Sign in to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: "Account created but sign-in failed. Try signing in." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      user: {
        id: authData.user.id,
        username,
        email: email || null,
        notificationsEnabled: notificationsEnabled || false,
      },
    });

    // Set session cookie
    response.cookies.set("access_token", signInData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    response.cookies.set("refresh_token", signInData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Auth] Signup error:", error);
    await logAppEvent("error", "auth-signup", "Unexpected signup error", {
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
