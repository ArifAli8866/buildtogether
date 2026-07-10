import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center px-4"
            >
                <div className="text-8xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                    404
                </div>
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-3">
                    Page not found
                </h1>
                <p className="text-surface-500 dark:text-surface-400 mb-8 max-w-sm mx-auto">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                >
                    Back to Home
                </Link>
            </motion.div>
        </div>
    );
}
