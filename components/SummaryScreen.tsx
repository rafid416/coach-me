'use client';

import { useEffect, useRef, useState } from 'react';
import Orb from './Orb';
import ScoreBar from './ScoreBar';

interface Scores {
  star: number;
  relevance: number;
  ownership: number;
  conciseness: number;
  confidence: number;
}

interface Answer {
  transcript: string;
  fillerCount: number;
  scores: Scores;
  feedbackText: string;
}

interface VerdictData {
  verdict: 'Strong Offer' | 'Offer' | 'On the Fence' | 'Not This Time' | 'Hard Pass';
  rationale: string;
  tips: string[];
}

interface SummaryScreenProps {
  questions: string[];
  answers: Answer[];
  onRestart: () => void;
}

const SCORE_KEYS: (keyof Scores)[] = ['star', 'relevance', 'ownership', 'conciseness', 'confidence'];
const SCORE_LABELS: Record<keyof Scores, string> = {
  star: 'STAR Structure',
  relevance: 'Relevance',
  ownership: 'Ownership',
  conciseness: 'Conciseness',
  confidence: 'Confidence',
};

function getVerdictColor(verdict: string): string {
  if (verdict === 'Strong Offer') return '#4ADE80';
  if (verdict === 'Offer') return '#86EFAC';
  if (verdict === 'On the Fence') return '#FBBF24';
  if (verdict === 'Not This Time') return '#F87171';
  return '#EF4444'; // Hard Pass
}

export default function SummaryScreen({ questions, answers, onRestart }: SummaryScreenProps) {
  const [verdictData, setVerdictData] = useState<VerdictData | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  // Compute overall score
  const allValues = answers.flatMap((a) => SCORE_KEYS.map((k) => a.scores[k]));
  const overall = Math.round((allValues.reduce((s, v) => s + v, 0) / (5 * answers.length)) * 10);

  // Compute averaged scores per dimension
  const avgScores = SCORE_KEYS.map((key) => ({
    key,
    avg: Math.round(
      answers.reduce((s, a) => s + a.scores[key], 0) / answers.length
    ),
  }));

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchVerdict() {
      try {
        const res = await fetch('/api/generate-verdict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions,
            answers: answers.map((a) => a.transcript),
            scores: answers.map((a) => a.scores),
            overallScore: overall,
          }),
        });
        const data = await res.json();
        setVerdictData(data);

        // Write rate limit record
        await fetch('/api/complete-session', { method: 'POST' }).catch(() => {});
      } catch {
        // Fallback verdict if API fails
        const fallback: VerdictData = {
          verdict: overall >= 85 ? 'Strong Offer' : overall >= 70 ? 'Offer' : overall >= 50 ? 'On the Fence' : overall >= 25 ? 'Not This Time' : 'Hard Pass',
          rationale: 'Your session has been completed. Keep practising to improve your scores.',
          tips: ['Work on structuring answers using the STAR format.', 'Reduce filler words by pausing instead of filling silence.'],
        };
        setVerdictData(fallback);
        await fetch('/api/complete-session', { method: 'POST' }).catch(() => {});
      } finally {
        setLoading(false);
      }
    }

    fetchVerdict();
  }, [questions, answers]); // eslint-disable-line react-hooks/exhaustive-deps

  const verdictColor = verdictData ? getVerdictColor(verdictData.verdict) : '#6C63FF';

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] px-4 gap-6">
      <Orb state="static" size="sm" />

      {/* Overall score */}
      <div className="text-center">
        <div className="flex items-end justify-center gap-1">
          <span className="text-[#6C63FF] font-bold leading-none text-6xl sm:text-7xl">
            {overall}
          </span>
          <span className="text-[#8B92B8] text-xl sm:text-2xl mb-2 sm:mb-3">/100</span>
        </div>
        <p className="text-[#8B92B8] text-sm">Overall Score</p>
      </div>

      {/* Verdict card */}
      {loading ? (
        <div className="w-full bg-[#161926] rounded-2xl border border-white/[0.06] p-4 sm:p-5 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-[#8B92B8] text-sm">Generating your verdict...</span>
        </div>
      ) : verdictData && (
        <div
          className="w-full bg-[#161926] rounded-2xl border border-white/[0.06] p-4 sm:p-5 border-l-4"
          style={{ borderLeftColor: verdictColor }}
        >
          <h2 className="text-[#F0F2FF] font-semibold text-lg mb-2">{verdictData.verdict}</h2>
          <p className="text-[#8B92B8] text-sm leading-relaxed">{verdictData.rationale}</p>
        </div>
      )}

      {/* Averaged score bars */}
      <div className="w-full bg-[#161926] rounded-2xl border border-white/[0.06] p-4 sm:p-5 space-y-3">
        <h3 className="text-[#F0F2FF] font-semibold text-sm">Session Average</h3>
        {avgScores.map(({ key, avg }, i) => (
          <ScoreBar key={key} label={SCORE_LABELS[key]} score={avg} index={i} />
        ))}
      </div>

      {/* Improvement tips */}
      {verdictData?.tips && verdictData.tips.length > 0 && (
        <div className="w-full bg-[#161926] rounded-2xl border border-white/[0.06] p-4 sm:p-5">
          <h3 className="text-[#F0F2FF] font-semibold text-sm mb-3">Focus on these next time</h3>
          <ul className="space-y-2">
            {verdictData.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#6C63FF] mt-0.5 flex-shrink-0">•</span>
                <span className="text-[#8B92B8] text-sm leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Buttons */}
      <div className="w-full flex flex-col-reverse sm:flex-row gap-3">
        <button className="flex-1 py-3 rounded-xl border border-white/10 text-[#8B92B8] text-sm hover:border-white/20 hover:text-[#F0F2FF] transition-colors">
          Try Again Tomorrow
        </button>
        <button
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl bg-[#6C63FF] text-white font-semibold text-sm hover:bg-[#5a52e0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#0D0F1A]"
        >
          New Interview
        </button>
      </div>
    </div>
  );
}
