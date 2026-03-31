import 'server-only';

import { getFeatureFlags, type AudioProvider } from '@/lib/feature-flags';
import { sanitizeDialogueText, truncateAtWordBoundary } from '@/lib/dialogue';
import { type AppLogger, getRequestLogger } from '@/lib/server-log';
import type { Demeanor, Gender } from '@/schemas/traveler';

export type SpeechAsset = {
  status: 'disabled' | 'ready' | 'error';
  audioUrl: string | null;
  provider: string | null;
  model: string | null;
  voiceId: string | null;
  sanitizedText?: string | null;
};

export type SpeechParams = {
  text: string;
  demeanor: Demeanor;
  gender: Gender;
  voiceSeed: string;
  log?: AppLogger;
};

const toDataUrl = (base64: string, mimeType: string): string => `data:${mimeType};base64,${base64}`;

const stripStageDirections = (text: string): string => truncateAtWordBoundary(sanitizeDialogueText(text), 800);

const normalizeAudioProviderLabel = (provider: AudioProvider): string => provider;

const hashSeed = (value: string): number => {
  let hash = 5381;
  for (const char of value) {
    hash = ((hash << 5) + hash) ^ char.charCodeAt(0);
  }

  return Math.abs(hash);
};

const selectRotatingVoice = (provider: AudioProvider, gender: Gender, voiceSeed: string, voiceIds: string[]): string | null => {
  if (voiceIds.length === 0) {
    return null;
  }

  const normalizedSeed = `${provider}:${gender}:${voiceSeed.trim().toLowerCase()}`;
  const index = hashSeed(normalizedSeed) % voiceIds.length;
  return voiceIds[index] ?? null;
};

const resolveFishVoiceId = (gender: Gender, voiceSeed: string): string | null => {
  const flags = getFeatureFlags();
  const pool = gender === 'male' ? flags.fishAudioVoiceMaleIds : flags.fishAudioVoiceFemaleIds;
  return selectRotatingVoice('fish', gender, voiceSeed, pool);
};

const resolveLMNTVoiceId = (gender: Gender, voiceSeed: string): string | null => {
  const flags = getFeatureFlags();
  const pool = gender === 'male' ? flags.lmntVoiceMaleIds : flags.lmntVoiceFemaleIds;
  return selectRotatingVoice('lmnt', gender, voiceSeed, pool) ?? flags.lmntVoiceId;
};

const synthesizeWithFish = async (cleanedText: string, demeanor: Demeanor, gender: Gender, voiceSeed: string): Promise<SpeechAsset> => {
  const flags = getFeatureFlags();
  const voiceId = resolveFishVoiceId(gender, voiceSeed);

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
      'Content-Type': 'application/json',
      model: flags.fishAudioModel,
    },
    body: JSON.stringify({
      text: cleanedText,
      ...(voiceId ? { reference_id: voiceId } : {}),
      format: 'mp3',
      latency: 'balanced',
      sample_rate: 44100,
      mp3_bitrate: 128,
      temperature: demeanor === 'nervous' ? 0.55 : 0.7,
      top_p: 0.7,
      prosody: {
        speed:
          demeanor === 'nervous'
            ? 1.08
            : demeanor === 'evasive'
              ? 0.94
              : demeanor === 'aggressive'
                ? 1.02
                : 1,
        volume: demeanor === 'aggressive' ? 1 : 0,
        normalize_loudness: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Fish audio generation failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    status: 'ready',
    audioUrl: toDataUrl(buffer.toString('base64'), 'audio/mpeg'),
    provider: normalizeAudioProviderLabel('fish'),
    model: flags.fishAudioModel,
    voiceId,
    sanitizedText: cleanedText,
  };
};

const synthesizeWithLMNT = async (cleanedText: string, gender: Gender, voiceSeed: string): Promise<SpeechAsset> => {
  const flags = getFeatureFlags();
  const voiceId = resolveLMNTVoiceId(gender, voiceSeed) ?? flags.lmntVoiceId;

  const response = await fetch('https://api.lmnt.com/v1/ai/speech/bytes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.LMNT_API_KEY ?? '',
    },
    body: JSON.stringify({
      voice: voiceId,
      text: cleanedText,
      model: flags.lmntAudioModel,
      format: flags.lmntAudioFormat,
      sample_rate: flags.lmntSampleRate,
      language: flags.lmntLanguage,
      top_p: 0.8,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`LMNT audio generation failed with status ${response.status}`);
  }

  const mimeType = flags.lmntAudioFormat === 'wav'
    ? 'audio/wav'
    : flags.lmntAudioFormat === 'aac'
      ? 'audio/aac'
      : flags.lmntAudioFormat === 'webm'
        ? 'audio/webm'
        : 'audio/mpeg';
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    status: 'ready',
    audioUrl: toDataUrl(buffer.toString('base64'), mimeType),
    provider: normalizeAudioProviderLabel('lmnt'),
    model: flags.lmntAudioModel,
    voiceId,
    sanitizedText: cleanedText,
  };
};

export const synthesizeTravelerSpeech = async (params: SpeechParams): Promise<SpeechAsset> => {
  const { text, demeanor, gender, voiceSeed, log } = params;
  const flags = getFeatureFlags();
  const logger = getRequestLogger(log);

  if (!flags.audioEnabled) {
    return {
      status: 'disabled',
      audioUrl: null,
      provider: null,
      model: null,
      voiceId: null,
      sanitizedText: null,
    };
  }

  const cleanedText = stripStageDirections(text);

  if (!cleanedText) {
    return {
      status: 'error',
      audioUrl: null,
      provider: null,
      model: null,
      voiceId: null,
      sanitizedText: null,
    };
  }

  let lastProvider: string | null = null;
  let lastModel: string | null = null;
  let lastVoiceId: string | null = null;

  for (const provider of flags.audioProviderOrder) {
    try {
      if (provider === 'fish' && process.env.FISH_AUDIO_API_KEY) {
        return await synthesizeWithFish(cleanedText, demeanor, gender, voiceSeed);
      }

      if (provider === 'lmnt' && process.env.LMNT_API_KEY) {
        return await synthesizeWithLMNT(cleanedText, gender, voiceSeed);
      }
    } catch (error) {
      lastProvider = normalizeAudioProviderLabel(provider);
      lastModel = provider === 'fish' ? flags.fishAudioModel : flags.lmntAudioModel;
      lastVoiceId = provider === 'fish'
        ? resolveFishVoiceId(gender, voiceSeed)
        : resolveLMNTVoiceId(gender, voiceSeed);
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const warnMsg = `[audio] ${provider} speech synthesis failed: ${errorMsg}`;
        logger.warn(warnMsg, { provider, error: errorMsg });
    }
  }

  return {
    status: 'error',
    audioUrl: null,
    provider: lastProvider,
    model: lastModel,
    voiceId: lastVoiceId,
    sanitizedText: cleanedText,
  };
};
