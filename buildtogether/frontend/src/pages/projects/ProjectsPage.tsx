import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProjects } from '@/hooks';
import { Badge } from '@/components/ui';

export default function ProjectsPage() {
    const { data, isLoading } = useProjects();
    const projects = (data as any)?.data || data || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white">Explore Projects</h1>
                    <p className="text-surface-500 dark:text-surface-400 mt-1">Discover projects looking for collaborators.</p>
                </div>
                <Link
                    to="/projects/create"
                    className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                >
                    + New Project
                </Link>
            </div>

            {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : projects.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project: any) => (
                        <motion.div
                            key={project.id}
                            whileHover={{ y: -4 }}
                            className="bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-6 hover:border-primary transition-colors"
                        >
                            <Link to={`/project/${project.id}`}>
                                <h3 className="font-semibold text-surface-900 dark:text-white mb-2">{project.title}</h3>
                                <p className="text-surface-500 dark:text-surface-400 text-sm line-clamp-3 mb-4">
                                    {project.description}
                                </p>
                                {project.tech_stack && (
                                    <div className="flex flex-wrap gap-1">
                                        {project.tech_stack.slice(0, 4).map((tech: string) => (
                                            <Badge key={tech} variant="primary" size="sm">{tech}</Badge>
                                        ))}
                                    </div>
                                )}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">🌱</div>
                    <h3 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">No projects yet</h3>
                    <p className="text-surface-500 dark:text-surface-400 mb-6">Be the first to post a project!</p>
                    <Link
                        to="/projects/create"
                        className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                        Create Project
                    </Link>
                </div>
            )}
        </div>
    );
}
