import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export interface LoginSession {
  id: string;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  current: boolean;
}

interface SessionsResponse {
  success: boolean;
  data: { sessions: LoginSession[] };
}

const sessionsApi = {
  list: async (): Promise<SessionsResponse> => {
    return apiClient.get('/auth/sessions');
  },
  revoke: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/auth/sessions/${id}`);
  },
  revokeOthers: async (): Promise<{ success: boolean; data: { revoked: number } }> => {
    return apiClient.delete('/auth/sessions');
  },
};

const SESSIONS_KEY = ['auth', 'sessions'] as const;

export const useSessions = () => {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: sessionsApi.list,
    staleTime: 30 * 1000,
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
};

export const useRevokeOtherSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.revokeOthers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
};
