import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Delimiter separating the JSON scores line from the streamed feedback text
const DELIMITER = '---';

export async function POST(req: NextRequest) {
  const { question, answer, fillerCount } = await req.json();

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are an expert interview coach evaluating a candidate's behavioural interview answer.

Respond in exactly two parts:

PART 1 — Output a single JSON object on one line with no extra whitespace:
{"clarity":<0-10>,"relevance":<0-10>,"star":<0-10>,"fillerWords":<0-10>}

PART 2 — Output the delimiter ${DELIMITER} on its own line, then 2–4 sentences of specific, actionable plain-text feedback.

Scoring guide:
- clarity: How clearly and concisely they communicated
- relevance: How well the answer addressed the specific question
- star: How well they structured using STAR (Situation, Task, Action, Result)
- fillerWords: ${fillerCount} filler words used — 0 fillers=10, 1–2=8, 3–5=6, 6–9=4, 10+=2

Output nothing else. No preamble before the JSON.`,
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nAnswer: ${answer}`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let buffer = '';
      let scoresEmitted = false;

      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (!text) continue;
          buffer += text;

          if (!scoresEmitted) {
            const delimIdx = buffer.indexOf(DELIMITER);
            if (delimIdx !== -1) {
              // Parse scores from everything before the delimiter
              const scoresPart = buffer.slice(0, delimIdx).trim();
              try {
                const scores = JSON.parse(scoresPart);
                controller.enqueue(encoder.encode(JSON.stringify(scores) + '\n'));
              } catch {
                console.error('[generate-feedback] Failed to parse scores:', scoresPart);
                controller.enqueue(
                  encoder.encode(JSON.stringify({ clarity: 5, relevance: 5, star: 5, fillerWords: 5 }) + '\n')
                );
              }
              scoresEmitted = true;
              // Emit any feedback text already buffered after the delimiter
              const afterDelim = buffer.slice(delimIdx + DELIMITER.length).replace(/^\n/, '');
              if (afterDelim) controller.enqueue(encoder.encode(afterDelim));
              buffer = '';
            }
          } else {
            controller.enqueue(encoder.encode(text));
            buffer = '';
          }
        }

        // Fallback: delimiter never appeared — try parsing entire buffer as old JSON format
        if (!scoresEmitted && buffer) {
          try {
            const parsed = JSON.parse(buffer.trim());
            const scores = parsed.scores ?? parsed;
            controller.enqueue(encoder.encode(JSON.stringify(scores) + '\n'));
            if (parsed.feedback) controller.enqueue(encoder.encode(parsed.feedback));
          } catch {
            controller.enqueue(
              encoder.encode(JSON.stringify({ clarity: 5, relevance: 5, star: 5, fillerWords: 5 }) + '\n')
            );
          }
        }
      } catch (err) {
        console.error('[generate-feedback] Stream error:', err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
