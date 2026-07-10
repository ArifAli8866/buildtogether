import { motion } from 'framer-motion';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-surface-50 dark:bg-surface-900 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto shadow-glow">
            <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
              <path d="M30 55 L45 40 L55 50 L70 35" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="30" cy="55" r="4" fill="white"/>
              <circle cx="45" cy="40" r="4" fill="white"/>
              <circle cx="55" cy="50" r="4" fill="white"/>
              <circle cx="70" cy="35" r="4" fill="white"/>
            </svg>
          </div>
        </motion.div>

        {/* Loading bar */}
        <div className="w-48 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden mx-auto">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>

        <p className="mt-4 text-surface-500 dark:text-surface-400 text-sm">
          Loading...
        </p>
      </motion.div>
    </div>
  );
};
