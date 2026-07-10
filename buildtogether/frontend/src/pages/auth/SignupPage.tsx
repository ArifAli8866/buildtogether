import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { Button, Input } from '@/components/ui';

export default function SignupPage() {
    const navigate = useNavigate();
    const { signUp, signInWithOAuth } = useAuth();

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const { error: authError } = await signUp(email, password, fullName, username);
        if (authError) {
            setError(authError.message);
            setIsLoading(false);
        } else {
            setSuccess(true);
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Check your email</h2>
                <p className="text-surface-600 dark:text-surface-400 mb-6">
                    We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
                </p>
                <Link to="/login" className="text-primary hover:text-primary-600 font-medium">
                    Back to login
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-8 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none">
                        <path d="M30 55 L45 40 L55 50 L70 35" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="30" cy="55" r="4" fill="white" />
                        <circle cx="45" cy="40" r="4" fill="white" />
                        <circle cx="55" cy="50" r="4" fill="white" />
                        <circle cx="70" cy="35" r="4" fill="white" />
                    </svg>
                </div>
                <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">
                    Create your account
                </h1>
                <p className="text-surface-500 dark:text-surface-400 mt-1">
                    Join the BuildTogether community
                </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
                <button
                    onClick={() => signInWithOAuth('github')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Continue with GitHub
                </button>
            </div>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-200 dark:border-surface-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-surface-900 text-surface-500">or sign up with email</span>
                </div>
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

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
                    <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="janedoe" required />
                </div>
                <Input type="email" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                <Input type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />

                <Button type="submit" className="w-full" loading={isLoading}>
                    Create Account
                </Button>

                <p className="text-xs text-surface-500 dark:text-surface-400 text-center">
                    By signing up you agree to our{' '}
                    <Link to="/terms" className="text-primary">Terms</Link> and{' '}
                    <Link to="/privacy" className="text-primary">Privacy Policy</Link>.
                </p>
            </form>

            <p className="text-center text-sm text-surface-600 dark:text-surface-400 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:text-primary-600 font-medium">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
