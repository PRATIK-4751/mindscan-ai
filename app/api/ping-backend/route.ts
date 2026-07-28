import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_URL || "";
    if (backendUrl) {
      const response = await fetch(`${backendUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      return NextResponse.json({ status: "success", backend: data });
    }
    return NextResponse.json({ status: "skipped", message: "No backend URL configured" });
  } catch (err: any) {
    return NextResponse.json({ status: "error", error: err.message }, { status: 500 });
  }
}
