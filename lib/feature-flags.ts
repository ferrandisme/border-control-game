export type AudioProvider = 'fish' | 'lmnt';
export type ImageProvider = 'freepik' | 'leonardo' | 'vercel';

export const isEnabled = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const parseVoicePool = (...values: Array<string | null | undefined>): string[] => {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (value ? value.split(',') : []))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

const parseProviderOrder = <T extends string>(value: string | undefined, allowedProviders: readonly T[], fallback: readonly T[]): T[] => {
  if (!value) {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is T => allowedProviders.includes(item as T));

  if (parsed.length === 0) {
    return [...fallback];
  }

  return Array.from(new Set(parsed));
};

const DEFAULT_AUDIO_PROVIDER_ORDER: readonly AudioProvider[] = ['fish', 'lmnt'];
const DEFAULT_IMAGE_PROVIDER_ORDER: readonly ImageProvider[] = ['leonardo', 'freepik', 'vercel'];

export const getFeatureFlags = () => {
  const audioEnabled = isEnabled(process.env.AUDIO_ENABLED);
  const imageEnabled = isEnabled(process.env.IMAGE_ENABLED);

  return {
    audioEnabled,
    imageEnabled,
    audioModel: process.env.AUDIO_MODEL ?? process.env.FISH_AUDIO_MODEL ?? process.env.LMNT_AUDIO_MODEL ?? 's2-pro',
    fishAudioModel: process.env.FISH_AUDIO_MODEL ?? 's2-pro',
    fishAudioVoiceId: process.env.FISH_AUDIO_VOICE_ID ?? null,
    fishAudioVoiceMaleId: process.env.FISH_AUDIO_VOICE_ID_MALE ?? null,
    fishAudioVoiceFemaleId: process.env.FISH_AUDIO_VOICE_ID_FEMALE ?? null,
    fishAudioVoiceNeutralId: process.env.FISH_AUDIO_VOICE_ID_NEUTRAL ?? null,
    fishAudioVoiceMaleIds: parseVoicePool(
      process.env.FISH_AUDIO_VOICE_IDS_MALE,
      process.env.FISH_AUDIO_VOICE_ID_MALE_1,
      process.env.FISH_AUDIO_VOICE_ID_MALE_2,
      process.env.FISH_AUDIO_VOICE_ID_MALE_3,
      process.env.FISH_AUDIO_VOICE_ID_MALE,
      process.env.FISH_AUDIO_VOICE_ID,
    ),
    fishAudioVoiceFemaleIds: parseVoicePool(
      process.env.FISH_AUDIO_VOICE_IDS_FEMALE,
      process.env.FISH_AUDIO_VOICE_ID_FEMALE_1,
      process.env.FISH_AUDIO_VOICE_ID_FEMALE_2,
      process.env.FISH_AUDIO_VOICE_ID_FEMALE_3,
      process.env.FISH_AUDIO_VOICE_ID_FEMALE,
      process.env.FISH_AUDIO_VOICE_ID,
    ),
    lmntAudioModel: process.env.LMNT_AUDIO_MODEL ?? process.env.AUDIO_MODEL ?? 'blizzard',
    lmntVoiceId: process.env.LMNT_VOICE_ID ?? process.env.LMNT_VOICE ?? 'leah',
    lmntVoiceMaleId: process.env.LMNT_VOICE_ID_MALE ?? null,
    lmntVoiceFemaleId: process.env.LMNT_VOICE_ID_FEMALE ?? null,
    lmntVoiceNeutralId: process.env.LMNT_VOICE_ID_NEUTRAL ?? null,
    lmntVoiceMaleIds: parseVoicePool(
      process.env.LMNT_VOICE_IDS_MALE,
      process.env.LMNT_AUDIO_VOICE_ID_MALE_1,
      process.env.LMNT_AUDIO_VOICE_ID_MALE_2,
      process.env.LMNT_AUDIO_VOICE_ID_MALE_3,
      process.env.LMNT_VOICE_ID_MALE,
    ),
    lmntVoiceFemaleIds: parseVoicePool(
      process.env.LMNT_VOICE_IDS_FEMALE,
      process.env.LMNT_AUDIO_VOICE_ID_FEMALE_1,
      process.env.LMNT_AUDIO_VOICE_ID_FEMALE_2,
      process.env.LMNT_AUDIO_VOICE_ID_FEMALE_3,
      process.env.LMNT_VOICE_ID_FEMALE,
    ),
    lmntAudioFormat: process.env.LMNT_AUDIO_FORMAT ?? 'mp3',
    lmntSampleRate: Number.parseInt(process.env.LMNT_SAMPLE_RATE ?? '24000', 10) || 24000,
    lmntLanguage: process.env.LMNT_LANGUAGE ?? 'es',
    imageModel: process.env.IMAGE_MODEL ?? process.env.FREEPIK_MODEL_IMAGE ?? process.env.LEONARDO_MODEL_IMAGE ?? process.env.VERCEL_MODEL_IMAGE ?? null,
    freepikImageModel: process.env.FREEPIK_MODEL_IMAGE ?? 'imagen-4.0-ultra',
    leonardoImageModel: process.env.LEONARDO_MODEL_IMAGE ?? 'b2614463-296c-462a-9586-aafdb8f00e36',
    leonardoPortraitStyleUuid: process.env.LEONARDO_PORTRAIT_STYLE_UUID ?? '8e2bc543-6ee2-45f9-bcd9-594b6ce84dcd',
    leonardoContrast: Number.parseFloat(process.env.LEONARDO_CONTRAST ?? '3.5') || 3.5,
    leonardoWidth: Number.parseInt(process.env.LEONARDO_WIDTH ?? '1024', 10) || 1024,
    leonardoHeight: Number.parseInt(process.env.LEONARDO_HEIGHT ?? '1024', 10) || 1024,
    vercelImageModel: process.env.VERCEL_MODEL_IMAGE ?? process.env.IMAGE_MODEL ?? null,
    imageApiUrl: process.env.VERCEL_IMAGE_API_URL ?? 'https://ai-gateway.vercel.sh/v1/images/generations',
    audioProviderOrder: parseProviderOrder(process.env.AUDIO_PROVIDER_ORDER, ['fish', 'lmnt'], DEFAULT_AUDIO_PROVIDER_ORDER),
    imageProviderOrder: parseProviderOrder(process.env.IMAGE_PROVIDER_ORDER, ['freepik', 'leonardo', 'vercel'], DEFAULT_IMAGE_PROVIDER_ORDER),
  };
};
