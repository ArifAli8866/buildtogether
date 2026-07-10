import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

export const useProfile = (username?: string) => {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await api.get(`/users/${username}`);
      return data.data;
    },
    enabled: !!username,
  });
};

export const useSearchUsers = (filters: Record<string, any> = {}) => {
  return useQuery({
    queryKey: ['users', 'search', filters],
    queryFn: async () => {
      const { data } = await api.get('/users/search', { params: filters });
      return data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
      const { data } = await api.put('/users/me', updates);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/users/${userId}/follow`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useFollowers = (userId: string) => {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${userId}/followers`);
      return data;
    },
    enabled: !!userId,
  });
};

export const useFollowing = (userId: string) => {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${userId}/following`);
      return data;
    },
    enabled: !!userId,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/stats');
      return data.data;
    },
  });
};
