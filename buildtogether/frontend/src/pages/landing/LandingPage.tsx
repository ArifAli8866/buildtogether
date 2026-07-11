import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Rocket, Users, Zap, MessageSquare, Briefcase, Globe, Sparkles } from 'lucide-react';

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: { once: true, margin: "-50px" },
    transition: { staggerChildren: 0.2 }
};

export default function LandingPage() {
    const { scrollYProgress } = useScroll();
    const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900 overflow-hidden relative">
            {/* Animated Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-400/20 dark:bg-primary-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" />
            <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] rounded-full bg-accent-400/20 dark:bg-accent-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-float" />
            <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-success-400/10 dark:bg-success-900/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong mb-8 text-sm font-medium text-surface-700 dark:text-surface-300 border border-surface-200/50 dark:border-surface-700/50"
                >
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>The ultimate platform for builders</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                    className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold text-surface-900 dark:text-white leading-tight mb-6 tracking-tight max-w-5xl"
                >
                    Build Together. <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent relative inline-block">
                        Ship Faster.
                        <motion.div
                            className="absolute -bottom-2 left-0 w-full h-3 bg-accent/20 blur-md rounded-full -z-10"
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    className="text-xl md:text-2xl text-surface-600 dark:text-surface-400 max-w-3xl mx-auto mb-12 leading-relaxed"
                >
                    Connect with talented developers, designers, and visionaries. Form your dream team and turn ambitious ideas into reality.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto"
                >
                    <Link
                        to="/signup"
                        className="px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-2xl hover:opacity-90 transition-all transform hover:-translate-y-1 hover:shadow-glow flex items-center justify-center gap-2 group"
                    >
                        Get Started Free
                        <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        to="/explore"
                        className="px-8 py-4 bg-white/50 dark:bg-surface-800/50 backdrop-blur-md text-surface-900 dark:text-white font-semibold rounded-2xl border flex items-center justify-center gap-2 border-surface-200 dark:border-surface-700 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-white dark:hover:bg-surface-800 transition-all transform hover:-translate-y-1 shadow-glass-sm"
                    >
                        Explore Projects
                        <Globe className="w-5 h-5" />
                    </Link>
                </motion.div>

                {/* Floating Elements / Mockup representation */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="mt-20 w-full max-w-5xl relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-50 dark:to-surface-900 z-10 bottom-0 h-1/2 mt-auto" />
                    <img
                        src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2672&auto=format&fit=crop"
                        alt="Platform Preview"
                        className="rounded-t-3xl border border-surface-200 dark:border-surface-700 shadow-2xl object-cover h-[400px] w-full object-top opacity-80 dark:opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
                    />
                </motion.div>
            </section>

            {/* Stats Section */}
            <section className="border-y border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-800/30 backdrop-blur-md relative z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-surface-200 dark:divide-surface-700"
                    >
                        {[
                            { value: '10K+', label: 'Active Builders', icon: Users },
                            { value: '2.5K+', label: 'Projects Launched', icon: Rocket },
                            { value: '500+', label: 'Teams Formed', icon: Briefcase },
                            { value: '99%', label: 'Satisfaction Rate', icon: Zap },
                        ].map((stat, i) => (
                            <motion.div key={i} variants={fadeInUp} className="text-center flex flex-col items-center">
                                <div className="p-3 bg-primary/10 rounded-2xl mb-4">
                                    <stat.icon className="w-6 h-6 text-primary" />
                                </div>
                                <div className="text-4xl font-display font-bold text-surface-900 dark:text-white mb-1">{stat.value}</div>
                                <div className="text-surface-600 dark:text-surface-400 font-medium">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center max-w-3xl mx-auto mb-16"
                    >
                        <h2 className="text-primary font-semibold tracking-wide uppercase mb-3">Why BuildTogether?</h2>
                        <h3 className="text-3xl md:text-5xl font-display font-bold text-surface-900 dark:text-white mb-6">
                            Everything you need to ship your next big idea
                        </h3>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        className="grid md:grid-cols-3 gap-8"
                    >
                        {[
                            {
                                title: 'Find Elite Co-Founders',
                                description: 'Our smart matching algorithm connects you with perfectly complementary skillsets.',
                                icon: Users,
                                color: 'from-blue-400 to-primary'
                            },
                            {
                                title: 'Collaborate in Real-Time',
                                description: 'Built-in team chat, Kanban boards, and shared workspaces keep everyone aligned.',
                                icon: MessageSquare,
                                color: 'from-accent to-pink-500'
                            },
                            {
                                title: 'Accelerated Launch Cycle',
                                description: 'Go from prototype to production faster by dividing and conquering with your team.',
                                icon: Zap,
                                color: 'from-yellow-400 to-orange-500'
                            },
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                variants={fadeInUp}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="bg-white dark:bg-surface-800 rounded-3xl p-8 shadow-glass-sm border border-surface-100 dark:border-surface-700 relative group overflow-hidden"
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-10 rounded-bl-full group-hover:scale-150 transition-transform duration-500`} />
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} text-white flex items-center justify-center mb-6 shadow-md`}>
                                    <feature.icon className="w-7 h-7" />
                                </div>
                                <h4 className="text-2xl font-bold text-surface-900 dark:text-white mb-4">
                                    {feature.title}
                                </h4>
                                <p className="text-surface-600 dark:text-surface-400 leading-relaxed text-lg">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-24 bg-surface-100/50 dark:bg-surface-900/50 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-surface-900 dark:text-white mb-6">
                            How it works
                        </h2>
                    </motion.div>

                    <div className="relative max-w-5xl mx-auto">
                        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-transparent transform md:-translate-x-1/2 hidden md:block" />

                        {[
                            { step: '01', title: 'Create Your Profile', desc: 'Showcase your skills, Github repos, and previous projects to attract top talent.', align: 'left' },
                            { step: '02', title: 'Discover Projects', desc: 'Browse through thousands of open opportunities or post your own visionary idea.', align: 'right' },
                            { step: '03', title: 'Build & Ship', desc: 'Use our dedicated workspace to assign tasks, chat, and iterate effortlessly.', align: 'left' },
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: item.align === 'left' ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6 }}
                                className={`flex flex-col md:flex-row items-center justify-between mb-16 ${item.align === 'right' ? 'md:flex-row-reverse' : ''}`}
                            >
                                <div className="w-full md:w-5/12 p-6 bg-white dark:bg-surface-800 rounded-3xl shadow-lg border border-surface-200 dark:border-surface-700 relative z-10 hover:border-primary/50 transition-colors">
                                    <div className="text-accent font-display font-bold text-xl mb-2">Step {item.step}</div>
                                    <h4 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">{item.title}</h4>
                                    <p className="text-surface-600 dark:text-surface-400">{item.desc}</p>
                                </div>
                                <div className="hidden md:flex w-2/12 justify-center relative z-10">
                                    <div className="w-12 h-12 rounded-full bg-surface-50 dark:bg-surface-900 border-4 border-primary flex items-center justify-center shadow-glow">
                                        <div className="w-4 h-4 bg-accent rounded-full animate-pulse-slow" />
                                    </div>
                                </div>
                                <div className="w-full md:w-5/12 hidden md:block" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 relative overflow-hidden">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-br from-surface-900 to-surface-800 dark:from-primary-900 dark:to-accent-900 rounded-[3rem] p-12 md:p-20 shadow-2xl relative overflow-hidden border border-surface-700"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-[80px]" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/30 rounded-full blur-[80px]" />

                        <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 relative z-10">
                            Ready to build your next big thing?
                        </h2>
                        <p className="text-surface-300 mb-10 text-xl max-w-2xl mx-auto relative z-10">
                            Join thousands of builders creating the future, together. Your co-founder is waiting.
                        </p>
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-surface-900 font-bold rounded-2xl hover:scale-105 transition-transform shadow-lg relative z-10 text-lg"
                        >
                            Start Building Now
                            <Rocket className="w-6 h-6 text-primary" />
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
