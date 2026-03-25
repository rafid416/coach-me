import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

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
Each question must require a STAR-format answer (Situation, Task, Action, Result).

Competency pool — randomly select 3 DIFFERENT competencies from this list each time, never repeating the same combination:
teamwork, leadership, conflict resolution, problem solving, adaptability, communication, time management, decision making under pressure, initiative, stakeholder management, mentoring, dealing with failure, prioritisation, influencing without authority, handling ambiguity, accountability, creativity, resilience, cross-functional collaboration, giving or receiving feedback

Rules:
- Pick 3 competencies at random — do not default to the same ones every session
- Each question must target a different competency
- Questions must be specific and realistic for a ${role} role
- Do not ask generic questions that could apply to any role
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

  try {
    const parsed = JSON.parse(content);
    const questions: string[] = parsed.questions ?? [];
    return NextResponse.json({ questions });
  } catch {
    console.error('[generate-questions] Failed to parse JSON:', content);
    return NextResponse.json({ questions: [] }, { status: 500 });
  }
}
