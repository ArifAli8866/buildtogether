import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context';
import { useProjects, useUserProjects } from '@/hooks';

export default function DashboardPage() {
    const { profile } = useAuth();
    const { data: myProjectsData, isLoading } = useUserProjects('created');
    const projects = myProjectsData || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white">
                    Welcome back, {profile?.full_name?.split(' ')[0] || 'Builder'} 👋
                </h1>
                <p className="text-surface-500 dark:text-surface-400 mt-1">
                    Here's what's happening with your projects.
                </p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Active Projects', value: projects.length, color: 'from-primary to-primary-600' },
                    { label: 'Team Members', value: 0, color: 'from-accent to-accent-600' },
                    { label: 'Tasks Done', value: 0, color: 'from-emerald-500 to-emerald-600' },
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        whileHover={{ y: -2 }}
                        className="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-soft border border-surface-100 dark:border-surface-700"
                    >
                        <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                            {stat.value}
                        </div>
                        <div className="text-surface-500 dark:text-surface-400 text-sm mt-1">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Projects */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white">Your Projects</h2>
                    <Link
                        to="/projects/create"
                        className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                        + New Project
                    </Link>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-surface-400">Loading projects...</div>
                ) : projects.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {projects.map((project: any) => (
                            <Link
                                key={project.id}
                                to={`/project/${project.id}`}
                                className="block p-4 rounded-xl border border-surface-100 dark:border-surface-700 hover:border-primary hover:shadow-md transition-all"
                            >
                                <h3 className="font-semibold text-surface-900 dark:text-white mb-1">{project.title}</h3>
                                <p className="text-surface-500 dark:text-surface-400 text-sm line-clamp-2">{project.description}</p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🚀</div>
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">No projects yet</h3>
                        <p className="text-surface-500 dark:text-surface-400 mb-6">Create your first project and start building.</p>
                        <Link
                            to="/projects/create"
                            className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                        >
                            Create Project
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
