import { useQuery } from '@tanstack/react-query';
import { ProfilesApi, type ProfileListFilters } from '../api/endpoints';

export function useProfileList(filters: ProfileListFilters) {
  return useQuery({
    queryKey: ['profiles', filters],
    queryFn: () => ProfilesApi.list(filters),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useProfileAnalytics() {
  return useQuery({
    queryKey: ['profile-analytics'],
    queryFn: () => ProfilesApi.analytics(),
    staleTime: 60_000,
  });
}

export function useProfile(playerId: string | undefined) {
  return useQuery({
    queryKey: ['profile', playerId],
    queryFn: () => ProfilesApi.detail(playerId as string),
    enabled: !!playerId,
    staleTime: 120_000,
  });
}

export function useProfileSummary(playerId: string | undefined) {
  return useQuery({
    queryKey: ['profile-summary', playerId],
    queryFn: () => ProfilesApi.summary(playerId as string),
    enabled: !!playerId,
    staleTime: 120_000,
  });
}

export function useProfileAiSummary(playerId: string | undefined) {
  return useQuery({
    queryKey: ['profile-summary-ai', playerId],
    queryFn: () => ProfilesApi.summaryAi(playerId as string),
    enabled: !!playerId,
    staleTime: 120_000,
  });
}
