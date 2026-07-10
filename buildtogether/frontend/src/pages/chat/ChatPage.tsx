import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { useMessages, useSendMessage } from '@/hooks';
import { Input } from '@/components/ui';

export default function ChatPage() {
    const { id } = useParams<{ id: string }>();
    const { profile } = useAuth();
    const { data: messages, isLoading } = useMessages(id || '');
    const { mutate: sendMsg } = useSendMessage();
    const [text, setText] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !id) return;
        sendMsg({ channel_id: id, content: text.trim() });
        setText('');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="py-4 border-b border-surface-200 dark:border-surface-700">
                <h1 className="text-xl font-semibold text-surface-900 dark:text-white">Project Chat</h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">Project #{id}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {isLoading ? (
                    <div className="text-center text-surface-400 py-10">Loading messages...</div>
                ) : messages && messages.length > 0 ? (
                    messages.map((msg: any) => {
                        const isMe = msg.sender_id === profile?.id;
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMe
                                            ? 'bg-gradient-to-r from-primary to-accent text-white rounded-tr-sm'
                                            : 'bg-white dark:bg-surface-800 text-surface-900 dark:text-white border border-surface-100 dark:border-surface-700 rounded-tl-sm'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="text-center text-surface-400 py-10">
                        No messages yet. Start the conversation!
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="py-4 border-t border-surface-200 dark:border-surface-700">
                <form onSubmit={handleSend} className="flex gap-3">
                    <div className="flex-1">
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type a message..."
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
