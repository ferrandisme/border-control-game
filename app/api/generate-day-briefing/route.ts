import { NextResponse } from 'next/server';
import { z } from 'zod';

import { aiService } from '@/lib/ai-service';
import { getById } from '@/lib/inconsistency-catalog';
import { withRouteLogger } from '@/lib/route-logger';
import { DayBriefingSchema } from '@/schemas/day-content';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  day: z.number().int().min(1),
  case_ids: z.array(z.number().int().min(1).max(30).nullable()).length(6),
});

export const POST = withRouteLogger(async (request) => {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = RequestSchema.safeParse(json);

  if (!parsed.success) {
    request.log.error('Solicitud inválida para generar el briefing del día.', { errors: parsed.error.format() });
    return NextResponse.json({ error: 'Solicitud inválida para generar el briefing del día.' }, { status: 400 });
  }

  const references = parsed.data.case_ids
    .map((caseId) => (caseId === null ? null : getById(caseId)))
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .map((item) => `- ${item.title}: ${item.description}`)
    .join('\n');

  try {
    const result = await aiService.generateObject({
      schema: DayBriefingSchema,
      purpose: 'traveler',
      log: request.log,
      system: [
        'Eres un generador de boletines operativos internos para control fronterizo.',
        'Escribe siempre en español.',
        'Devuelve únicamente JSON válido según el schema solicitado, sin markdown ni texto extra.',
        'Mantén un tono burocrático, frío, objetivo y administrativo.',
      ].join(' '),
      prompt: [
        `Genera el briefing operativo del día ${parsed.data.day} para el “Aeropuerto Internacional Levante”.`,
        'Debes devolver un objeto JSON con exactamente estos campos: classification_level, alert_title, alert_body y watch_for.',
        'classification_level debe ser una de estas etiquetas exactas: CONFIDENCIAL, USO INTERNO o RUTINA.',
        'Usa CONFIDENCIAL si el conjunto del día sugiere varios expedientes sensibles, USO INTERNO si hay alertas limitadas, y RUTINA si no hay señales relevantes.',
        'alert_title debe ser breve, formal y administrativo. alert_body debe tener 2 o 3 frases frías, sobrias y operativas.',
        'watch_for debe contener 2 o 3 ítems muy concretos, redactados como señales de inspección y no como órdenes al jugador.',
        'El briefing debe aludir de forma vaga a patrones o riesgos del día, pero nunca revelar el caso exacto, el documento exacto a comparar, el nombre de la persona ni un detalle único que identifique un expediente concreto.',
        'Evita el tono literario, dramático o periodístico. No uses IDs. No hables de juego ni de jugadores.',
        'Ejemplo de estilo válido: {"classification_level":"USO INTERNO","alert_title":"Circular de seguimiento documental","alert_body":"Se recomienda reforzar la lectura cruzada de documentación en llegadas internacionales. Varias alertas internas apuntan a discrepancias discretas en expedientes no consecutivos.","watch_for":["Fechas plausibles pero mal alineadas entre documentos","Declaraciones demasiado cerradas sobre alojamiento o retorno"]}',
        references.length > 0
          ? `Referencias internas del día para inspirarte de forma abstracta y no literal:\n${references}`
          : 'No hay irregularidades confirmadas en la planificación del día; mantén un tono rutinario, preventivo y poco llamativo.',
      ].join('\n\n'),
    });

    return NextResponse.json(
      { briefing: result.object },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-AI-Provider': result.providerUsed,
          'X-AI-Attempted-Providers': result.fallbackMetadata.attemptedProviders.join(','),
          'X-AI-Failed-Providers': result.fallbackMetadata.failedProviders.join(','),
        },
      },
    );
  } catch (error) {
    request.log.error('No se pudo generar el briefing del día.', { error });
    return NextResponse.json(
      {
        error: 'No se pudo generar el briefing del día.',
      },
      { status: 503 },
    );
  }
});
