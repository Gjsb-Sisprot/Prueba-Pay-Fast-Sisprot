import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Health check simple is alive. If you see this, the route is working.",
    env_keys: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY"
    ].map(k => ({ key: k, present: !!process.env[k] }))
  });
}
