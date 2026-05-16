import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { answers } = await request.json();
    if (!Array.isArray(answers)) return NextResponse.json({ error: "Invalid answers" }, { status: 400 });

    const total = answers.reduce((a, b) => a + b, 0);
    const score = total / 27.0; // Max PHQ-9 is 27

    let severity = "Minimal";
    if (total >= 20) severity = "Severe";
    else if (total >= 15) severity = "Moderately Severe";
    else if (total >= 10) severity = "Moderate";
    else if (total >= 5) severity = "Mild";

    return NextResponse.json({ phq9_score: score, phq9_total: total, phq9_severity: severity });
  } catch (err: any) {
    return NextResponse.json({ phq9_score: 0, phq9_total: 0, phq9_severity: "Unknown" });
  }
}
