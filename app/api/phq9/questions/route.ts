import { NextResponse } from 'next/server';

const PHQ9_BANK = [
  "Little interest or pleasure in doing things?",
  "Not feeling excited or motivated to engage in activities you usually enjoy?",
  "Feeling disconnected from hobbies, social activities, or things that used to bring joy?",
  "Feeling down, depressed, or hopeless?",
  "Experiencing persistent sadness or a heavy feeling in your chest?",
  "Feeling like things won't get better or feeling emotionally empty?",
  "Trouble falling or staying asleep, or sleeping too much?",
  "Having difficulty with your sleep routine - either too much or too little?",
  "Finding it hard to fall asleep, waking up frequently, or sleeping well past your normal time?",
  "Feeling tired or having little energy?",
  "Struggling with fatigue that affects your daily activities?",
  "Finding it hard to muster energy for even simple tasks?",
  "Poor appetite or overeating?",
  "Noticing changes in your eating patterns - either losing or gaining weight?",
  "Feeling disconnected from food or using food as an emotional response?",
  "Feeling bad about yourself or that you are a failure?",
  "Criticizing yourself harshly or feeling like you're not good enough?",
  "Experiencing feelings of worthlessness or excessive guilt?",
  "Trouble concentrating on things?",
  "Finding it hard to focus on tasks, conversations, or decisions?",
  "Noticing your mind wandering or struggling to remember things?",
  "Moving or speaking slowly / being fidgety or restless?",
  "Noticing changes in how you move or speak - feeling slowed down or agitated?",
  "Feeling physically restless or noticing others commenting on your pace?",
  "Thoughts that you would be better off dead or hurting yourself?",
  "Having thoughts of self-harm or feeling like others would be better without you?",
  "Experiencing thoughts of ending your life or harming yourself?",
];

const CRITERIA_WEIGHTS = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { answers, textContext, previousQuestions } = body;

    const apiKey = process.env.OLLAMA_CLOUD_API_KEY?.trim();
    const apiUrl = (process.env.OLLAMA_CLOUD_API_URL || "https://api.ollama.com/v1/chat/completions").trim();
    const model = (process.env.OLLAMA_CLOUD_MODEL || "llama3.1:70b").trim();

    if (Array.isArray(answers)) {
      const total = answers.reduce((a: number, b: number) => a + b, 0);
      const score = total / 27.0;
      let severity = "Minimal";
      if (total >= 20) severity = "Severe";
      else if (total >= 15) severity = "Moderately Severe";
      else if (total >= 10) severity = "Moderate";
      else if (total >= 5) severity = "Mild";
      return NextResponse.json({ phq9_score: score, phq9_total: total, phq9_severity: severity });
    }

    if (apiKey && textContext) {
      const systemPrompt = `You are a clinical assessment designer for a mental health screening tool. Generate exactly 9 PHQ-9 screening questions that are situationally relevant to the user's context.

RULES:
1. Return ONLY a valid JSON array of 9 strings
2. Each question must map to one of the 9 PHQ-9 clinical criteria (in order):
   - Anhedonia (loss of interest/pleasure)
   - Depressed mood (sadness, hopelessness)
   - Sleep disturbance (insomnia, hypersomnia)
   - Fatigue (low energy, tiredness)
   - Appetite/weight changes
   - Self-worth (negative self-perception)
   - Concentration difficulties
   - Psychomotor changes (agitation, retardation)
   - Suicidal ideation (self-harm thoughts)
3. Questions should be contextually relevant to what the user has described
4. Maintain clinical accuracy - each question must be assessable on the PHQ-9 severity scale
5. Keep questions clear, simple, and non-leading
6. For criterion 9 (suicidal ideation), always include a safety message

Return format: ["Question 1", "Question 2", ..., "Question 9"]`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Based on this context, generate 9 situationally relevant PHQ-9 questions:\n\n"${textContext}"\n\n${previousQuestions ? `\nAvoid these previously used questions: ${JSON.stringify(previousQuestions)}` : ""}` }
            ],
            temperature: 0.3,
            max_tokens: 800,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content ?? data?.message?.content ?? "[]";
          const match = content.match(/\[[\s\S]*\]/);
          const jsonStr = match ? match[0] : content;
          const parsed = JSON.parse(jsonStr);

          if (Array.isArray(parsed) && parsed.length === 9) {
            return NextResponse.json({ questions: parsed });
          }
        }
      } catch (e) {
        console.error("LLM question generation failed, using fallback:", e);
      }
    }

    const shuffled = [...PHQ9_BANK].sort(() => Math.random() - 0.5);
    const selected: string[] = [];
    for (let criterion = 0; criterion < 9; criterion++) {
      const startIdx = criterion * 3;
      const options = shuffled.slice(startIdx, startIdx + 3);
      selected.push(options[Math.floor(Math.random() * 3)] || PHQ9_BANK[criterion * 3]);
    }

    return NextResponse.json({ questions: selected });
  } catch (err: any) {
    console.error("PHQ-9 generation error:", err);
    return NextResponse.json({
      questions: PHQ9_BANK.filter((_, i) => i % 3 === 0)
    });
  }
}
