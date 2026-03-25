'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle, X, AlertTriangle } from 'lucide-react';
import Orb from './Orb';
import VoiceSelector from './VoiceSelector';
import { getVoicesAsync, loadSavedVoiceSlot, saveVoiceSlot, type ResolvedVoice } from '@/lib/voices';

interface SessionConfig {
  role: string;
  interviewType: 'behavioural';
  resumeSummary: string;
  voiceName: string;
}

interface SetupScreenProps {
  onStart: (config: SessionConfig) => void;
  isGenerating: boolean;
  rateLimitResetAt: string | null;
  formatResetTime: (iso: string) => string;
}

export default function SetupScreen({
  onStart,
  isGenerating,
  rateLimitResetAt,
  formatResetTime,
}: SetupScreenProps) {
  const [role, setRole] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeSummary, setResumeSummary] = useState('');
  const [resumeStatus, setResumeStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [resolvedVoices, setResolvedVoices] = useState<ResolvedVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Ava');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVoicesAsync().then((voices) => {
      setResolvedVoices(voices);
      const saved = loadSavedVoiceSlot();
      const validSaved = saved && voices.some((v) => v.friendlyName === saved);
      setSelectedVoiceName(validSaved ? saved! : voices[0]?.friendlyName ?? 'Alex');
    });
  }, []);

  const isDisabled = !role.trim() || isGenerating || !!rateLimitResetAt;

  async function handleFileChange(file: File) {
    setResumeFile(file);
    setResumeStatus('parsing');
    setResumeSummary('');

    try {
      // Parse PDF
      const formData = new FormData();
      formData.append('file', file);
      const parseRes = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const { text } = await parseRes.json();

      if (!text || text.length < 100) {
        setResumeStatus('error');
        setResumeSummary('');
        return;
      }

      // Summarize
      const sumRes = await fetch('/api/summarize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const { summary } = await sumRes.json();
      setResumeSummary(summary ?? '');
      setResumeStatus('done');
    } catch {
      setResumeStatus('error');
      setResumeSummary('');
    }
  }

  function handleRemoveFile() {
    setResumeFile(null);
    setResumeSummary('');
    setResumeStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleVoiceChange(friendlyName: string) {
    setSelectedVoiceName(friendlyName);
    saveVoiceSlot(friendlyName);
  }

  function handleStart() {
    onStart({ role: role.trim(), interviewType: 'behavioural', resumeSummary, voiceName: selectedVoiceName });
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] px-4 gap-3">
      {/* Wordmark */}
      <p className="text-[#8B92B8] text-sm font-medium tracking-widest uppercase mb-3">CoachMe</p>

      {/* Orb */}
      <div className="mb-5">
        <Orb state="idle" size="sm" />
      </div>

      {/* Voice Selector */}
      {resolvedVoices.length > 0 && (
        <div className="w-full">
          <VoiceSelector
            voices={resolvedVoices}
            selectedName={selectedVoiceName}
            onChange={handleVoiceChange}
          />
        </div>
      )}

      {/* Card */}
      <div className="w-full bg-[#161926] rounded-2xl border border-white/[0.06] p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-[#F0F2FF] text-lg sm:text-xl font-semibold">Set up your interview</h1>
          <p className="text-[#8B92B8] text-sm mt-1">Tell us what you&apos;re practicing for</p>
        </div>

        {/* Job Role */}
        <div>
          <label className="text-[#8B92B8] text-xs font-medium uppercase tracking-widest mb-2 block">
            Job Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Product Manager, Software Engineer"
            className="w-full bg-[#1E2235] border border-white/10 rounded-xl px-4 py-3 text-[#F0F2FF] placeholder:text-[#8B92B8] text-sm outline-none focus:border-[#6C63FF] transition-colors"
          />
        </div>

        {/* Resume Upload */}
        <div>
          <label className="text-[#8B92B8] text-xs font-medium uppercase tracking-widest mb-2 block">
            Resume <span className="normal-case text-[#8B92B8]/60">— optional</span>
          </label>

          {!resumeFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-dashed border-white/20 rounded-xl px-4 py-5 flex flex-col items-center gap-2 hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/5 transition-colors"
            >
              <Upload size={20} className="text-[#8B92B8]" />
              <span className="text-[#8B92B8] text-sm">Upload your resume</span>
              <span className="text-[#8B92B8]/60 text-xs">PDF, DOCX, or TXT — helps tailor questions to your experience</span>
            </button>
          ) : (
            <div className="w-full bg-[#1E2235] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
              {resumeStatus === 'parsing' && (
                <div className="w-4 h-4 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              {resumeStatus === 'done' && (
                <CheckCircle size={16} className="text-[#4ADE80] flex-shrink-0" />
              )}
              {resumeStatus === 'error' && (
                <AlertTriangle size={16} className="text-[#FBBF24] flex-shrink-0" />
              )}
              <span className="text-[#F0F2FF] text-sm flex-1 truncate">{resumeFile.name}</span>
              <button onClick={handleRemoveFile} className="text-[#8B92B8] hover:text-[#F0F2FF] transition-colors">
                <X size={16} />
              </button>
            </div>
          )}

          {resumeStatus === 'error' && (
            <p className="text-[#FBBF24] text-xs mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              Couldn&apos;t read this PDF — continuing without it
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
            }}
          />
        </div>

        {/* Rate limit message */}
        {rateLimitResetAt && (
          <p className="text-[#FBBF24] text-sm text-center">
            You&apos;ve used today&apos;s session. Come back at {formatResetTime(rateLimitResetAt)}.
          </p>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isDisabled || resumeStatus === 'parsing'}
          className="w-full py-3 rounded-xl bg-[#6C63FF] text-white font-semibold text-sm hover:bg-[#5a52e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#161926]"
        >
          {isGenerating ? 'Generating questions...' : resumeStatus === 'parsing' ? 'Reading resume...' : 'Start Interview'}
        </button>
      </div>
    </div>
  );
}
