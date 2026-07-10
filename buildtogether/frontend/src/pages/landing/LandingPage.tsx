import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-800">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-5xl md:text-7xl font-display font-bold text-surface-900 dark:text-white mb-6">
                        Build Together,{' '}
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Ship Faster
                        </span>
                    </h1>
                    <p className="text-xl text-surface-600 dark:text-surface-400 max-w-2xl mx-auto mb-10">
                        Connect with talented developers, designers, and builders to turn your ideas into reality.
                        Find your team. Build your vision.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup"
                            className="px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-glow"
                        >
                            Get Started Free
                        </Link>
                        <Link
                            to="/explore"
                            className="px-8 py-4 bg-white dark:bg-surface-800 text-surface-900 dark:text-white font-semibold rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary transition-colors"
                        >
                            Explore Projects
                        </Link>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-20"
                >
                    {[
                        { value: '10K+', label: 'Developers' },
                        { value: '2.5K+', label: 'Projects' },
                        { value: '500+', label: 'Teams' },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <div className="text-3xl font-bold text-primary">{stat.value}</div>
                            <div className="text-surface-500 dark:text-surface-400 text-sm mt-1">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            title: 'Find Co-Founders',
                            description: 'Connect with developers and designers who share your passion.',
                            icon: '🤝',
                        },
                        {
                            title: 'Collaborate in Real-Time',
                            description: 'Built-in team chat, task management, and project workspace.',
                            icon: '⚡',
                        },
                        {
                            title: 'Launch Together',
                            description: 'From idea to launch — build and ship products as a team.',
                            icon: '🚀',
                        },
                    ].map((feature) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -4 }}
                            className="bg-white dark:bg-surface-800 rounded-2xl p-8 shadow-soft border border-surface-100 dark:border-surface-700"
                        >
                            <div className="text-4xl mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-semibold text-surface-900 dark:text-white mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-surface-600 dark:text-surface-400">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-3xl p-12">
                    <h2 className="text-3xl font-display font-bold text-white mb-4">
                        Ready to build your next big thing?
                    </h2>
                    <p className="text-white/80 mb-8 text-lg">
                        Join thousands of builders creating the future, together.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-block px-8 py-4 bg-white text-primary font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    >
                        Start Building Today
                    </Link>
                </div>
            </div>
        </div>
    );
}
