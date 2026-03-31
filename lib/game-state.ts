import type { DocumentType, Traveler, Evidence } from '@/schemas/traveler';

export type GamePhase =
  | 'menu'
  | 'briefing'
  | 'loading_traveler'
  | 'inspecting'
  | 'chatting'
  | 'deciding'
  | 'result'
  | 'day_news'
  | 'game_over';

export type Decision = 'approve' | 'reject';
export type MobilePanel = 'documents' | 'chat';
export type AIProvider = 'groq' | 'openrouter' | 'cerebras' | 'vercel' | 'local' | 'sin conexión';
export type OpeningReplyStatus = 'idle' | 'pending' | 'completed' | 'failed';

export type ScoreState = {
  correct: number;
  wrong: number;
  streak: number;
};

export type ChatRole = 'agent' | 'traveler' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  audioUrl?: string;
  audioProvider?: string | null;
  audioModel?: string | null;
  audioVoiceId?: string | null;
  audioSanitizedText?: string | null;
};

export type PortraitExpression = 'passport' | 'neutral' | 'friendly' | 'nervous' | 'evasive' | 'aggressive' | 'confident';
export type PortraitCell = 'passport' | 'arrival' | 'pressure_soft' | 'pressure_hard';

export type PortraitState = {
  status: 'disabled' | 'placeholder' | 'generated' | 'error';
  spriteUrl: string | null;
  provider: string | null;
  model: string | null;
  expressions: PortraitExpression[];
  columns: number;
  rows: number;
  selectedCell: PortraitCell;
  selectedExpression: PortraitExpression;
};

export type ScenarioState = {
  today: string;
  inspectionDate: string;
  arrivalDate: string;
  departureDate: string;
};

export type ClassificationLevel = 'CONFIDENCIAL' | 'USO INTERNO' | 'RUTINA';

export type DayBriefing = {
  classification_level: ClassificationLevel;
  alert_title: string;
  alert_body: string;
  watch_for: string[];
};

export type DayResult = {
  traveler_name: string;
  was_guilty: boolean;
  player_decision: Decision;
  was_correct: boolean;
};

export type DayNews = {
  outlet: string;
  headline: string;
  subheadline: string;
  body: string;
  timestamp: string;
};

export type RoundResult = {
  playerDecision: Decision;
  actualDecision: Decision;
  correct: boolean;
  explanation: string;
  missedIssue: string | null;
  evidence: Evidence | null;
};

export type GameState = {
  phase: GamePhase;
  day: number;
  travelerIndexInDay: number;
  score: ScoreState;
  currentTraveler: Traveler | null;
  chatHistory: ChatMessage[];
  questionsAsked: number;
  activeDocument: DocumentType;
  provider_used: AIProvider;
  text_model_used: string;
  audio_provider_used: string | null;
  audio_model_used: string | null;
  image_provider_used: string | null;
  image_model_used: string | null;
  audio_enabled: boolean;
  image_enabled: boolean;
  error: string | null;
  result: RoundResult | null;
  debugOpen: boolean;
  mobilePanel: MobilePanel;
  openingReplyStatus: OpeningReplyStatus;
  current_state: string;
  portrait: PortraitState;
  scenario: ScenarioState | null;
  dayResults: DayResult[];
  currentDayCaseIds: Array<number | null>;
  recentCaseIdsByDay: number[][];
  briefing: DayBriefing | null;
  news: DayNews | null;
};

export type GameAction =
  | { type: 'start_loading' }
  | {
      type: 'load_success';
      traveler: Traveler;
      providerUsed: AIProvider;
      textModelUsed: string;
      activeDocument: DocumentType;
      scenario: ScenarioState;
      portrait: PortraitState;
      audioEnabled: boolean;
      imageEnabled: boolean;
      audioModelUsed: string | null;
      imageModelUsed: string | null;
      currentState: string;
    }
  | { type: 'load_failure'; message: string }
  | { type: 'set_active_document'; document: DocumentType }
  | { type: 'set_mobile_panel'; panel: MobilePanel }
  | { type: 'toggle_debug' }
  | { type: 'enter_deciding' }
  | { type: 'add_agent_message'; message: ChatMessage }
  | { type: 'append_traveler_chunk'; id: string; chunk: string }
  | { type: 'replace_message_content'; id: string; content: string }
  | { type: 'set_message_audio'; id: string; audioUrl: string; provider: string | null; model: string | null; voiceId: string | null; sanitizedText: string | null }
  | { type: 'set_portrait'; portrait: PortraitState }
  | { type: 'set_portrait_state'; cell: PortraitCell; expression: PortraitExpression }
  | { type: 'set_current_state'; currentState: string }
  | { type: 'complete_chat_turn'; providerUsed: AIProvider; modelUsed: string; consumeQuestion: boolean }
  | { type: 'set_chat_error'; message: string; openingReply?: boolean }
  | { type: 'set_day_setup'; briefing: DayBriefing; caseIds: Array<number | null> }
  | { type: 'dismiss_briefing' }
  | { type: 'resolve_round'; decision: Decision }
  | { type: 'set_day_news'; news: DayNews }
  | { type: 'prepare_next_traveler' }
  | { type: 'advance_day' }
  | { type: 'restart_game' };

export const MAX_QUESTIONS = 5;
export const MAX_WRONG_DECISIONS = 3;
export const TRAVELERS_PER_DAY = 6;

const INITIAL_SCORE: ScoreState = {
  correct: 0,
  wrong: 0,
  streak: 0,
};

export const INITIAL_AGENT_GREETING =
  'Buenas tardes. Entrégueme su pasaporte y explique brevemente el motivo de su visita.';

export const createInitialGameState = (): GameState => ({
  phase: 'menu',
  day: 1,
  travelerIndexInDay: 0,
  score: INITIAL_SCORE,
  currentTraveler: null,
  chatHistory: [],
  questionsAsked: 0,
  activeDocument: 'passport',
  provider_used: 'sin conexión',
  text_model_used: 'sin modelo',
  audio_provider_used: null,
  audio_model_used: null,
  image_provider_used: null,
  image_model_used: null,
  audio_enabled: false,
  image_enabled: false,
  error: null,
  result: null,
  debugOpen: false,
  mobilePanel: 'documents',
  openingReplyStatus: 'idle',
  current_state: 'neutral',
  portrait: {
    status: 'placeholder',
    spriteUrl: null,
    provider: null,
    model: null,
    expressions: ['passport', 'neutral', 'friendly', 'confident'],
    columns: 2,
    rows: 2,
    selectedCell: 'arrival',
    selectedExpression: 'neutral',
  },
  scenario: null,
  dayResults: [],
  currentDayCaseIds: [],
  recentCaseIdsByDay: [],
  briefing: null,
  news: null,
});

const getRoundExplanation = (traveler: Traveler, isCorrect: boolean): string => {
  if (traveler.internal.guilty) {
    return isCorrect
      ? `Detectaste correctamente la irregularidad: ${traveler.internal.inconsistency_description}`
      : `El viajero debía ser rechazado. Inconsistencia real: ${traveler.internal.inconsistency_description}`;
  }

  return isCorrect
    ? 'El viajero era legítimo. Su nerviosismo era compatible con el contexto y sus documentos eran coherentes.'
    : 'El viajero era legítimo. No había contradicciones materiales entre su relato y sus documentos.';
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'start_loading':
      return {
        ...state,
        phase: 'loading_traveler',
        currentTraveler: null,
        chatHistory: [],
        questionsAsked: 0,
        activeDocument: 'passport',
        error: null,
        result: null,
      };

    case 'load_success':
      return {
        ...state,
        phase: 'inspecting',
        currentTraveler: action.traveler,
        chatHistory: [
          {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            role: 'agent',
            content: INITIAL_AGENT_GREETING,
          },
        ],
        questionsAsked: 0,
        activeDocument: action.activeDocument,
        provider_used: action.providerUsed,
        text_model_used: action.textModelUsed,
        audio_model_used: action.audioModelUsed,
        image_model_used: action.imageModelUsed,
        image_provider_used: action.portrait.provider,
        audio_enabled: action.audioEnabled,
        image_enabled: action.imageEnabled,
        error: null,
        openingReplyStatus: 'pending',
        current_state: action.currentState,
        scenario: action.scenario,
        portrait: action.portrait,
      };

    case 'load_failure':
      return {
        ...state,
        phase: 'inspecting',
        error: action.message,
      };

    case 'set_active_document':
      return {
        ...state,
        activeDocument: action.document,
      };

    case 'set_mobile_panel':
      return {
        ...state,
        mobilePanel: action.panel,
      };

    case 'toggle_debug':
      return {
        ...state,
        debugOpen: !state.debugOpen,
      };

    case 'enter_deciding':
      return {
        ...state,
        phase: 'deciding',
      };

    case 'add_agent_message':
      return {
        ...state,
        phase: 'chatting',
        chatHistory: [...state.chatHistory, action.message],
        error: null,
        mobilePanel: 'chat',
      };

    case 'append_traveler_chunk':
      return {
        ...state,
        chatHistory: state.chatHistory.some((message) => message.id === action.id)
          ? state.chatHistory.map((message) =>
              message.id === action.id
                ? { ...message, content: `${message.content}${action.chunk}` }
                : message,
            )
          : [
              ...state.chatHistory,
              {
                id: action.id,
                role: 'traveler',
                content: action.chunk,
              },
            ],
      };

    case 'replace_message_content':
      return {
        ...state,
        chatHistory: state.chatHistory.map((message) =>
          message.id === action.id ? { ...message, content: action.content } : message,
        ),
      };

    case 'set_message_audio':
      return {
        ...state,
        chatHistory: state.chatHistory.map((message) =>
          message.id === action.id
            ? {
                ...message,
                audioUrl: action.audioUrl,
                audioProvider: action.provider,
                audioModel: action.model,
                audioVoiceId: action.voiceId,
                audioSanitizedText: action.sanitizedText,
              }
            : message,
        ),
        audio_provider_used: action.provider,
        audio_model_used: action.model,
      };

    case 'set_portrait':
      return {
        ...state,
        portrait: action.portrait,
        image_provider_used: action.portrait.provider,
        image_model_used: action.portrait.model,
      };

    case 'set_portrait_state':
      return {
        ...state,
        portrait: {
          ...state.portrait,
          selectedCell: action.cell,
          selectedExpression: action.expression,
        },
      };

    case 'set_current_state':
      return {
        ...state,
        current_state: action.currentState,
      };

    case 'complete_chat_turn':
      return {
        ...state,
        provider_used: action.providerUsed,
        text_model_used: action.modelUsed,
        questionsAsked: action.consumeQuestion ? state.questionsAsked + 1 : state.questionsAsked,
        phase:
          action.consumeQuestion && state.questionsAsked + 1 >= MAX_QUESTIONS ? 'deciding' : 'chatting',
        openingReplyStatus: action.consumeQuestion ? 'completed' : 'completed',
      };

    case 'set_chat_error':
      return {
        ...state,
        phase: 'chatting',
        error: action.message,
        openingReplyStatus: action.openingReply ? 'failed' : state.openingReplyStatus,
      };

    case 'set_day_setup':
      return {
        ...state,
        phase: 'briefing',
        briefing: action.briefing,
        currentDayCaseIds: action.caseIds,
        news: null,
        error: null,
      };

    case 'dismiss_briefing':
      return {
        ...state,
        phase: 'loading_traveler',
      };

    case 'resolve_round': {
      if (!state.currentTraveler) {
        return state;
      }

      const actualDecision: Decision = state.currentTraveler.internal.guilty ? 'reject' : 'approve';
      const correct = action.decision === actualDecision;
      const wrong = state.score.wrong + (correct ? 0 : 1);

      return {
        ...state,
        phase: wrong >= MAX_WRONG_DECISIONS ? 'game_over' : 'result',
        score: {
          correct: state.score.correct + (correct ? 1 : 0),
          wrong,
          streak: correct ? state.score.streak + 1 : 0,
        },
        result: {
          playerDecision: action.decision,
          actualDecision,
          correct,
          explanation: getRoundExplanation(state.currentTraveler, correct),
          missedIssue: !correct && state.currentTraveler.internal.guilty
            ? state.currentTraveler.internal.inconsistency_description
            : !correct
              ? 'No existía ninguna irregularidad real en el expediente.'
              : null,
          evidence: !correct && state.currentTraveler.internal.guilty
            ? (state.currentTraveler.internal.evidence ?? null)
            : null,
        },
        dayResults: [
          ...state.dayResults,
          {
            traveler_name: state.currentTraveler.profile.name,
            was_guilty: state.currentTraveler.internal.guilty,
            player_decision: action.decision,
            was_correct: correct,
          },
        ],
      };
    }

    case 'set_day_news':
      return {
        ...state,
        phase: 'day_news',
        news: action.news,
        error: null,
      };

    case 'prepare_next_traveler':
      return {
        ...state,
        travelerIndexInDay:
          state.travelerIndexInDay + 1 >= TRAVELERS_PER_DAY ? state.travelerIndexInDay : state.travelerIndexInDay + 1,
        phase: state.travelerIndexInDay + 1 >= TRAVELERS_PER_DAY ? 'day_news' : 'loading_traveler',
        currentTraveler: null,
        chatHistory: [],
        questionsAsked: 0,
        activeDocument: 'passport',
        provider_used: 'sin conexión',
        text_model_used: 'sin modelo',
        audio_provider_used: null,
        audio_model_used: null,
        image_provider_used: null,
        image_model_used: null,
        audio_enabled: false,
        image_enabled: false,
        error: null,
        result: null,
        openingReplyStatus: 'idle',
        current_state: 'neutral',
        portrait: createInitialGameState().portrait,
        scenario: null,
      };

    case 'advance_day': {
      const currentDayUsedIds = Array.from(
        new Set(state.currentDayCaseIds.filter((value): value is number => value !== null)),
      );

      return {
        ...state,
        day: state.day + 1,
        travelerIndexInDay: 0,
        phase: 'loading_traveler',
        currentTraveler: null,
        chatHistory: [],
        questionsAsked: 0,
        activeDocument: 'passport',
        provider_used: 'sin conexión',
        text_model_used: 'sin modelo',
        audio_provider_used: null,
        audio_model_used: null,
        image_provider_used: null,
        image_model_used: null,
        audio_enabled: false,
        image_enabled: false,
        error: null,
        result: null,
        openingReplyStatus: 'idle',
        current_state: 'neutral',
        portrait: createInitialGameState().portrait,
        scenario: null,
        dayResults: [],
        currentDayCaseIds: [],
        recentCaseIdsByDay: [...state.recentCaseIdsByDay, currentDayUsedIds].slice(-2),
        briefing: null,
        news: null,
      };
    }

    case 'restart_game':
      return createInitialGameState();

    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
};
