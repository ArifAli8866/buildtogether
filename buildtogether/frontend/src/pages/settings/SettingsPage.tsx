import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { Button, Input } from '@/components/ui';
import { useState } from 'react';

const TABS = ['account', 'notifications', 'privacy', 'appearance'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
    const { tab = 'account' } = useParams<{ tab?: Tab }>();
    const navigate = useNavigate();
    const { profile, signOut } = useAuth();
    const [email] = useState(profile?.email || '');

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-8">Settings</h1>

            <div className="flex gap-8">
                {/* Sidebar */}
                <aside className="w-48 shrink-0">
                    <nav className="space-y-1">
                        {TABS.map((t) => (
                            <button
                                key={t}
                                onClick={() => navigate(`/settings/${t}`)}
                                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${tab === t
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-6"
                >
                    {tab === 'account' && (
                        <div>
                            <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-6">Account</h2>
                            <div className="space-y-4">
                                <Input label="Email" value={email} readOnly />
                                <div className="pt-4 border-t border-surface-100 dark:border-surface-700">
                                    <h3 className="font-medium text-surface-900 dark:text-white mb-3">Danger Zone</h3>
                                    <Button variant="ghost" onClick={signOut} className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300">
                                        Sign Out
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    {tab === 'notifications' && (
                        <div>
                            <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-6">Notifications</h2>
                            <p className="text-surface-500 dark:text-surface-400">Notification settings coming soon.</p>
                        </div>
                    )}
                    {tab === 'privacy' && (
                        <div>
                            <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-6">Privacy</h2>
                            <p className="text-surface-500 dark:text-surface-400">Privacy settings coming soon.</p>
                        </div>
                    )}
                    {tab === 'appearance' && (
                        <div>
                            <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-6">Appearance</h2>
                            <p className="text-surface-500 dark:text-surface-400">Theme customization coming soon.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
