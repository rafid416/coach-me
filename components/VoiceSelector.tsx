'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResolvedVoice } from '@/lib/voices';

const PREVIEW_PHRASE = "Hi, I'm your interviewer today. Tell me about a challenge you've overcome.";

interface VoiceSelectorProps {
  voices: ResolvedVoice[];
  selectedName: string;
  onChange: (friendlyName: string) => void;
}

export default function VoiceSelector({ voices, selectedName, onChange }: VoiceSelectorProps) {
  const [previewingSlot, setPreviewingSlot] = useState<string | null>(null);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  function handlePreview(voice: ResolvedVoice) {
    window.speechSynthesis.cancel();

    if (previewingSlot === voice.friendlyName) {
      setPreviewingSlot(null);
      return;
    }

    if (!voice.voice) return;

    const utterance = new SpeechSynthesisUtterance(PREVIEW_PHRASE);
    utterance.voice = voice.voice;
    utterance.lang = voice.voice.lang;
    utterance.onend = () => setPreviewingSlot(null);
    setPreviewingSlot(voice.friendlyName);
    window.speechSynthesis.speak(utterance);
  }

  const transition = reducedMotion.current ? '' : 'transition-all duration-150 ease-out';

  return (
    <fieldset className="w-full border-0 p-0 m-0">
      <legend className="text-[#8B92B8] text-xs font-medium uppercase tracking-widest mb-2">
        Interviewer Voice
      </legend>

      <div className="flex flex-col md:flex-row gap-3">
        {voices.map((voice) => {
          const isSelected = selectedName === voice.friendlyName;
          const isPreviewing = previewingSlot === voice.friendlyName;
          const isDisabled = !voice.voice;

          return (
            <label
              key={voice.friendlyName}
              className={[
                'relative flex-1 rounded-xl p-4 cursor-pointer select-none',
                'bg-[#161926] border-2',
                isDisabled ? 'opacity-50 cursor-not-allowed' : '',
                isSelected
                  ? 'border-[#6C63FF]'
                  : `border-[#27272A] ${!isDisabled ? 'hover:border-[#3F3F46] hover:bg-[#1F1F23]' : ''}`,
                transition,
              ].join(' ')}
              title={isDisabled ? 'Not available in your browser' : undefined}
            >
              <input
                type="radio"
                name="voice"
                value={voice.friendlyName}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => !isDisabled && onChange(voice.friendlyName)}
                className="sr-only"
              />

              {/* Checkmark */}
              {isSelected && (
                <span className="absolute top-3 right-3 text-[#6C63FF]" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                  </svg>
                </span>
              )}

              <p className="text-[#F0F2FF] text-sm font-medium leading-none mb-1">{voice.friendlyName}</p>
              <p className="text-[#8B92B8] text-xs mb-3">{voice.descriptor}</p>

              {!isDisabled && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handlePreview(voice); }}
                  aria-label={isPreviewing ? `Stop ${voice.friendlyName} preview` : `Preview ${voice.friendlyName} voice`}
                  className={[
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs',
                    'text-[#8B92B8] hover:text-[#F0F2FF] hover:bg-[#1E2235]',
                    transition,
                  ].join(' ')}
                >
                  {isPreviewing ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                        <rect width="10" height="10" rx="1" />
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
                        <path d="M0 0l10 6-10 6V0z" />
                      </svg>
                      Preview
                    </>
                  )}
                </button>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
