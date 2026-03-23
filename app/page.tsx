'use client';

import { useEffect, useRef, useState } from 'react';
import SetupScreen from '@/components/SetupScreen';
import SpeakingScreen from '@/components/SpeakingScreen';
import AnsweringScreen from '@/components/AnsweringScreen';
import FeedbackScreen from '@/components/FeedbackScreen';
import SummaryScreen from '@/components/SummaryScreen';

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
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSessionActive = useRef(false);
  const announceRef = useRef<HTMLDivElement>(null);

  function announce(msg: string) {
    if (announceRef.current) announceRef.current.textContent = msg;
  }

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

  function handleAnswerDone(transcript: string, fillerCount: number) {
    // Store transcript + fillerCount; FeedbackScreen handles the API call
    const partial: Answer = {
      transcript,
      fillerCount,
      scores: { clarity: 0, relevance: 0, star: 0, fillerWords: 0 },
      feedbackText: '',
    };
    setAnswers((prev) => [...prev, partial]);
    setAppState('feedback');
    announce('Feedback is loading');
  }

  function handleFeedbackNext(scores: Scores, feedbackText: string) {
    // Update the last answer with real scores from FeedbackScreen
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = {
        ...updated[currentQuestionIndex],
        scores,
        feedbackText,
      };
      return updated;
    });
    handleNextQuestion();
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
  }

  // ── State machine render ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* aria-live region for screen readers — task 9.4 */}
      <div ref={announceRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171] px-4 py-3 rounded-xl text-sm flex items-center gap-3 z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {appState === 'gate' && (
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-[#F0F2FF] mb-3">CoachMe works best in Chrome or Edge</h1>
          <p className="text-[#8B92B8] mb-6 text-sm">Voice features require the Web Speech API, supported in Chrome and Edge.</p>
          <button
            onClick={() => setAppState('setup')}
            className="px-6 py-3 rounded-xl bg-[#6C63FF] text-white text-sm font-medium hover:bg-[#5a52e0] transition-colors"
          >
            Continue without voice
          </button>
        </div>
      )}

      {(appState === 'setup' || appState === 'generating') && (
        <SetupScreen
          onStart={handleStart}
          isGenerating={appState === 'generating'}
          rateLimitResetAt={rateLimitResetAt}
          formatResetTime={formatResetTime}
        />
      )}

      {appState === 'speaking' && (
        <SpeakingScreen
          question={questions[currentQuestionIndex]}
          questionIndex={currentQuestionIndex}
          total={questions.length}
          onDone={() => { announce('Microphone is now active'); handleSpeakingDone(); }}
        />
      )}

      {appState === 'answering' && (
        <AnsweringScreen
          question={questions[currentQuestionIndex]}
          questionIndex={currentQuestionIndex}
          total={questions.length}
          onAnswerDone={handleAnswerDone}
        />
      )}

      {appState === 'feedback' && answers[currentQuestionIndex] && (
        <FeedbackScreen
          question={questions[currentQuestionIndex]}
          transcript={answers[currentQuestionIndex].transcript}
          fillerCount={answers[currentQuestionIndex].fillerCount}
          questionIndex={currentQuestionIndex}
          total={questions.length}
          onNext={handleFeedbackNext}
        />
      )}

      {appState === 'summary' && (
        <SummaryScreen
          questions={questions}
          answers={answers}
          onRestart={handleRestart}
        />
      )}
    </main>
  );
}
