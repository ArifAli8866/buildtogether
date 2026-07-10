import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

export const useNotifications = (page = 1, unreadOnly = false) => {
  return useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: async () => {
      const { data } = await api.get('/notifications', {
        params: { page, unread: unreadOnly },
      });
      return data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.data.count;
    },
    refetchInterval: 30000,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
