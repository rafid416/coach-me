export interface ResolvedVoice {
  friendlyName: string;
  descriptor: string;
  voice: SpeechSynthesisVoice | null;
}

const CURATED_VOICES: { friendlyName: string; descriptor: string; priorityNames: string[] }[] = [
  {
    friendlyName: 'Ava',
    descriptor: 'Clear · American · Female',
    priorityNames: ['Google US English', 'Microsoft Zira'],
  },
  {
    friendlyName: 'Samira',
    descriptor: 'Warm · British · Female',
    priorityNames: ['Google UK English Female', 'Microsoft Hazel'],
  },
  {
    friendlyName: 'James',
    descriptor: 'Crisp · British · Male',
    priorityNames: ['Google UK English Male', 'Microsoft George'],
  },
  {
    friendlyName: 'Richard',
    descriptor: 'Friendly · Canadian · Male',
    priorityNames: ['Microsoft Richard'],
  },
  {
    friendlyName: 'Linda',
    descriptor: 'Warm · Canadian · Female',
    priorityNames: ['Microsoft Linda'],
  },
];

export function resolveVoices(): ResolvedVoice[] {
  const available = window.speechSynthesis.getVoices();

  // Step 1: find curated voices that actually matched a priority name
  const matched: SpeechSynthesisVoice[] = [];
  for (const { priorityNames } of CURATED_VOICES) {
    const found = priorityNames.reduce<SpeechSynthesisVoice | null>((acc, name) => {
      if (acc) return acc;
      return available.find((v) => v.name.includes(name)) ?? null;
    }, null);
    if (found && !matched.includes(found)) matched.push(found);
  }

  // Step 2: if fewer than 3 matched, top up with English browser voices not already included
  // Prioritise cloud-based voices (localService: false) over local ones
  if (matched.length < 3) {
    const remaining = available.filter(
      (v) => v.lang.startsWith('en') && !matched.includes(v)
    );
    const cloud = remaining.filter((v) => !v.localService);
    const local = remaining.filter((v) => v.localService);
    for (const v of [...cloud, ...local]) {
      if (matched.length >= 3) break;
      matched.push(v);
    }
  }

  // Step 3: label sequentially as Voice 1, Voice 2, etc.
  return matched.map((voice, i) => ({
    friendlyName: `Voice ${i + 1}`,
    descriptor: '',
    voice,
  }));
}

export function getVoicesAsync(): Promise<ResolvedVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(resolveVoices());
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(resolveVoices());
    };
  });
}

export function loadSavedVoiceSlot(): string | null {
  try {
    const raw = localStorage.getItem('coachme_voice');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.friendlyName ?? null;
  } catch {
    return null;
  }
}

export function saveVoiceSlot(friendlyName: string): void {
  localStorage.setItem('coachme_voice', JSON.stringify({ friendlyName }));
}
