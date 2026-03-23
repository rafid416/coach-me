import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { question, answer, fillerCount } = await req.json();

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert interview coach evaluating a candidate's answer to a behavioural interview question.

Score the answer across 4 dimensions (each 0-10):
- clarity: How clearly and concisely did they communicate their point?
- relevance: How well did the answer address the specific question asked?
- star: How well did they follow the STAR format (Situation, Task, Action, Result)?
- fillerWords: Based on the filler word count provided, score accordingly. 0 fillers = 10, 1-2 = 8, 3-5 = 6, 6-9 = 4, 10+ = 2.

The candidate used ${fillerCount} filler word(s) in their answer.

Also provide 2-4 sentences of specific, actionable written feedback explaining the scores and what they could improve.

Return a JSON object in this exact format:
{
  "scores": {
    "clarity": <number 0-10>,
    "relevance": <number 0-10>,
    "star": <number 0-10>,
    "fillerWords": <number 0-10>
  },
  "feedback": "<2-4 sentences of actionable feedback>"
}`,
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nAnswer: ${answer}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content);

  return NextResponse.json(parsed);
}
