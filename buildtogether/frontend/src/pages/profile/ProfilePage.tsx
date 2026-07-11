import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfile } from '@/hooks';
import { Badge } from '@/components/ui';

export default function ProfilePage() {
    const { username } = useParams<{ username: string }>();
    const { data: user, isLoading } = useProfile(username);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-surface-400">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 overflow-hidden"
            >
                {/* Cover */}
                <div className="h-32 bg-gradient-to-r from-primary-600 to-accent-600" />

                {/* Profile Info */}
                <div className="px-6 pb-6">
                    <div className="flex items-end gap-4 -mt-12 mb-4">
                        <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-surface-800 bg-surface-200 dark:bg-surface-700 overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-surface-400">
                                    {(user?.full_name || username || 'U')[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 pb-2">
                            <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">
                                {user?.full_name || username}
                            </h1>
                            <p className="text-surface-500 dark:text-surface-400">@{username}</p>
                        </div>
                        <Link
                            to={`/projects/create`}
                            className="px-4 py-2 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-600 dark:text-surface-400 hover:border-primary transition-colors"
                        >
                            Follow
                        </Link>
                    </div>

                    {user?.bio && (
                        <p className="text-surface-700 dark:text-surface-300 mb-4">{user.bio}</p>
                    )}

                    {/* Skills */}
                    {user?.skills && user.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {user.skills.map((skill: string) => (
                                <Badge key={skill} variant="default">{skill}</Badge>
                            ))}
                        </div>
                    )}

                    {!user && !isLoading && (
                        <div className="text-center py-8">
                            <p className="text-surface-500 dark:text-surface-400">User not found.</p>
                            <Link to="/explore" className="text-primary hover:text-primary-600 mt-2 inline-block">
                                Browse projects
                            </Link>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
