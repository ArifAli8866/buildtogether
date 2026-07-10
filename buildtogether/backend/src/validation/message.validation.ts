import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z.object({
    channel_id: z.string().uuid(),
    content: z.string().min(1).max(5000),
    message_type: z.enum(['text', 'image', 'file', 'code', 'link']).default('text'),
    attachment_url: z.string().url().optional(),
    reply_to_id: z.string().uuid().optional(),
  }),
});

export const channelIdSchema = z.object({
  params: z.object({
    channelId: z.string().uuid(),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    channelId: z.string().uuid(),
  }),
  query: z.object({
    before: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});
