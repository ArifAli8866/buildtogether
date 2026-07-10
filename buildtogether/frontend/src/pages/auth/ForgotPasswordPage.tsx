import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { Button, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const { error: authError } = await resetPassword(email);
        if (authError) {
            setError(authError.message);
        } else {
            setSuccess(true);
        }
        setIsLoading(false);
    };

    if (success) {
        return (
            <div className="w-full text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Check your email</h2>
                <p className="text-surface-600 dark:text-surface-400 mb-6">
                    We sent a password reset link to <strong>{email}</strong>.
                </p>
                <Link to="/login" className="text-primary hover:text-primary-600 font-medium">Back to login</Link>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">Reset your password</h1>
                <p className="text-surface-500 dark:text-surface-400 mt-1">
                    Enter your email and we'll send you a reset link.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}
                <Input type="email" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                <Button type="submit" className="w-full" loading={isLoading}>Send Reset Link</Button>
            </form>

            <p className="text-center text-sm text-surface-600 dark:text-surface-400 mt-6">
                <Link to="/login" className="text-primary hover:text-primary-600 font-medium">← Back to login</Link>
            </p>
        </div>
    );
}
