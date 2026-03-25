'use client';

import { useEffect, useRef } from 'react';
import Orb from './Orb';
import ProgressBar from './ProgressBar';
import { resolveVoices } from '@/lib/voices';

interface SpeakingScreenProps {
  question: string;
  questionIndex: number;
  total: number;
  voiceName: string;
  onDone: () => void;
}

export default function SpeakingScreen({
  question,
  questionIndex,
  total,
  voiceName,
  onDone,
}: SpeakingScreenProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = 'en-US';

    const resolved = resolveVoices().find((v) => v.friendlyName === voiceName);
    if (resolved?.voice) utterance.voice = resolved.voice;

    utterance.onend = () => onDoneRef.current();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [question, voiceName]);

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] px-4 gap-6 sm:gap-8">
      <ProgressBar current={questionIndex + 1} total={total} />

      <Orb state="speaking" size="lg" />

      <div className="text-center max-w-[480px]">
        <p className="text-[#F0F2FF] text-lg sm:text-xl font-medium leading-relaxed">
          {question}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full bg-[#6C63FF] animate-pulse"
          aria-hidden="true"
        />
        <span className="text-[#8B92B8] text-sm">AI is speaking...</span>
      </div>
    </div>
  );
}
