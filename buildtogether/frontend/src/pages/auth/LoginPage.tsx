import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, signInWithOAuth } = useAuth();
    const from = (location.state as any)?.from?.pathname || '/dashboard';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const { error: authError } = await signIn(email, password, rememberMe);
        if (authError) {
            setError(authError.message);
            setIsLoading(false);
        } else {
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="w-full">
            {/* Logo */}
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
                    Welcome back
                </h1>
                <p className="text-surface-500 dark:text-surface-400 mt-1">
                    Sign in to your BuildTogether account
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
                <button
                    onClick={() => signInWithOAuth('google')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>
            </div>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-200 dark:border-surface-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-surface-900 text-surface-500">or continue with email</span>
                </div>
            </div>

            {/* Email Form */}
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

                <Input
                    type="email"
                    label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                />
                <Input
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                />

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-surface-300 text-primary"
                        />
                        <span className="text-sm text-surface-600 dark:text-surface-400">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-600">
                        Forgot password?
                    </Link>
                </div>

                <Button type="submit" className="w-full" loading={isLoading}>
                    Sign In
                </Button>
            </form>

            <p className="text-center text-sm text-surface-600 dark:text-surface-400 mt-6">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:text-primary-600 font-medium">
                    Sign up free
                </Link>
            </p>
        </div>
    );
}
