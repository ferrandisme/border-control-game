import { z } from 'zod';

export const ClassificationLevelSchema = z.enum(['CONFIDENCIAL', 'USO INTERNO', 'RUTINA']);

export const DayBriefingSchema = z.object({
  classification_level: ClassificationLevelSchema,
  alert_title: z.string().min(12).max(140),
  alert_body: z.string().min(40).max(420),
  watch_for: z.array(z.string().min(8).max(180)).min(2).max(3),
});

export const DayResultSchema = z.object({
  traveler_name: z.string().min(2),
  was_guilty: z.boolean(),
  player_decision: z.enum(['approve', 'reject']),
  was_correct: z.boolean(),
});

export const DayNewsSchema = z.object({
  outlet: z.string().min(3).max(90),
  headline: z.string().min(12).max(180),
  subheadline: z.string().min(12).max(220),
  body: z.string().min(80).max(1200),
  timestamp: z.string().min(4).max(40),
});

export type DayBriefingContent = z.infer<typeof DayBriefingSchema>;
export type DayResultInput = z.infer<typeof DayResultSchema>;
export type DayNewsContent = z.infer<typeof DayNewsSchema>;
