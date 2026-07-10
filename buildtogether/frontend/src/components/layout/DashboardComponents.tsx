import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context';
import { Avatar } from '@/components/ui';
import {
    LayoutDashboard,
    FolderKanban,
    MessageSquare,
    Settings,
    Search,
    User,
    Bell,
    Menu,
    X,
    Plus,
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/explore', icon: FolderKanban, label: 'Projects' },
    { to: '/search', icon: Search, label: 'Search' },
];

interface DashboardNavbarProps {
    onMenuClick: () => void;
}

export const DashboardNavbar = ({ onMenuClick }: DashboardNavbarProps) => {
    const { profile } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 flex items-center px-4 gap-4">
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
                <Menu className="w-5 h-5 text-surface-600 dark:text-surface-400" />
            </button>

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 100 100" fill="none">
                        <path d="M30 55 L45 40 L55 50 L70 35" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="30" cy="55" r="5" fill="white" />
                    </svg>
                </div>
                <span className="font-display font-bold text-surface-900 dark:text-white hidden sm:block">
                    BuildTogether
                </span>
            </Link>

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Link
                    to="/projects/create"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" />
                    New Project
                </Link>
                <Link to="/settings" className="p-2 text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
                    <Bell className="w-5 h-5" />
                </Link>
                <Link to={`/u/${profile?.username || ''}`}>
                    <Avatar src={profile?.avatar_url} alt={profile?.full_name || ''} size="sm" />
                </Link>
            </div>
        </header>
    );
};

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <>
            {/* Mobile overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed top-16 left-0 bottom-0 w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 z-40 transform transition-transform duration-200 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full py-4">
                    {/* Nav */}
                    <nav className="flex-1 px-3 space-y-1">
                        {navItems.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Bottom */}
                    <div className="px-3 space-y-1 border-t border-surface-100 dark:border-surface-800 pt-4">
                        <NavLink
                            to="/settings"
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                                }`
                            }
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </NavLink>
                        <Link
                            to={`/u/${profile?.username || ''}`}
                            onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                        >
                            <User className="w-4 h-4" />
                            Profile
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
};
