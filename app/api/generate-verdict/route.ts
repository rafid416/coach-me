import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { questions, answers, scores, overallScore } = await req.json();

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
1. A verdict based strictly on the overall score provided. Use exactly one of these five values:
   - "Strong Offer": overall score 85–100
   - "Offer": overall score 70–84
   - "On the Fence": overall score 50–69
   - "Not This Time": overall score 25–49
   - "Hard Pass": overall score 0–24
   The verdict MUST match the score threshold — do not override it based on your own assessment.
2. A warm, honest 2-3 sentence rationale explaining the verdict as if speaking directly to the candidate
3. Exactly 2-3 specific, actionable improvement tips as short bullet points

Return a JSON object in this exact format:
{
  "verdict": "Strong Offer" | "Offer" | "On the Fence" | "Not This Time" | "Hard Pass",
  "rationale": "<2-3 sentences spoken directly to the candidate>",
  "tips": ["tip 1", "tip 2", "tip 3"]
}`,
      },
      {
        role: 'user',
        content: `Interview session:\n\n${sessionSummary}\n\nScores per answer: ${JSON.stringify(scores)}\n\nOverall score: ${overallScore}/100`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    console.error('[generate-verdict] Failed to parse JSON:', content);
    return NextResponse.json({ error: 'Invalid response from model' }, { status: 500 });
  }
}
