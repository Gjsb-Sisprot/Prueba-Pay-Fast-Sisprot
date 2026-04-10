import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/modules/assistant/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      is_configured: isSupabaseConfigured,
    },
    tables: {
      conversations: "pending",
      chat_logs: "pending",
    }
  };

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      status: "error",
      message: "Supabase environment variables are missing.",
      diagnostics
    }, { status: 500 });
  }

  try {
    // Test 1: Query Conversations
    const { count: convCount, error: convError } = await supabase
      .from("conversations")
      .select("*", { count: 'exact', head: true });

    if (convError) {
      diagnostics.tables.conversations = { status: "error", code: convError.code, message: convError.message };
    } else {
      diagnostics.tables.conversations = { status: "ok", count: convCount };
    }

    // Test 2: Query Chat Logs
    const { count: logCount, error: logError } = await supabase
      .from("chat_logs")
      .select("*", { count: 'exact', head: true });

    if (logError) {
      diagnostics.tables.chat_logs = { status: "error", code: logError.code, message: logError.message };
    } else {
      diagnostics.tables.chat_logs = { status: "ok", count: logCount };
    }

    const hasErrors = diagnostics.tables.conversations.status === "error" || 
                      diagnostics.tables.chat_logs.status === "error";

    return NextResponse.json({
      status: hasErrors ? "partial_error" : "ok",
      diagnostics
    });

  } catch (err: any) {
    return NextResponse.json({
      status: "critical_error",
      message: err.message,
      diagnostics
    }, { status: 500 });
  }
}
