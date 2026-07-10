import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { Button, Input } from '@/components/ui';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const { updatePassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setIsLoading(true);
        const { error: authError } = await updatePassword(password);
        if (authError) {
            setError(authError.message);
            setIsLoading(false);
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="w-full">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">Set new password</h1>
                <p className="text-surface-500 dark:text-surface-400 mt-1">Enter your new password below.</p>
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
                <Input type="password" label="New Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                <Input type="password" label="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
                <Button type="submit" className="w-full" loading={isLoading}>Update Password</Button>
            </form>
        </div>
    );
}
