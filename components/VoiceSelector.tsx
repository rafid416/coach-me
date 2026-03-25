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
  const [open, setOpen] = useState(false);
  const [previewingSlot, setPreviewingSlot] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedVoice = voices.find((v) => v.friendlyName === selectedName) ?? voices[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Cancel preview on unmount
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  function handlePreview(e: React.MouseEvent, voice: ResolvedVoice) {
    e.stopPropagation();
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

  function handleSelect(voice: ResolvedVoice) {
    if (!voice.voice) return;
    onChange(voice.friendlyName);
    window.speechSynthesis.cancel();
    setPreviewingSlot(null);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-fit">
      {/* Trigger row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1E2235] border border-white/10 hover:border-white/20 transition-colors focus:outline-none focus:border-[#6C63FF] text-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#8B92B8]" aria-hidden="true">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span className="text-[#8B92B8] text-xs">Interviewer Voice</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`text-[#8B92B8] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M2 5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-10 top-full mt-1 w-[calc(100vw-2rem)] max-w-sm bg-[#1E2235] border border-white/10 rounded-xl overflow-hidden shadow-xl">
          {voices.map((voice) => {
            const isSelected = selectedName === voice.friendlyName;
            const isPreviewing = previewingSlot === voice.friendlyName;
            const isDisabled = !voice.voice;

            return (
              <div
                key={voice.friendlyName}
                onClick={() => handleSelect(voice)}
                className={[
                  'flex items-center justify-between px-4 py-3 cursor-pointer',
                  isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#161926]',
                  isSelected ? 'bg-[#161926]' : '',
                ].join(' ')}
                title={isDisabled ? 'Not available in your browser' : undefined}
              >
                <span className="flex items-center gap-3 min-w-0">
                  {/* Selected indicator */}
                  <span className="w-4 flex-shrink-0 flex items-center justify-center">
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="#6C63FF" aria-hidden="true">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                      </svg>
                    )}
                  </span>
                  <span className="text-[#F0F2FF] text-sm font-medium">{voice.friendlyName}</span>
                  {voice.descriptor && <span className="text-[#8B92B8] text-xs truncate">{voice.descriptor}</span>}
                </span>

                {!isDisabled && (
                  <button
                    type="button"
                    onClick={(e) => handlePreview(e, voice)}
                    aria-label={isPreviewing ? `Stop ${voice.friendlyName} preview` : `Preview ${voice.friendlyName} voice`}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[#8B92B8] hover:text-[#F0F2FF] hover:bg-[#0D0F1A] transition-colors ml-2"
                  >
                    {isPreviewing ? (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                        <rect width="8" height="8" rx="1" />
                      </svg>
                    ) : (
                      <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" aria-hidden="true">
                        <path d="M0 0l8 5-8 5V0z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
