import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Authentication requires the Pages API." }, {
      status: 401, headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({
    email: "dev@local",
    github: true,
    storage: true,
  });
}
