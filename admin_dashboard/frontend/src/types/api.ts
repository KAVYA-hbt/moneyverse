// TypeScript interfaces mirroring API_CONTRACT.md field-for-field.
// Keep this file in sync with API_CONTRACT.md — it is the source of truth.

export type Role = 'tier1_admin' | 'tier2_admin' | 'product_analyst';

export type TriggerReason =
  | 'bot_confusion'
  | 'distress_language'
  | 'dpdp_request'
  | 'high_value_decision'
  | 'explicit_human_request';

export type HandoffStatus = 'open' | 'claimed' | 'resolved';

export type EscalationSource = 'auto' | 'manual';

export type InteractionType = 'recommendation' | 'chat' | 'advisory_session';

export type FlagKind = 'mismatch' | 'distress' | 'compliance';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

// ---------- Auth ----------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  admin_id: string;
  name: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// ---------- Profiles ----------

export interface ProfileListItem {
  player_id: string;
  name: string;
  segment_tags: string[];
  current_game_level: number;
  last_active_at: string;
  confidence_level: ConfidenceLevel;
  open_mismatch_count: number;
}

export interface ProfileListResponse {
  items: ProfileListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface PlayerRecord {
  id: string;
  external_game_id: string;
  name: string;
  signup_date: string;
  last_active_at: string;
  current_game_level: number;
  minor_flag: boolean;
  consent_status: Record<string, unknown>;
}

// Real game telemetry frequently hasn't measured a given metric yet -- leaf values are `null`
// rather than omitted, and the UI greys those out instead of hiding or fabricating a value.
export interface FinancialLiteracy {
  [dimension: string]: number | null;
}

export interface FinancialProfile {
  financial_literacy: FinancialLiteracy;
  money_management_style?: Record<string, unknown>;
  savings_behavior?: Record<string, unknown>;
  risk_and_investment?: Record<string, unknown>;
  debt_and_credit?: Record<string, unknown>;
  product_affinity?: Record<string, unknown>;
  segment_tags: string[];
  // Present on some real telemetry exports: lists profile_json paths the current game build
  // doesn't measure yet, e.g. "risk_and_investment.diversification_tendency". Informational
  // only -- the UI's own null-check already greys out any missing field regardless.
  _data_availability?: { not_measured_by_current_game?: string[] };
  [key: string]: unknown;
}

export interface PsychometricProfile {
  decision_style?: Record<string, unknown>;
  risk_psychology?: Record<string, unknown>;
  time_preference?: Record<string, unknown>;
  cognitive_biases_detected?: Record<string, unknown> | string[];
  personality_traits_lite?: Record<string, number | null>;
  social_and_influence?: Record<string, unknown>;
  stress_response?: Record<string, unknown>;
  trait_summary_tags?: string[];
  // Shape varies by data source: a plain count (synthetic seed data) or
  // { total_decision_points_captured, confidence_level } (real telemetry export). Not rendered
  // directly today, so left loosely typed rather than picking one shape.
  sample_size?: unknown;
  _data_availability?: { not_measured_by_current_game?: string[] };
  [key: string]: unknown;
}

export interface OpenMismatch {
  id: string;
  mismatch_type: string;
  description: string;
  detected_at: string;
  resolved: boolean;
}

export interface ProfileDetail {
  player: PlayerRecord;
  financial_profile: FinancialProfile;
  psychometric_profile: PsychometricProfile;
  segment_tags: string[];
  confidence_level: ConfidenceLevel;
  confidence_score: number;
  open_mismatches: OpenMismatch[];
}

export interface TopQuest {
  quest_id: string;
  // Nullable: real game telemetry doesn't always classify a quest's type/score at completion
  // time -- render these greyed out rather than blank/NaN when null.
  quest_type: string | null;
  completed_at: string;
  outcome_score: number | null;
}

export interface TopInteraction {
  interaction_type: InteractionType;
  product_discussed: string;
  occurred_at: string;
  summary_text: string;
}

export interface ActiveFlag {
  kind: FlagKind;
  label: string;
  detail?: string;
}

export interface ProfileSummary {
  player_id: string;
  name: string;
  segment_tags: string[];
  top_quests: TopQuest[];
  top_interactions: TopInteraction[];
  active_flags: ActiveFlag[];
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface ProfileAnalytics {
  total_players: number;
  confidence_breakdown: Record<ConfidenceLevel, number>;
  segment_tag_counts: TagCount[];
  trait_tag_counts: TagCount[];
  product_interest_counts: TagCount[];
}

export interface ProfileAiSummary {
  summary_text: string;
  based_on: string[];
  generated_at: string;
  is_cached: boolean;
}

export interface OverrideRequest {
  field_path: string;
  new_value: unknown;
  reason: string;
}

export interface OverrideResponse {
  success: boolean;
  audit_log_id: string;
}

// ---------- Handoffs ----------

export interface HandoffQueueItem {
  id: string;
  player_id: string;
  player_name: string;
  trigger_reason: TriggerReason;
  tier_required: number;
  status: HandoffStatus;
  assigned_admin_id: string | null;
  created_at: string;
  active_flags: { kind: FlagKind; label: string }[];
}

export interface HandoffQueueResponse {
  items: HandoffQueueItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface HandoffCase {
  id: string;
  player_id: string;
  trigger_reason: TriggerReason;
  tier_required: number;
  status: HandoffStatus;
  assigned_admin_id: string | null;
  created_at: string;
  claimed_at: string | null;
  resolved_at: string | null;
  bot_reasoning_text: string;
  escalation_source: EscalationSource | null;
  escalated_by_admin_id: string | null;
  escalation_reason_text: string | null;
}

export interface TranscriptMessage {
  id: string;
  sender: 'player' | 'bot';
  message_text: string;
  sent_at: string;
  is_trigger_message: boolean;
}

export interface HandoffCaseDetail {
  case: HandoffCase;
  transcript: TranscriptMessage[];
  profile_summary: ProfileSummary;
  resolution: { outcome: string; notes: string } | null;
}

export interface ResolveRequest {
  outcome: string;
  notes: string;
}

export interface EscalateRequest {
  escalation_reason_text: string;
}

export interface SendBackRequest {
  note: string;
}

export interface SuccessResponse {
  success: boolean;
}

// ---------- WebSocket ----------

export interface WsCaseCreated {
  type: 'case_created';
  case: HandoffQueueItem;
}

export interface WsCaseClaimed {
  type: 'case_claimed';
  case_id: string;
  assigned_admin_id: string;
}

export interface WsCaseUpdated {
  type: 'case_updated';
  case_id: string;
}

export type WsMessage = WsCaseCreated | WsCaseClaimed | WsCaseUpdated;

// ---------- Errors ----------

export interface ApiErrorShape {
  detail: string;
}
