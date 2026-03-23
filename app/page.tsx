'use client';

import { useEffect, useRef, useState } from 'react';
import { countFillerWords } from '@/lib/fillerWords';

// ── Types ────────────────────────────────────────────────────────────────────

type AppState =
  | 'gate'
  | 'setup'
  | 'generating'
  | 'speaking'
  | 'answering'
  | 'feedback'
  | 'summary';

interface SessionConfig {
  role: string;
  interviewType: 'behavioural';
  resumeSummary: string;
}

interface Scores {
  clarity: number;
  relevance: number;
  star: number;
  fillerWords: number;
}

interface Answer {
  transcript: string;
  fillerCount: number;
  scores: Scores;
  feedbackText: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatResetTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    role: '',
    interviewType: 'behavioural',
    resumeSummary: '',
  });
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSessionActive = useRef(false);

  // ── Task 5.3: Browser compatibility check ──────────────────────────────────
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    if (!supported) {
      setAppState('gate');
    }
  }, []);

  // ── Task 5.4: beforeunload guard ───────────────────────────────────────────
  useEffect(() => {
    const active = ['speaking', 'answering', 'feedback'].includes(appState);
    isSessionActive.current = active;

    const handler = (e: BeforeUnloadEvent) => {
      if (isSessionActive.current) {
        e.preventDefault();
      }
    };

    if (active) {
      window.addEventListener('beforeunload', handler);
    } else {
      window.removeEventListener('beforeunload', handler);
    }

    return () => window.removeEventListener('beforeunload', handler);
  }, [appState]);

  // ── Task 5.5: Rate limit check + Task 5.6: Question generation ─────────────
  async function handleStart(config: SessionConfig) {
    setError(null);

    const limitRes = await fetch('/api/check-rate-limit', { method: 'POST' });
    const limitData = await limitRes.json();

    if (!limitData.allowed) {
      setRateLimitResetAt(limitData.resetAt);
      return;
    }

    setRateLimitResetAt(null);
    setSessionConfig(config);
    setAppState('generating');

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: config.role,
          resumeSummary: config.resumeSummary,
        }),
      });
      const data = await res.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions returned');
      }

      setQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setAppState('speaking');
    } catch {
      setError('Failed to generate questions. Please try again.');
      setAppState('setup');
    }
  }

  function handleSpeakingDone() {
    setAppState('answering');
  }

  async function handleAnswerDone(transcript: string, fillerCount: number) {
    setAppState('feedback');

    try {
      const res = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions[currentQuestionIndex],
          answer: transcript,
          fillerCount,
        }),
      });
      const data = await res.json();

      const answer: Answer = {
        transcript,
        fillerCount,
        scores: data.scores,
        feedbackText: data.feedback,
      };

      setAnswers((prev) => [...prev, answer]);
    } catch {
      setError('Failed to get feedback. Please try again.');
    }
  }

  function handleNextQuestion() {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setAppState('speaking');
    } else {
      setAppState('summary');
    }
  }

  function handleRestart() {
    setAppState('setup');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setError(null);
    setRateLimitResetAt(null);
    setSessionConfig({ role: '', interviewType: 'behavioural', resumeSummary: '' });
  }

  // ── Task 5.7 & 5.8: State machine render ───────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div aria-live="polite" className="sr-only" />

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171] px-4 py-3 rounded-xl text-sm flex items-center gap-3 z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {appState === 'gate' && (
        <GatePlaceholder onContinue={() => setAppState('setup')} />
      )}

      {(appState === 'setup' || appState === 'generating') && (
        <SetupPlaceholder
          onStart={handleStart}
          isGenerating={appState === 'generating'}
          rateLimitResetAt={rateLimitResetAt}
          formatResetTime={formatResetTime}
        />
      )}

      {appState === 'speaking' && (
        <SpeakingPlaceholder
          question={questions[currentQuestionIndex]}
          questionIndex={currentQuestionIndex}
          total={questions.length}
          onDone={handleSpeakingDone}
        />
      )}

      {appState === 'answering' && (
        <AnsweringPlaceholder
          question={questions[currentQuestionIndex]}
          questionIndex={currentQuestionIndex}
          total={questions.length}
          onAnswerDone={handleAnswerDone}
        />
      )}

      {appState === 'feedback' && answers[currentQuestionIndex] && (
        <FeedbackPlaceholder
          question={questions[currentQuestionIndex]}
          answer={answers[currentQuestionIndex]}
          questionIndex={currentQuestionIndex}
          total={questions.length}
          onNext={handleNextQuestion}
        />
      )}

      {appState === 'feedback' && !answers[currentQuestionIndex] && (
        <div className="text-[#8B92B8] text-sm">Generating feedback...</div>
      )}

      {appState === 'summary' && (
        <SummaryPlaceholder
          answers={answers}
          questions={questions}
          onRestart={handleRestart}
        />
      )}
    </main>
  );
}

// ── Temporary placeholder components (replaced in tasks 6–9) ─────────────────

function GatePlaceholder({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="text-center max-w-md">
      <h1 className="text-2xl font-semibold text-[#F0F2FF] mb-3">CoachMe works best in Chrome or Edge</h1>
      <p className="text-[#8B92B8] mb-6 text-sm">Voice features require the Web Speech API, supported in Chrome and Edge.</p>
      <button onClick={onContinue} className="px-6 py-3 rounded-xl bg-[#6C63FF] text-white text-sm font-medium hover:bg-[#5a52e0] transition-colors">
        Continue without voice
      </button>
    </div>
  );
}

function SetupPlaceholder({
  onStart,
  isGenerating,
  rateLimitResetAt,
  formatResetTime,
}: {
  onStart: (config: SessionConfig) => void;
  isGenerating: boolean;
  rateLimitResetAt: string | null;
  formatResetTime: (iso: string) => string;
}) {
  const [role, setRole] = useState('');
  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-semibold text-[#F0F2FF] mb-6 text-center">Set up your interview</h1>
      <input
        className="w-full bg-[#161926] border border-white/10 rounded-xl px-4 py-3 text-[#F0F2FF] placeholder:text-[#8B92B8] mb-4 outline-none focus:border-[#6C63FF]"
        placeholder="Job role (e.g. Product Manager)"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      {rateLimitResetAt && (
        <p className="text-[#FBBF24] text-sm mb-4 text-center">
          You&apos;ve used today&apos;s session. Come back at {formatResetTime(rateLimitResetAt)}.
        </p>
      )}
      <button
        disabled={!role.trim() || isGenerating || !!rateLimitResetAt}
        onClick={() => onStart({ role: role.trim(), interviewType: 'behavioural', resumeSummary: '' })}
        className="w-full py-3 rounded-xl bg-[#6C63FF] text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5a52e0] transition-colors"
      >
        {isGenerating ? 'Generating questions...' : 'Start Interview'}
      </button>
    </div>
  );
}

function SpeakingPlaceholder({
  question,
  questionIndex,
  total,
  onDone,
}: {
  question: string;
  questionIndex: number;
  total: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = 'en-US';
    utterance.onend = onDone;
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [question, onDone]);

  return (
    <div className="text-center max-w-lg">
      <p className="text-[#8B92B8] text-sm mb-6">Question {questionIndex + 1} of {total}</p>
      <p className="text-[#F0F2FF] text-xl font-medium">{question}</p>
      <p className="text-[#6C63FF] text-sm mt-4">AI is speaking...</p>
    </div>
  );
}

function AnsweringPlaceholder({
  question,
  questionIndex,
  total,
  onAnswerDone,
}: {
  question: string;
  questionIndex: number;
  total: number;
  onAnswerDone: (t: string, f: number) => void;
}) {
  const [transcript, setTranscript] = useState('');

  function handleDone() {
    if (transcript.trim().length >= 10) {
      onAnswerDone(transcript, countFillerWords(transcript));
    }
  }

  return (
    <div className="text-center max-w-lg w-full">
      <p className="text-[#8B92B8] text-sm mb-4">Question {questionIndex + 1} of {total}</p>
      <p className="text-[#8B92B8] text-base mb-4">{question}</p>
      <textarea
        className="w-full bg-[#161926] border border-white/10 rounded-xl px-4 py-3 text-[#F0F2FF] placeholder:text-[#8B92B8] mb-4 outline-none focus:border-[#6C63FF] min-h-[120px]"
        placeholder="Type your answer here..."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />
      <button
        disabled={transcript.trim().length < 10}
        onClick={handleDone}
        className="w-full py-3 rounded-xl bg-[#6C63FF] text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5a52e0] transition-colors"
      >
        Done
      </button>
    </div>
  );
}

function FeedbackPlaceholder({
  question,
  answer,
  questionIndex,
  total,
  onNext,
}: {
  question: string;
  answer: Answer;
  questionIndex: number;
  total: number;
  onNext: () => void;
}) {
  const scoreLabels: Record<string, string> = {
    clarity: 'Clarity',
    relevance: 'Relevance',
    star: 'STAR Structure',
    fillerWords: 'Filler Words',
  };

  return (
    <div className="max-w-lg w-full">
      <p className="text-[#8B92B8] text-sm mb-4 text-center">Question {questionIndex + 1} of {total}</p>
      <p className="text-[#8B92B8] text-sm mb-4 italic">&ldquo;{answer.transcript.slice(0, 100)}{answer.transcript.length > 100 ? '...' : ''}&rdquo;</p>
      <div className="bg-[#161926] rounded-xl p-4 mb-4 border border-white/10">
        <h2 className="text-[#F0F2FF] font-semibold mb-3">Feedback</h2>
        {Object.entries(answer.scores).map(([key, val], i) => (
          <div key={key} className="flex items-center gap-3 mb-2">
            <span className="text-[#8B92B8] text-sm w-28">{scoreLabels[key] ?? key}</span>
            <div className="flex-1 bg-[#1E2235] rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(val as number) * 10}%`,
                  transitionDelay: `${i * 100}ms`,
                  backgroundColor: (val as number) >= 7 ? '#4ADE80' : (val as number) >= 4 ? '#FBBF24' : '#F87171',
                }}
              />
            </div>
            <span className="text-[#F0F2FF] text-sm w-8 text-right">{val}/10</span>
          </div>
        ))}
        <p className="text-[#8B92B8] text-sm mt-3 leading-relaxed">{answer.feedbackText}</p>
      </div>
      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5a52e0] transition-colors"
      >
        {questionIndex + 1 < total ? 'Next Question →' : 'See Final Results →'}
      </button>
    </div>
  );
}

function SummaryPlaceholder({
  answers,
  questions,
  onRestart,
}: {
  answers: Answer[];
  questions: string[];
  onRestart: () => void;
}) {
  const allScores = answers.flatMap((a) => Object.values(a.scores) as number[]);
  const overall = Math.round((allScores.reduce((s, v) => s + v, 0) / (4 * answers.length)) * 10);
  const verdict = overall >= 75 ? 'Strong Offer' : overall >= 50 ? 'On the Fence' : 'Not This Time';
  const verdictColor = overall >= 75 ? '#4ADE80' : overall >= 50 ? '#FBBF24' : '#F87171';

  const avgScores = ['clarity', 'relevance', 'star', 'fillerWords'].map((key) => ({
    key,
    avg: Math.round(answers.reduce((s, a) => s + (a.scores[key as keyof Scores] ?? 0), 0) / answers.length),
  }));

  const scoreLabels: Record<string, string> = {
    clarity: 'Clarity',
    relevance: 'Relevance',
    star: 'STAR Structure',
    fillerWords: 'Filler Words',
  };

  return (
    <div className="max-w-lg w-full text-center">
      <div className="text-7xl font-bold mb-1" style={{ color: '#6C63FF' }}>{overall}</div>
      <div className="text-[#8B92B8] text-sm mb-6">/100 Overall Score</div>

      <div className="bg-[#161926] rounded-xl p-4 mb-4 border-l-4 text-left" style={{ borderColor: verdictColor }}>
        <h2 className="text-[#F0F2FF] font-semibold mb-1">{verdict}</h2>
        <p className="text-[#8B92B8] text-sm">Based on your {questions.length} answers across clarity, relevance, STAR structure, and filler words.</p>
      </div>

      <div className="bg-[#161926] rounded-xl p-4 mb-6 border border-white/10 text-left">
        <h3 className="text-[#F0F2FF] font-semibold mb-3">Session Average</h3>
        {avgScores.map(({ key, avg }, i) => (
          <div key={key} className="flex items-center gap-3 mb-2">
            <span className="text-[#8B92B8] text-sm w-28">{scoreLabels[key]}</span>
            <div className="flex-1 bg-[#1E2235] rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${avg * 10}%`,
                  transitionDelay: `${i * 100}ms`,
                  backgroundColor: avg >= 7 ? '#4ADE80' : avg >= 4 ? '#FBBF24' : '#F87171',
                }}
              />
            </div>
            <span className="text-[#F0F2FF] text-sm w-8 text-right">{avg}/10</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button className="flex-1 py-3 rounded-xl border border-white/10 text-[#8B92B8] text-sm hover:border-white/20 transition-colors">
          Try Again Tomorrow
        </button>
        <button
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl bg-[#6C63FF] text-white font-semibold hover:bg-[#5a52e0] transition-colors"
        >
          New Interview
        </button>
      </div>
    </div>
  );
}
