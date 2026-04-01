import { NextResponse } from "next/server";

// DEPRECATED: Use /api/analyze instead
// This route redirects for backward compatibility
export async function POST(req: Request) {
  const body = await req.json();
  const url = new URL("/api/analyze", req.url);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
