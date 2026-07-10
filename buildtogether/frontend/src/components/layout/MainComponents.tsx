import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { Avatar } from '@/components/ui';
import { Search, Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from '@/context';

export const Navbar = () => {
    const { isAuthenticated, profile } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4" viewBox="0 0 100 100" fill="none">
                                <path d="M30 55 L45 40 L55 50 L70 35" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="30" cy="55" r="5" fill="white" />
                                <circle cx="45" cy="40" r="5" fill="white" />
                                <circle cx="55" cy="50" r="5" fill="white" />
                                <circle cx="70" cy="35" r="5" fill="white" />
                            </svg>
                        </div>
                        <span className="font-display font-bold text-surface-900 dark:text-white">
                            BuildTogether
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-6">
                        <NavLink
                            to="/explore"
                            className={({ isActive }) =>
                                `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'}`
                            }
                        >
                            Explore
                        </NavLink>
                        <NavLink
                            to="/search"
                            className={({ isActive }) =>
                                `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'}`
                            }
                        >
                            Search
                        </NavLink>
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>

                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className="p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                                >
                                    <Bell className="w-4 h-4" />
                                </Link>
                                <Link to={`/u/${profile?.username || ''}`}>
                                    <Avatar
                                        src={profile?.avatar_url}
                                        name={profile?.full_name}
                                        size="sm"
                                    />
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-sm font-medium text-surface-700 dark:text-surface-300 hover:text-primary transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export const Footer = () => {
    return (
        <footer className="bg-surface-50 dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center">
                            <svg className="w-3 h-3" viewBox="0 0 100 100" fill="none">
                                <path d="M30 55 L45 40 L55 50 L70 35" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">BuildTogether</span>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                        © {new Date().getFullYear()} BuildTogether. Where ideas meet developers.
                    </p>
                    <div className="flex gap-4">
                        <Link to="/terms" className="text-xs text-surface-500 dark:text-surface-400 hover:text-primary">Terms</Link>
                        <Link to="/privacy" className="text-xs text-surface-500 dark:text-surface-400 hover:text-primary">Privacy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
