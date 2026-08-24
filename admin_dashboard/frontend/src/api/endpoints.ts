import { apiClient } from './client';
import type {
  EscalateRequest,
  HandoffCase,
  HandoffCaseDetail,
  HandoffQueueResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  OverrideRequest,
  OverrideResponse,
  ProfileAiSummary,
  ProfileAnalytics,
  ProfileDetail,
  ProfileListResponse,
  ProfileSummary,
  ResolveRequest,
  SendBackRequest,
  SuccessResponse,
} from '../types/api';

export const AuthApi = {
  login: (body: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', body).then((r) => r.data),
  me: () => apiClient.get<MeResponse>('/auth/me').then((r) => r.data),
};

export interface ProfileListFilters {
  segment?: string;
  min_score?: number;
  max_score?: number;
  page?: number;
  page_size?: number;
}

export const ProfilesApi = {
  list: (filters: ProfileListFilters) =>
    apiClient
      .get<ProfileListResponse>('/profiles', { params: filters })
      .then((r) => r.data),
  analytics: () =>
    apiClient.get<ProfileAnalytics>('/profiles/analytics').then((r) => r.data),
  detail: (playerId: string) =>
    apiClient.get<ProfileDetail>(`/profiles/${playerId}`).then((r) => r.data),
  summary: (playerId: string) =>
    apiClient
      .get<ProfileSummary>(`/profiles/${playerId}/summary`)
      .then((r) => r.data),
  summaryAi: (playerId: string) =>
    apiClient
      .get<ProfileAiSummary>(`/profiles/${playerId}/summary/ai`)
      .then((r) => r.data),
  override: (playerId: string, body: OverrideRequest) =>
    apiClient
      .post<OverrideResponse>(`/profiles/${playerId}/override`, body)
      .then((r) => r.data),
  exportUrl: (playerId: string, format: 'json' | 'pdf') =>
    `/api/profiles/${playerId}/export?format=${format}`,
};

export interface HandoffQueueFilters {
  status?: string;
  trigger_reason?: string;
  assigned_admin_id?: string;
  page?: number;
  page_size?: number;
}

export const HandoffsApi = {
  list: (filters: HandoffQueueFilters) =>
    apiClient
      .get<HandoffQueueResponse>('/handoffs', { params: filters })
      .then((r) => r.data),
  detail: (caseId: string) =>
    apiClient
      .get<HandoffCaseDetail>(`/handoffs/${caseId}`)
      .then((r) => r.data),
  claim: (caseId: string) =>
    apiClient
      .post<HandoffCase>(`/handoffs/${caseId}/claim`)
      .then((r) => r.data),
  resolve: (caseId: string, body: ResolveRequest) =>
    apiClient
      .post<SuccessResponse>(`/handoffs/${caseId}/resolve`, body)
      .then((r) => r.data),
  escalate: (caseId: string, body: EscalateRequest) =>
    apiClient
      .post<HandoffCase>(`/handoffs/${caseId}/escalate`, body)
      .then((r) => r.data),
  sendBack: (caseId: string, body: SendBackRequest) =>
    apiClient
      .post<SuccessResponse>(`/handoffs/${caseId}/send-back`, body)
      .then((r) => r.data),
};
