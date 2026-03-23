'use client';

import { useEffect, useRef, useState } from 'react';
import Orb from './Orb';
import ProgressBar from './ProgressBar';
import ScoreBar from './ScoreBar';

interface Scores {
  clarity: number;
  relevance: number;
  star: number;
  fillerWords: number;
}

interface FeedbackScreenProps {
  question: string;
  transcript: string;
  fillerCount: number;
  questionIndex: number;
  total: number;
  onNext: (scores: Scores, feedbackText: string) => void;
}

const SCORE_LABELS: Record<keyof Scores, string> = {
  clarity: 'Clarity',
  relevance: 'Relevance',
  star: 'STAR Structure',
  fillerWords: 'Filler Words',
};

export default function FeedbackScreen({
  question,
  transcript,
  fillerCount,
  questionIndex,
  total,
  onNext,
}: FeedbackScreenProps) {
  const [scores, setScores] = useState<Scores | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchFeedback() {
      try {
        const res = await fetch('/api/generate-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, answer: transcript, fillerCount }),
        });
        const data = await res.json();
        setScores(data.scores ?? null);
        setFeedbackText(data.feedback ?? '');
      } catch {
        setScores(null);
        setFeedbackText('Could not load feedback. Please continue.');
      } finally {
        setLoading(false);
      }
    }

    fetchFeedback();
  }, [question, transcript, fillerCount]);

  const isLastQuestion = questionIndex + 1 === total;
  const truncated = transcript.length > 100;
  const displayTranscript = expanded ? transcript : transcript.slice(0, 100);

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] px-4 gap-6">
      <ProgressBar current={questionIndex + 1} total={total} />

      <Orb state="static" size="lg" />

      {/* Transcript quote */}
      <div className="w-full bg-[#1E2235] rounded-xl px-4 py-3 border-l-2 border-[#6C63FF]/40">
        <p className="text-[#8B92B8] text-sm italic leading-relaxed">
          &ldquo;{displayTranscript}{!expanded && truncated ? '...' : ''}&rdquo;
        </p>
        {truncated && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[#6C63FF] text-xs mt-1 hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Feedback card */}
      <div className="w-full bg-[#161926] rounded-2xl border border-white/[0.06] p-5 space-y-4">
        <h2 className="text-[#F0F2FF] font-semibold">Feedback</h2>

        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="w-4 h-4 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#8B92B8] text-sm">Analysing your answer...</span>
          </div>
        ) : (
          <>
            {scores && (
              <div className="space-y-3">
                {(Object.keys(SCORE_LABELS) as (keyof Scores)[]).map((key, i) => (
                  <ScoreBar
                    key={key}
                    label={SCORE_LABELS[key]}
                    score={scores[key]}
                    index={i}
                  />
                ))}
              </div>
            )}

            {/* Reserved height container prevents layout shift */}
            <div className="min-h-[60px]">
              {feedbackText && (
                <p className={`text-sm leading-relaxed ${!scores ? 'text-[#F87171]' : 'text-[#8B92B8]'}`}>
                  {feedbackText}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <button
        disabled={loading}
        onClick={() => onNext(scores ?? { clarity: 0, relevance: 0, star: 0, fillerWords: 0 }, feedbackText)}
        className="w-full py-3 rounded-xl bg-[#6C63FF] text-white font-semibold text-sm hover:bg-[#5a52e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#0D0F1A]"
      >
        {isLastQuestion ? 'See Final Results →' : 'Next Question →'}
      </button>
    </div>
  );
}
