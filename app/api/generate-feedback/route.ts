import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Delimiter separating the JSON scores line from the streamed feedback text
const DELIMITER = '---';

export async function POST(req: NextRequest) {
  const { question, answer, resumeSummary } = await req.json();

  const levelNote = resumeSummary
    ? `Resume summary: ${resumeSummary}`
    : 'No resume provided — evaluate at mid-level standard (2–5 years experience).';

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are an expert interview coach evaluating a candidate's behavioural interview answer.

First, determine the candidate's experience level from the resume summary:
- Entry-level: 0–2 years experience or student/graduate
- Mid-level: 2–5 years experience
- Senior: 5+ years experience

${levelNote}

Respond in exactly two parts:

PART 1 — Output a single JSON object on one line with no extra whitespace:
{"star":<0-10>,"relevance":<0-10>,"ownership":<0-10>,"conciseness":<0-10>,"confidence":<0-10>}

PART 2 — Output the delimiter ${DELIMITER} on its own line, then 2–4 sentences of specific, actionable plain-text feedback.

Scoring rubric (apply stricter standards for higher experience levels):

- star (STAR Structure):
  Entry: 8–10=clear Situation/Task/Action/Result with some outcome; 5–7=partial structure or vague result; 0–4=no recognisable structure
  Mid: 8–10=full STAR with specific result; 5–7=missing one element or result is vague; 0–4=poor or no structure
  Senior: 8–10=full STAR with quantified/measurable result; 5–7=result present but not quantified; 0–4=missing structure or result

- relevance (Answers the question):
  Entry: 8–10=directly addresses the question; 5–7=mostly on topic with minor tangents; 0–4=misses the question
  Mid: 8–10=precise and fully on topic; 5–7=partially relevant; 0–4=does not answer the question
  Senior: 8–10=precise, no tangents, addresses nuance of the question; 5–7=mostly relevant; 0–4=off topic

- ownership (Personal accountability):
  Entry: 8–10=uses "I" clearly for own actions; 5–7=mix of "I" and "we"; 0–4=mostly "we" or passive voice
  Mid: 8–10=strong "I did X, I decided Y" throughout; 5–7=some vague team attribution; 0–4=hides behind team
  Senior: 8–10=clear personal ownership with leadership context; 5–7=some shared credit without clarity; 0–4=deflects to team

- conciseness (Focused, no rambling):
  Entry: 8–10=clear and on point; 5–7=some unnecessary detail; 0–4=significantly off track
  Mid: 8–10=tight and efficient; 5–7=some padding; 0–4=rambling or repetitive
  Senior: 8–10=precise with no filler; 5–7=minor padding; 0–4=unfocused or over-explained

- confidence (Assertive language):
  Entry: 8–10=mostly assertive; 5–7=some hedging ("I think", "maybe"); 0–4=frequent uncertainty
  Mid: 8–10=decisive and direct; 5–7=occasional hedging; 0–4=frequent hedging or self-doubt
  Senior: 8–10=fully assertive, no hedging; 5–7=minor softening; 0–4=hedging undermines credibility

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
