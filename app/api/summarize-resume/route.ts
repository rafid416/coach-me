import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text || text.length < 100) {
    return NextResponse.json({ summary: '' });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are a resume parser. Summarize the following resume in 150-200 tokens. Focus on: current/most recent role, total years of experience, key technical and soft skills, and 1-2 notable projects or achievements. Be concise and factual.',
      },
      {
        role: 'user',
        content: text,
      },
    ],
    max_tokens: 200,
  });

  const summary = completion.choices[0]?.message?.content ?? '';
  return NextResponse.json({ summary });
}
