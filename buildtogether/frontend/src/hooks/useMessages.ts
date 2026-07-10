import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';

export const useChannels = (projectId: string) => {
  return useQuery({
    queryKey: ['channels', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/messages/channels/${projectId}`);
      return data.data;
    },
    enabled: !!projectId,
  });
};

export const useMessages = (channelId: string) => {
  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const { data } = await api.get(`/messages/channels/${channelId}/messages`);
      return data.data;
    },
    enabled: !!channelId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: any) => {
      const { data } = await api.post('/messages/send', message);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channel_id] });
    },
  });
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...channel }: any) => {
      const { data } = await api.post(`/messages/channels/${projectId}`, channel);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channels', variables.projectId] });
    },
  });
};
