import 'server-only';

import sharp from 'sharp';

import { sanitizeDialogueText, truncateAtWordBoundary } from '@/lib/dialogue';
import { type AudioProvider, getFeatureFlags, type ImageProvider } from '@/lib/feature-flags';
import { type AppLogger, getRequestLogger } from '@/lib/server-log';
import type { VoiceHint } from '@/schemas/traveler';

export type PortraitExpression = 'passport' | 'neutral' | 'friendly' | 'nervous' | 'evasive' | 'aggressive' | 'confident';
export type PortraitCell = 'passport' | 'arrival' | 'pressure_soft' | 'pressure_hard';

export type PortraitAsset = {
  status: 'disabled' | 'placeholder' | 'generated' | 'error';
  spriteUrl: string | null;
  provider: string | null;
  model: string | null;
  errorMessage?: string | null;
  expressions: PortraitExpression[];
  columns: number;
  rows: number;
  selectedCell: PortraitCell;
  selectedExpression: PortraitExpression;
};

export type SpeechAsset = {
  status: 'disabled' | 'ready' | 'error';
  audioUrl: string | null;
  provider: string | null;
  model: string | null;
  voiceId: string | null;
  sanitizedText?: string | null;
};

type PortraitParams = {
  travelerName: string;
  nationality: string;
  gender: string;
  ageRange: string;
  demeanor: string;
  purpose: string;
  backstory: string;
  log?: AppLogger;
};

type SlotPhotoParams = {
  name: string;
  nationality: string;
  demeanor: string;
  stated_purpose: string;
  backstory: string;
  gender: string;
  age: number;
  visual_identity: {
    age_range: string;
    nationality: string;
    demeanor: string;
    gender: string;
  };
};

type DayPassportBatchParams = {
  slots: SlotPhotoParams[];
  log?: AppLogger;
};

type SpeechParams = {
  text: string;
  demeanor: string;
  voiceHint?: VoiceHint | null;
  log?: AppLogger;
};

type LeonardoGenerationResponse = {
  sdGenerationJob?: {
    generationId?: string;
  };
};

type LeonardoGenerationStatusResponse = {
  generations_by_pk?: {
    status?: string;
    generated_images?: Array<{
      url?: string;
    }>;
  };
};

const sanitizeForPrompt = (value: string, maxLength: number): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, maxLength);

const stripStageDirections = (text: string): string => truncateAtWordBoundary(sanitizeDialogueText(text), 800);

const getVoiceHintForDemeanor = (demeanor: string): VoiceHint => {
  switch (demeanor) {
    case 'aggressive':
      return 'male';
    case 'friendly':
      return 'female';
    default:
      return 'neutral';
  }
};

const getPortraitCellsForDemeanor = (demeanor: string): Record<PortraitCell, PortraitExpression> => {
  switch (demeanor) {
    case 'friendly':
      return {
        passport: 'passport',
        arrival: 'friendly',
        pressure_soft: 'neutral',
        pressure_hard: 'confident',
      };
    case 'evasive':
      return {
        passport: 'passport',
        arrival: 'evasive',
        pressure_soft: 'nervous',
        pressure_hard: 'aggressive',
      };
    case 'aggressive':
      return {
        passport: 'passport',
        arrival: 'aggressive',
        pressure_soft: 'evasive',
        pressure_hard: 'confident',
      };
    case 'confident':
      return {
        passport: 'passport',
        arrival: 'confident',
        pressure_soft: 'friendly',
        pressure_hard: 'evasive',
      };
    case 'nervous':
    default:
      return {
        passport: 'passport',
        arrival: 'nervous',
        pressure_soft: 'evasive',
        pressure_hard: 'aggressive',
      };
  }
};

const getExpressionsForDemeanor = (demeanor: string): PortraitExpression[] => {
  const cells = getPortraitCellsForDemeanor(demeanor);
  return [cells.passport, cells.arrival, cells.pressure_soft, cells.pressure_hard];
};

const getPassportSelectedExpressionForDemeanor = (demeanor: string): PortraitExpression => {
  return getPortraitCellsForDemeanor(demeanor).arrival;
};

export const getPlaceholderPassportPortrait = (demeanor: string): PortraitAsset => ({
  status: 'placeholder',
  spriteUrl: null,
  provider: null,
  model: null,
  errorMessage: null,
  expressions: ['passport'],
  columns: 1,
  rows: 1,
  selectedCell: 'passport',
  selectedExpression: getPassportSelectedExpressionForDemeanor(demeanor),
});

export const getPlaceholderPortrait = (demeanor: string): PortraitAsset => ({
  status: 'placeholder',
  spriteUrl: null,
  provider: null,
  model: null,
  errorMessage: null,
  expressions: getExpressionsForDemeanor(demeanor),
  columns: 2,
  rows: 2,
  selectedCell: 'arrival',
  selectedExpression: getPortraitCellsForDemeanor(demeanor).arrival,
});

const toDataUrl = (base64: string, mimeType: string): string => `data:${mimeType};base64,${base64}`;

const PORTRAIT_CANVAS_SIZE = 1024;
const DAY_PASSPORT_SHEET_WIDTH = 1024;
const DAY_PASSPORT_SHEET_HEIGHT = 1536;
const DEFAULT_VERCEL_IMAGES_API_URL = 'https://ai-gateway.vercel.sh/v1/images/generations';
const DEFAULT_VERCEL_CHAT_API_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

const getImageGatewayApiKey = (): string => process.env.VERCEL_API_KEY ?? process.env.AI_GATEWAY_API_KEY ?? '';

const isGeminiImagePreviewModel = (model: string): boolean => {
  const normalized = model.toLowerCase();
  return normalized.includes('gemini') && normalized.includes('image');
};

const getVercelImageEndpoint = (model: string, configuredUrl: string): string => {
  if (isGeminiImagePreviewModel(model)) {
    return DEFAULT_VERCEL_CHAT_API_URL;
  }

  return configuredUrl || DEFAULT_VERCEL_IMAGES_API_URL;
};

const extractBase64FromDataUrl = (value: string): string | null => {
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  return match?.[1] ?? null;
};

const toBase64FromUrl = async (url: string, headers?: HeadersInit): Promise<string> => {
  const response = await fetch(url, headers ? { headers } : undefined);

  if (!response.ok) {
    throw new Error(`Image URL fetch failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
};

const normalizePortraitSprite = async (base64: string): Promise<string> => {
  const sourceBuffer = Buffer.from(base64, 'base64');
  const trimmedBuffer = await sharp(sourceBuffer)
    .trim()
    .png()
    .toBuffer();

  const metadata = await sharp(trimmedBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Generated portrait image is missing dimensions.');
  }

  const squareSize = Math.min(metadata.width, metadata.height);

  const normalizedBuffer = await sharp(trimmedBuffer)
    .extract({
      left: 0,
      top: 0,
      width: squareSize,
      height: squareSize,
    })
    .resize(PORTRAIT_CANVAS_SIZE, PORTRAIT_CANVAS_SIZE, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  return normalizedBuffer.toString('base64');
};

const normalizeBatchSheet = async (base64: string): Promise<Buffer> => {
  const sourceBuffer = Buffer.from(base64, 'base64');
  return sharp(sourceBuffer)
    .trim()
    .png()
    .toBuffer();
};

const splitBatchSheetIntoPortraits = async (base64: string, columns: number, rows: number): Promise<string[]> => {
  const normalizedBuffer = await normalizeBatchSheet(base64);
  const metadata = await sharp(normalizedBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Generated passport sheet is missing dimensions.');
  }

  const cellWidth = Math.floor(metadata.width / columns);
  const cellHeight = Math.floor(metadata.height / rows);
  const results: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = column * cellWidth;
      const top = row * cellHeight;

      const cellBuffer = await sharp(normalizedBuffer)
        .extract({
          left,
          top,
          width: cellWidth,
          height: cellHeight,
        })
        .resize(PORTRAIT_CANVAS_SIZE, PORTRAIT_CANVAS_SIZE, {
          fit: 'cover',
          position: 'centre',
          kernel: sharp.kernel.lanczos3,
        })
        .png()
        .toBuffer();

      results.push(cellBuffer.toString('base64'));
    }
  }

  return results;
};

const buildPortraitPrompt = (params: PortraitParams, layoutLabel: string): string => {
  const { passport, arrival, pressure_soft, pressure_hard } = getPortraitCellsForDemeanor(params.demeanor);

  return [
    `${layoutLabel} of the same traveler, four photos only, no more than four faces.`,
    `Exact 2x2 grid, equal square cells, same scale in all four cells, no gutters, no borders, no text, no watermark.`,
    `Top-left: ${passport} passport photo, front-facing, immigration document style, centered head and shoulders.`,
    `Top-right: arrival at border control expression ${arrival}, same person, same framing, same lighting.`,
    `Bottom-left: mild pressure expression ${pressure_soft}, same person, same framing, same lighting.`,
    `Bottom-right: high pressure expression ${pressure_hard}, same person, same framing, same lighting.`,
    `Character: ${sanitizeForPrompt(params.travelerName, 80)}, nationality ${sanitizeForPrompt(params.nationality, 40)}.`,
    `Purpose: ${sanitizeForPrompt(params.purpose, 80)}. Backstory: ${sanitizeForPrompt(params.backstory, 160)}.`,
    `Realistic documentary portrait photography, neutral background, one face per quadrant, no extra collage elements.`,
  ].join(' ');
};

const buildPassportPhotoPrompt = (params: PortraitParams): string => {
  return [
    'Single passport photo, one traveler only, no extra faces, no grid, no collage, no text, no watermark.',
    'Front-facing immigration document style photo, centered head and shoulders, neutral background, realistic documentary lighting.',
    `Traveler: ${sanitizeForPrompt(params.travelerName, 80)}, nationality ${sanitizeForPrompt(params.nationality, 40)}.`,
    `Gender: ${params.gender}. Age: ${params.ageRange}.`,
    `Demeanor hint: ${sanitizeForPrompt(params.demeanor, 24)}.`,
    `Purpose: ${sanitizeForPrompt(params.purpose, 80)}. Backstory: ${sanitizeForPrompt(params.backstory, 160)}.`,
    'The result must look like an official passport capture, clean and tightly framed.',
  ].join(' ');
};

const buildDayPassportBatchPrompt = ({ slots }: DayPassportBatchParams): string => {
  const ROW_LABELS = ['top', 'middle', 'bottom'] as const;
  const COL_LABELS = ['left', 'right'] as const;

  const travelerLines = slots.map((slot, index) => {
    const row = ROW_LABELS[Math.floor(index / 2)];
    const col = COL_LABELS[index % 2];
    return (
      `Slot ${index + 1} ${row}-${col}: ${sanitizeForPrompt(slot.name, 40)}; ${sanitizeForPrompt(slot.visual_identity.nationality, 20)}; ${sanitizeForPrompt(slot.visual_identity.gender, 10)}; ${sanitizeForPrompt(slot.visual_identity.age_range, 16)}; ${sanitizeForPrompt(slot.visual_identity.demeanor, 14)}; ${sanitizeForPrompt(slot.stated_purpose, 28)}; ${sanitizeForPrompt(slot.backstory, 48)}.`
    );
  });

  return truncateAtWordBoundary([
    'Passport contact sheet: exactly six different travelers in a strict 2-column by 3-row grid.',
    'Rectangular 2x3 only. Equal cells. One front-facing passport photo per cell. Neutral background. Documentary realism.',
    'No text, labels, borders, gutters, watermark, collage extras, or repeated faces.',
    'Keep slot order left-to-right, top-to-bottom: 1 top-left, 2 top-right, 3 middle-left, 4 middle-right, 5 bottom-left, 6 bottom-right.',
    'Do not swap people between slots.',
    ...travelerLines,
  ].join(' '), 1400);
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const normalizeAudioProviderLabel = (provider: AudioProvider): string => {
  switch (provider) {
    case 'fish':
      return 'fish';
    case 'lmnt':
      return 'lmnt';
  }
};

const normalizeImageProviderLabel = (provider: ImageProvider): string => {
  switch (provider) {
    case 'freepik':
      return 'freepik';
    case 'leonardo':
      return 'leonardo';
    case 'vercel':
      return 'vercel';
  }
};

const buildPassportPortraitAsset = (base64: string | null, demeanor: string, provider: string | null, model: string | null, status: PortraitAsset['status'], errorMessage?: string | null): PortraitAsset => ({
  status,
  spriteUrl: base64 ? toDataUrl(base64, 'image/png') : null,
  provider,
  model,
  errorMessage: errorMessage ?? null,
  expressions: ['passport'],
  columns: 1,
  rows: 1,
  selectedCell: 'passport',
  selectedExpression: getPassportSelectedExpressionForDemeanor(demeanor),
});

const generateFreepikImageBase64 = async (
  prompt: string,
  model: string,
  options?: {
    size?: 'square_1_1' | 'portrait_2_3' | 'portrait_3_4';
  },
): Promise<string> => {
  const flags = getFeatureFlags();
  const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': process.env.FREEPIK_API_KEY ?? '',
    },
    body: JSON.stringify({
      prompt,
      image: { size: options?.size ?? 'square_1_1' },
      num_images: 1,
      styling: {
        style: 'photo',
        effects: {
          lightning: 'studio',
          framing: 'portrait',
        },
      },
      filter_nsfw: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Freepik image generation failed with status ${response.status}${errorText ? `: ${truncateAtWordBoundary(errorText, 240)}` : ''}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ base64: string }>;
  };

  const base64 = payload.data?.[0]?.base64;
  if (!base64) {
    throw new Error('Freepik did not return image data.');
  }

  return base64;
};

const generateLeonardoImageBase64 = async (
  prompt: string,
  model: string,
  options?: {
    width?: number;
    height?: number;
  },
): Promise<string> => {
  const flags = getFeatureFlags();
  const requestedWidth = options?.width ?? flags.leonardoWidth;
  const requestedHeight = options?.height ?? flags.leonardoHeight;
  const includePortraitStyle = requestedWidth === flags.leonardoWidth && requestedHeight === flags.leonardoHeight;

  const createResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${process.env.LEONARDO_API_KEY ?? ''}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      modelId: model,
      prompt,
      contrast: flags.leonardoContrast,
      width: requestedWidth,
      height: requestedHeight,
      ...(includePortraitStyle ? { styleUUID: flags.leonardoPortraitStyleUuid } : {}),
      enhancePrompt: false,
      num_images: 1,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text().catch(() => '');
    throw new Error(`Leonardo image generation failed with status ${createResponse.status}${errorText ? `: ${truncateAtWordBoundary(errorText, 240)}` : ''}`);
  }

  const createPayload = (await createResponse.json()) as LeonardoGenerationResponse;
  const generationId = createPayload.sdGenerationJob?.generationId;

  if (!generationId) {
    throw new Error('Leonardo did not return a generation id.');
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    await sleep(attempt === 0 ? 1500 : 1200);

    const pollResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${process.env.LEONARDO_API_KEY ?? ''}`,
      },
    });

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text().catch(() => '');
      throw new Error(`Leonardo polling failed with status ${pollResponse.status}${errorText ? `: ${truncateAtWordBoundary(errorText, 240)}` : ''}`);
    }

    const pollPayload = (await pollResponse.json()) as LeonardoGenerationStatusResponse;
    const status = pollPayload.generations_by_pk?.status;
    const imageUrl = pollPayload.generations_by_pk?.generated_images?.[0]?.url;

    if (status === 'COMPLETE' && imageUrl) {
      return toBase64FromUrl(imageUrl);
    }

    if (status === 'FAILED') {
      throw new Error('Leonardo image generation failed during polling.');
    }
  }

  throw new Error('Leonardo image generation timed out.');
};

const generateVercelImageBase64 = async (
  prompt: string,
  model: string,
  options?: {
    size?: string;
  },
): Promise<string> => {
  const flags = getFeatureFlags();
  const apiKey = getImageGatewayApiKey();

  if (!apiKey) {
    throw new Error('Missing Vercel AI Gateway API key for image generation.');
  }

  const endpoint = getVercelImageEndpoint(model, flags.imageApiUrl);
  const requestBody = isGeminiImagePreviewModel(model)
    ? {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['text', 'image'],
        n: 1,
        stream: false,
      }
    : {
        model,
        prompt,
        n: 1,
        size: options?.size ?? '1024x1024',
        response_format: 'b64_json',
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.warn('[image] Vercel response error', JSON.stringify({ status: response.status, body: errorText }));
    throw new Error(`Vercel image generation failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; base64?: string; url?: string }>;
    choices?: Array<{
      message?: {
        images?: Array<{
          type?: string;
          image_url?: {
            url?: string;
          };
        }>;
      };
    }>;
  };

  const imagePayload = payload.data?.[0];
  const chatImageUrl = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const base64FromChat = chatImageUrl ? extractBase64FromDataUrl(chatImageUrl) : null;

  return base64FromChat
    ?? imagePayload?.b64_json
    ?? imagePayload?.base64
    ?? (imagePayload?.url ? await toBase64FromUrl(imagePayload.url, { Authorization: `Bearer ${apiKey}` }) : (() => {
      throw new Error('Vercel image generation did not return base64 data.');
    })());
};

const generateFreepikPortrait = async (params: PortraitParams, model: string): Promise<PortraitAsset> => {
  const base64 = await generateFreepikImageBase64(buildPortraitPrompt(params, 'Passport sprite sheet'), model);
  const normalizedBase64 = await normalizePortraitSprite(base64);

  return {
    status: 'generated',
    spriteUrl: toDataUrl(normalizedBase64, 'image/png'),
    provider: 'freepik',
    model,
    expressions: getExpressionsForDemeanor(params.demeanor),
    columns: 2,
    rows: 2,
    selectedCell: 'arrival',
    selectedExpression: getPortraitCellsForDemeanor(params.demeanor).arrival,
  };
};

const generateLeonardoPortrait = async (params: PortraitParams, model: string): Promise<PortraitAsset> => {
  const normalizedBase64 = await normalizePortraitSprite(await generateLeonardoImageBase64(buildPortraitPrompt(params, 'Passport sprite sheet'), model));

  return {
    status: 'generated',
    spriteUrl: toDataUrl(normalizedBase64, 'image/png'),
    provider: normalizeImageProviderLabel('leonardo'),
    model,
    expressions: getExpressionsForDemeanor(params.demeanor),
    columns: 2,
    rows: 2,
    selectedCell: 'arrival',
    selectedExpression: getPortraitCellsForDemeanor(params.demeanor).arrival,
  };
};

const generateVercelPortrait = async (params: PortraitParams, model: string): Promise<PortraitAsset> => {
  const normalizedBase64 = await normalizePortraitSprite(
    await generateVercelImageBase64(buildPortraitPrompt(params, 'Precise 2x2 passport contact sheet'), model),
  );

  return {
    status: 'generated',
    spriteUrl: toDataUrl(normalizedBase64, 'image/png'),
    provider: normalizeImageProviderLabel('vercel'),
    model,
    expressions: getExpressionsForDemeanor(params.demeanor),
    columns: 2,
    rows: 2,
    selectedCell: 'arrival',
    selectedExpression: getPortraitCellsForDemeanor(params.demeanor).arrival,
  };
};

export const generatePassportPhoto = async (params: PortraitParams): Promise<PortraitAsset> => {
  const flags = getFeatureFlags();
  const logger = getRequestLogger(params.log);

  if (!flags.imageEnabled) {
    return {
      ...getPlaceholderPassportPortrait(params.demeanor),
      status: 'disabled',
      model: null,
      errorMessage: null,
    };
  }

  let lastErrorMessage: string | null = null;
  let lastProviderTried: string | null = null;
  let lastModelTried: string | null = null;
  const prompt = buildPassportPhotoPrompt(params);

  for (const provider of flags.imageProviderOrder) {
    try {
      if (provider === 'freepik' && process.env.FREEPIK_API_KEY) {
        const base64 = await generateFreepikImageBase64(prompt, flags.freepikImageModel, { size: 'portrait_3_4' });
        const normalizedBase64 = await normalizePortraitSprite(base64);
        return buildPassportPortraitAsset(normalizedBase64, params.demeanor, normalizeImageProviderLabel('freepik'), flags.freepikImageModel, 'generated');
      }

      if (provider === 'leonardo' && process.env.LEONARDO_API_KEY) {
        const base64 = await generateLeonardoImageBase64(prompt, flags.leonardoImageModel, { width: 768, height: 1024 });
        const normalizedBase64 = await normalizePortraitSprite(base64);
        return buildPassportPortraitAsset(normalizedBase64, params.demeanor, normalizeImageProviderLabel('leonardo'), flags.leonardoImageModel, 'generated');
      }

      if (provider === 'vercel' && getImageGatewayApiKey() && flags.vercelImageModel) {
        const base64 = await generateVercelImageBase64(prompt, flags.vercelImageModel, { size: '768x1024' });
        const normalizedBase64 = await normalizePortraitSprite(base64);
        return buildPassportPortraitAsset(normalizedBase64, params.demeanor, normalizeImageProviderLabel('vercel'), flags.vercelImageModel, 'generated');
      }
    } catch (error) {
      lastProviderTried = normalizeImageProviderLabel(provider);
      lastModelTried = provider === 'freepik'
        ? flags.freepikImageModel
        : provider === 'leonardo'
          ? flags.leonardoImageModel
          : flags.vercelImageModel;
      lastErrorMessage = error instanceof Error ? error.message : 'Passport photo generation failed.';
      const warnMsg = `[image] ${provider} passport photo generation failed: ${lastErrorMessage}`;
      logger.warn(warnMsg, { provider, error: lastErrorMessage });
    }
  }

  return buildPassportPortraitAsset(null, params.demeanor, lastProviderTried, lastModelTried, 'error', lastErrorMessage);
};

export const generateDayPassportPhotos = async (params: DayPassportBatchParams): Promise<PortraitAsset[]> => {
  const { slots, log } = params;
  const flags = getFeatureFlags();
  const logger = getRequestLogger(log);

  if (!flags.imageEnabled) {
    return slots.map((slot) => ({
      ...getPlaceholderPassportPortrait(slot.demeanor),
      status: 'disabled' as const,
      model: null,
      errorMessage: null,
    }));
  }

  if (slots.length !== 6) {
    throw new Error('Day passport photo batch requires exactly 6 slots.');
  }

  logger.info(`[image] Starting individual passport photo generation for ${slots.length} travelers.`);

  const photoPromises = slots.map((slot) => {
    return generatePassportPhoto({
      travelerName: slot.name,
      nationality: slot.visual_identity.nationality,
      gender: slot.visual_identity.gender,
      ageRange: slot.visual_identity.age_range,
      demeanor: slot.visual_identity.demeanor,
      purpose: slot.stated_purpose,
      backstory: slot.backstory,
      log: params.log,
    });
  });

  const results = await Promise.allSettled(photoPromises);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error during individual generation';
      logger.warn(`[image] Failed to generate photo for slot ${index + 1}: ${errorMessage}`);
      return buildPassportPortraitAsset(null, slots[index]?.demeanor ?? 'neutral', null, null, 'error', errorMessage);
    }
  });
};

export const generatePortraitAsset = async (params: PortraitParams): Promise<PortraitAsset> => {
  const flags = getFeatureFlags();
  const logger = getRequestLogger(params.log);

  if (!flags.imageEnabled) {
    return {
      ...getPlaceholderPortrait(params.demeanor),
      status: 'disabled',
      model: null,
      errorMessage: null,
    };
  }

  let lastErrorMessage: string | null = null;
  let lastProviderTried: string | null = null;
  let lastModelTried: string | null = null;

  for (const provider of flags.imageProviderOrder) {
    if (provider === 'freepik' && process.env.FREEPIK_API_KEY) {
      try {
        return await generateFreepikPortrait(params, flags.freepikImageModel);
      } catch (error) {
        lastProviderTried = normalizeImageProviderLabel('freepik');
        lastModelTried = flags.freepikImageModel;
        lastErrorMessage = error instanceof Error ? error.message : 'Freepik portrait generation failed.';
        const warnMsg = `[image] Freepik portrait generation failed: ${lastErrorMessage}`;
        logger.warn(warnMsg, { provider: 'freepik', error: lastErrorMessage });
        continue;
      }
    }

    if (provider === 'leonardo' && process.env.LEONARDO_API_KEY) {
      try {
        return await generateLeonardoPortrait(params, flags.leonardoImageModel);
      } catch (error) {
        lastProviderTried = normalizeImageProviderLabel('leonardo');
        lastModelTried = flags.leonardoImageModel;
        lastErrorMessage = error instanceof Error ? error.message : 'Leonardo portrait generation failed.';
        const warnMsg = `[image] Leonardo portrait generation failed: ${lastErrorMessage}`;
        logger.warn(warnMsg, { provider: 'leonardo', error: lastErrorMessage });
        continue;
      }
    }

    if (provider === 'vercel' && getImageGatewayApiKey() && flags.vercelImageModel) {
      try {
        return await generateVercelPortrait(params, flags.vercelImageModel);
      } catch (error) {
        lastProviderTried = normalizeImageProviderLabel('vercel');
        lastModelTried = flags.vercelImageModel;
        lastErrorMessage = error instanceof Error ? error.message : 'Vercel portrait generation failed.';
        const warnMsg = `[image] Vercel portrait generation failed: ${lastErrorMessage}`;
        logger.warn(warnMsg, { provider: 'vercel', error: lastErrorMessage });
        continue;
      }
    }
  }

  return {
    ...getPlaceholderPortrait(params.demeanor),
    status: 'error',
    provider: lastProviderTried,
    model: lastModelTried,
    errorMessage: lastErrorMessage,
  };
};

const resolveFishVoiceId = (voiceHint: VoiceHint | null | undefined): string | null => {
  const flags = getFeatureFlags();

  if (voiceHint === 'male' && flags.fishAudioVoiceMaleId) {
    return flags.fishAudioVoiceMaleId;
  }
  if (voiceHint === 'female' && flags.fishAudioVoiceFemaleId) {
    return flags.fishAudioVoiceFemaleId;
  }
  if (voiceHint === 'neutral' && flags.fishAudioVoiceNeutralId) {
    return flags.fishAudioVoiceNeutralId;
  }

  return flags.fishAudioVoiceId;
};

const resolveLMNTVoiceId = (voiceHint: VoiceHint | null | undefined): string | null => {
  const flags = getFeatureFlags();

  if (voiceHint === 'male' && flags.lmntVoiceMaleId) {
    return flags.lmntVoiceMaleId;
  }
  if (voiceHint === 'female' && flags.lmntVoiceFemaleId) {
    return flags.lmntVoiceFemaleId;
  }
  if (voiceHint === 'neutral' && flags.lmntVoiceNeutralId) {
    return flags.lmntVoiceNeutralId;
  }

  return flags.lmntVoiceId;
};

const synthesizeWithFish = async (cleanedText: string, demeanor: string, voiceHint: VoiceHint | null | undefined): Promise<SpeechAsset> => {
  const flags = getFeatureFlags();
  const voiceId = resolveFishVoiceId(voiceHint);

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

const synthesizeWithLMNT = async (cleanedText: string, voiceHint: VoiceHint | null | undefined): Promise<SpeechAsset> => {
  const flags = getFeatureFlags();
  const voiceId = resolveLMNTVoiceId(voiceHint) ?? flags.lmntVoiceId;

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
  const { text, demeanor, voiceHint, log } = params;
  const flags = getFeatureFlags();
  const resolvedVoiceHint = voiceHint ?? getVoiceHintForDemeanor(demeanor);

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
        return await synthesizeWithFish(cleanedText, demeanor, resolvedVoiceHint);
      }

      if (provider === 'lmnt' && process.env.LMNT_API_KEY) {
        return await synthesizeWithLMNT(cleanedText, resolvedVoiceHint);
      }
    } catch (error) {
      lastProvider = normalizeAudioProviderLabel(provider);
      lastModel = provider === 'fish' ? flags.fishAudioModel : flags.lmntAudioModel;
      lastVoiceId = provider === 'fish' ? resolveFishVoiceId(resolvedVoiceHint) : resolveLMNTVoiceId(resolvedVoiceHint);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const warnMsg = `[audio] ${provider} speech synthesis failed: ${errorMsg}`;
      if (log) {
        log.warn(warnMsg, { provider, error: errorMsg });
      } else {
        console.warn(warnMsg);
      }
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
