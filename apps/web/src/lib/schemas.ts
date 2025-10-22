import { z } from "zod";

// Schema para Action Items
export const ActionItem = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha debe ser YYYY-MM-DD").optional(),
  source: z.string().optional(), // p.ej. "Meeting 2025-10-22"
  timestampSec: z.number().optional(), // minuto del audio
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "created", "failed"]).default("pending"),
});

export type ActionItem = z.infer<typeof ActionItem>;

// Schema para eventos de OpenAI Realtime
export const RealtimeEvent = z.object({
  type: z.enum([
    "transcript.partial", 
    "transcript.final", 
    "insight.action_items", 
    "insight.summary",
    "error",
    "session.created",
    "session.updated"
  ]),
  data: z.any(),
  timestamp: z.number().optional(),
});

export type RealtimeEvent = z.infer<typeof RealtimeEvent>;

// Schema para transcripción
export const TranscriptSegment = z.object({
  text: z.string(),
  timestamp: z.number(),
  isPartial: z.boolean().default(false),
  confidence: z.number().min(0).max(1).optional(),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegment>;

// Schema para resúmenes de sesión
export const SessionSummary = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // en segundos
  participants: z.array(z.string()).optional(),
  actionItems: z.array(ActionItem),
  transcript: z.array(TranscriptSegment).optional(),
});

export type SessionSummary = z.infer<typeof SessionSummary>;

// Schemas para endpoints API

// Linear API
export const CreateLinearTaskRequest = z.object({
  items: z.array(ActionItem),
  sessionId: z.string().optional(),
});

export const CreateLinearTaskResponse = z.object({
  results: z.array(z.object({
    title: z.string(),
    identifier: z.string(),
    url: z.string(),
    id: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
});

// Coda API
export const CreateCodaTaskRequest = z.object({
  items: z.array(ActionItem),
  sessionId: z.string().optional(),
});

export const CreateCodaTaskResponse = z.object({
  results: z.array(z.object({
    title: z.string(),
    rowId: z.string(),
    url: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
});

// Session API
export const CreateSessionRequest = z.object({
  title: z.string().optional(),
  summary: z.string(),
  actionItems: z.array(ActionItem),
  transcript: z.array(TranscriptSegment).optional(),
});

export const GetSessionsResponse = z.object({
  sessions: z.array(SessionSummary),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// WebSocket message schemas
export const WSMessage = z.object({
  type: z.enum([
    "audio_chunk",
    "transcript_partial",
    "transcript_final", 
    "action_items",
    "summary",
    "error",
    "session_start",
    "session_end"
  ]),
  data: z.any(),
  timestamp: z.number().optional(),
});

export type WSMessage = z.infer<typeof WSMessage>;

// Error handling
export const APIError = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

export type APIError = z.infer<typeof APIError>;

// Utility functions para validación
export const validateActionItem = (data: unknown): ActionItem => {
  return ActionItem.parse(data);
};

export const validateActionItems = (data: unknown): ActionItem[] => {
  return z.array(ActionItem).parse(data);
};

export const validateRealtimeEvent = (data: unknown): RealtimeEvent => {
  return RealtimeEvent.parse(data);
};

export const validateWSMessage = (data: unknown): WSMessage => {
  return WSMessage.parse(data);
};

// Constants
export const REALTIME_EVENT_TYPES = {
  TRANSCRIPT_PARTIAL: "transcript.partial",
  TRANSCRIPT_FINAL: "transcript.final", 
  INSIGHT_ACTION_ITEMS: "insight.action_items",
  INSIGHT_SUMMARY: "insight.summary",
  ERROR: "error",
  SESSION_CREATED: "session.created",
  SESSION_UPDATED: "session.updated",
} as const;

export const WS_MESSAGE_TYPES = {
  AUDIO_CHUNK: "audio_chunk",
  TRANSCRIPT_PARTIAL: "transcript_partial",
  TRANSCRIPT_FINAL: "transcript_final",
  ACTION_ITEMS: "action_items",
  SUMMARY: "summary",
  ERROR: "error",
  SESSION_START: "session_start",
  SESSION_END: "session_end",
} as const;