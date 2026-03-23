'use client';

import { useRef, useState } from 'react';
import { Upload, CheckCircle, X, AlertTriangle } from 'lucide-react';
import Orb from './Orb';

interface SessionConfig {
  role: string;
  interviewType: 'behavioural';
  resumeSummary: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleStart() {
    onStart({ role: role.trim(), interviewType: 'behavioural', resumeSummary });
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[560px] px-4">
      {/* Wordmark */}
      <p className="text-[#8B92B8] text-sm font-medium tracking-widest uppercase mb-6">CoachMe</p>

      {/* Orb */}
      <div className="mb-8">
        <Orb state="idle" size="sm" />
      </div>

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

        {/* Interview Type */}
        <div>
          <label className="text-[#8B92B8] text-xs font-medium uppercase tracking-widest mb-2 block">
            Interview Type
          </label>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-full text-sm font-medium bg-[#6C63FF] text-white cursor-default"
              aria-pressed="true"
            >
              Behavioural
            </button>
            <button
              disabled
              className="px-4 py-2 rounded-full text-sm font-medium bg-[#1E2235] text-[#8B92B8] opacity-40 cursor-not-allowed"
            >
              Technical
            </button>
            <button
              disabled
              className="px-4 py-2 rounded-full text-sm font-medium bg-[#1E2235] text-[#8B92B8] opacity-40 cursor-not-allowed"
            >
              Mixed
            </button>
          </div>
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
              <span className="text-[#8B92B8] text-sm">Upload your resume (PDF)</span>
              <span className="text-[#8B92B8]/60 text-xs">Helps tailor questions to your experience</span>
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
            accept=".pdf"
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
