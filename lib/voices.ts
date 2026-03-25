export interface ResolvedVoice {
  friendlyName: string;
  descriptor: string;
  voice: SpeechSynthesisVoice | null;
}

const CURATED_VOICES: { friendlyName: string; descriptor: string; priorityNames: string[] }[] = [
  {
    friendlyName: 'Alex',
    descriptor: 'Clear · American · Male',
    priorityNames: ['Google US English', 'Microsoft David', 'Alex'],
  },
  {
    friendlyName: 'Samira',
    descriptor: 'Warm · British · Female',
    priorityNames: ['Google UK English Female', 'Microsoft Hazel', 'Karen'],
  },
  {
    friendlyName: 'Daniel',
    descriptor: 'Crisp · Australian · Male',
    priorityNames: ['Google Australian English', 'Microsoft James', 'Daniel'],
  },
];

export function resolveVoices(): ResolvedVoice[] {
  const available = window.speechSynthesis.getVoices();
  return CURATED_VOICES.map(({ friendlyName, descriptor, priorityNames }) => {
    const matched =
      priorityNames.reduce<SpeechSynthesisVoice | null>((found, name) => {
        if (found) return found;
        return available.find((v) => v.name.includes(name)) ?? null;
      }, null) ?? available[0] ?? null;

    return { friendlyName, descriptor, voice: matched };
  });
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
