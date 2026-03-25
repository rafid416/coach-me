'use client';

import { useEffect, useRef, useState } from 'react';
import { countFillerWords } from '@/lib/fillerWords';
import Orb from './Orb';
import ProgressBar from './ProgressBar';

interface AnsweringScreenProps {
  question: string;
  questionIndex: number;
  total: number;
  onAnswerDone: (transcript: string, fillerCount: number) => void;
}

interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { transcript: string };
}
interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: { length: number; [index: number]: ISpeechRecognitionResult };
}
interface ISpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: ISpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export default function AnsweringScreen({
  question,
  questionIndex,
  total,
  onAnswerDone,
}: AnsweringScreenProps) {
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');
  const [showTimeout, setShowTimeout] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStoppedRef = useRef(false);

  function resetSilenceTimer() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTimeout(false);
    timeoutRef.current = setTimeout(() => setShowTimeout(true), 15000);
  }

  function startRecognition() {
    const SR = (window as unknown as { SpeechRecognition?: new () => ISpeechRecognition; webkitSpeechRecognition?: new () => ISpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => ISpeechRecognition }).webkitSpeechRecognition;

    if (!SR) return;

    // Abort any existing instance before creating a new one
    recognitionRef.current?.abort();

    const recognition = new SR();
    let alive = true;

    recognition.lang = 'en-US';
    recognition.continuous = false; // false is more compatible across mobile browsers
    recognition.interimResults = true;

    recognition.onresult = (e: ISpeechRecognitionEvent) => {
      if (!alive) return;
      resetSilenceTimer();
      let interim = '';
      let final = '';
      // Always iterate from e.resultIndex to avoid reprocessing old results
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      if (final) setFinalTranscript((prev) => prev ? prev + ' ' + final.trim() : final.trim());
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      if (!alive || isStoppedRef.current) return;
      alive = false;
      setInterimTranscript('');
      // Always create a fresh instance — never reuse, prevents Samsung replaying buffered results
      setTimeout(() => {
        if (!isStoppedRef.current) startRecognition();
      }, 150);
    };

    recognition.onerror = (e: ISpeechRecognitionErrorEvent) => {
      if (!alive) return;
      console.log('[SpeechRecognition] error:', e.error);
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError('Microphone error — please check your mic and try again.');
      }
    };

    recognitionRef.current = recognition;
    isStoppedRef.current = false;
    recognition.start();
    resetSilenceTimer();

    return () => { alive = false; };
  }

  useEffect(() => {
    if (textMode) return;
    const cleanup = startRecognition();
    return () => {
      cleanup?.();
      isStoppedRef.current = true;
      recognitionRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textMode]);

  function handleDone() {
    const transcript = textMode ? textInput.trim() : finalTranscript.trim();
    if (transcript.length < 10) {
      setError('Your answer seems too short — please say a bit more.');
      return;
    }
    setError('');
    isStoppedRef.current = true;
    recognitionRef.current?.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onAnswerDone(transcript, countFillerWords(transcript));
  }

  function handleReRecord() {
    setError('');
    setFinalTranscript('');
    setInterimTranscript('');
    setShowTimeout(false);
    isStoppedRef.current = true;
    recognitionRef.current?.abort();
    setTimeout(() => {
      isStoppedRef.current = false;
      startRecognition();
    }, 200);
  }

  function handleSwitchToText() {
    setError('');
    isStoppedRef.current = true;
    recognitionRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTextMode(true);
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] px-4 gap-6">
      <ProgressBar current={questionIndex + 1} total={total} />

      <Orb state="listening" size="lg" />

      {/* Question reference */}
      <p className="text-[#8B92B8] text-sm text-center leading-relaxed max-w-[480px]">
        {question}
      </p>

      {/* Transcript / Text input */}
      {textMode ? (
        <textarea
          className="w-full bg-[#1E2235] border border-white/10 rounded-xl px-4 py-3 text-[#F0F2FF] placeholder:text-[#8B92B8] text-sm outline-none focus:border-[#6C63FF] min-h-[120px] resize-none transition-colors"
          placeholder="Type your answer here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          autoFocus
        />
      ) : (
        <div className="w-full bg-[#1E2235] border border-white/10 rounded-xl px-4 py-3 min-h-[120px]">
          {finalTranscript || interimTranscript ? (
            <p className="text-sm leading-relaxed">
              <span className="text-[#F0F2FF]">{finalTranscript}</span>
              <span className="text-[#8B92B8] italic">{interimTranscript}</span>
            </p>
          ) : (
            <p className="text-[#8B92B8] text-sm italic">Start speaking...</p>
          )}
        </div>
      )}

      {/* Status */}
      {!textMode && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00D4C8] animate-pulse" aria-hidden="true" />
          <span className="text-[#8B92B8] text-sm">Listening...</span>
        </div>
      )}

      {/* Timeout prompt */}
      {showTimeout && !textMode && (
        <p className="text-[#8B92B8] text-xs text-center">
          Still there? Tap <strong className="text-[#F0F2FF]">Done</strong> when you&apos;re finished.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-[#F87171] text-xs text-center">{error}</p>
      )}

      {/* Buttons */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handleDone}
          className="w-full py-3 rounded-xl bg-[#6C63FF] text-white font-semibold text-sm hover:bg-[#5a52e0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#0D0F1A]"
        >
          Done
        </button>

        {!textMode && (
          <button
            onClick={handleReRecord}
            className="w-full py-3 rounded-xl border border-white/10 text-[#8B92B8] text-sm hover:border-white/20 hover:text-[#F0F2FF] transition-colors"
          >
            Re-record
          </button>
        )}

        {!textMode && (
          <button
            onClick={handleSwitchToText}
            className="text-[#8B92B8] text-xs underline underline-offset-2 hover:text-[#F0F2FF] transition-colors"
          >
            Type instead
          </button>
        )}
      </div>
    </div>
  );
}
