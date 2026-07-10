import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function TeamWorkspacePage() {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-8 text-center py-20"
            >
                <div className="text-6xl mb-4">⚡</div>
                <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white mb-2">
                    Team Workspace
                </h1>
                <p className="text-surface-500 dark:text-surface-400">
                    Project workspace for project <code className="text-primary">{id}</code> — coming soon.
                </p>
            </motion.div>
        </div>
    );
}
