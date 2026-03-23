import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { role, resumeSummary } = await req.json();

  const resumeContext = resumeSummary
    ? `\n\nCandidate background:\n${resumeSummary}`
    : '';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an experienced interviewer. Generate exactly 3 distinct behavioural interview questions for a ${role} role.
Each question should require a STAR-format answer (Situation, Task, Action, Result).
Questions should be specific, realistic, and progressively explore different competencies (e.g. teamwork, leadership, conflict resolution, problem solving).
${resumeContext}
Return a JSON object in this exact format: { "questions": ["question 1", "question 2", "question 3"] }`,
      },
      {
        role: 'user',
        content: `Generate 3 behavioural interview questions for a ${role} position.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content);
  const questions: string[] = parsed.questions ?? [];

  return NextResponse.json({ questions });
}
