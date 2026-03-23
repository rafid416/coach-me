import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { questions, answers, scores } = await req.json();

  const sessionSummary = questions
    .map((q: string, i: number) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i]}`)
    .join('\n\n');

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a senior hiring manager delivering a final assessment after a behavioural interview.

Review the candidate's full interview session and scores, then provide:
1. A verdict: one of exactly "Strong Offer", "On the Fence", or "Not This Time"
   - "Strong Offer": overall performance was strong and consistent
   - "On the Fence": mixed performance, some strengths but notable gaps
   - "Not This Time": significant gaps across most answers
2. A warm, honest 2-3 sentence rationale explaining the verdict as if speaking directly to the candidate
3. Exactly 2-3 specific, actionable improvement tips as short bullet points

Return a JSON object in this exact format:
{
  "verdict": "Strong Offer" | "On the Fence" | "Not This Time",
  "rationale": "<2-3 sentences spoken directly to the candidate>",
  "tips": ["tip 1", "tip 2", "tip 3"]
}`,
      },
      {
        role: 'user',
        content: `Interview session:\n\n${sessionSummary}\n\nScores per answer: ${JSON.stringify(scores)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content);

  return NextResponse.json(parsed);
}
