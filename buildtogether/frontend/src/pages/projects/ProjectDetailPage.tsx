import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui';
import { useProject } from '@/hooks';

export default function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: project, isLoading } = useProject(id || '');

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="h-64 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Project not found</h2>
                <Link to="/explore" className="text-primary hover:text-primary-600">Browse projects</Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-8"
            >
                <Link to="/explore" className="text-sm text-surface-500 dark:text-surface-400 hover:text-primary mb-6 inline-flex items-center gap-1">
                    ← Back to projects
                </Link>

                <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mt-4 mb-3">
                    {project.title}
                </h1>

                <p className="text-surface-600 dark:text-surface-400 mb-6 leading-relaxed">
                    {project.description}
                </p>

                {project.tech_stack && project.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {project.tech_stack.map((tech: string) => (
                            <Badge key={tech} variant="default">{tech}</Badge>
                        ))}
                    </div>
                )}

                <Link
                    to={`/projects/${id}/workspace`}
                    className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                >
                    Open Workspace
                </Link>
            </motion.div>
        </div>
    );
}
