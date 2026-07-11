import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useProjects } from '@/hooks';
import { Badge } from '@/components/ui';
import { Search, SlidersHorizontal, Clock, TrendingUp, Activity, Code2, Heart, Users, Globe, BookOpen } from 'lucide-react';
import { useDebounce } from '@/hooks';

const CATEGORIES = ['All', 'Frontend', 'Backend', 'Full Stack', 'AI/ML', 'Mobile', 'Web3', 'Data Science', 'DevOps'];
const SORT_OPTIONS = [
    { label: 'Latest', value: 'latest', icon: Clock },
    { label: 'Trending', value: 'trending', icon: TrendingUp },
    { label: 'Most Active', value: 'active', icon: Activity },
];

export default function ProjectsPage() {
    const { data, isLoading } = useProjects();
    const allProjects = (data as any)?.data || data || [];

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('latest');

    const [filters, setFilters] = useState({
        beginnerFriendly: false,
        remoteOnly: false,
        openSource: false,
        savedOnly: false
    });

    // Client-side filtering and sorting for immediate UI feedback
    const filteredProjects = useMemo(() => {
        let result = [...allProjects];

        // Search
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            result = result.filter(p =>
                p.title?.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        }

        // Category
        if (selectedCategory !== 'All') {
            result = result.filter(p => p.categories?.includes(selectedCategory) || p.tech_stack?.some((t: string) => t.toLowerCase() === selectedCategory.toLowerCase()));
        }

        // Toggles
        if (filters.beginnerFriendly) result = result.filter(p => p.difficulty?.toLowerCase() === 'beginner' || p.tags?.includes('beginner'));
        if (filters.remoteOnly) result = result.filter(p => p.remote_only !== false); // Simulate default remote matching if unpopulated
        if (filters.openSource) result = result.filter(p => p.open_source === true || p.visibility === 'public');

        // Sorting (mock implementation)
        if (sortBy === 'latest') {
            result.sort((a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime());
        }

        return result;
    }, [allProjects, debouncedSearch, selectedCategory, filters, sortBy]);

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900 pb-20">
            {/* Hero Header */}
            <div className="bg-white/50 dark:bg-surface-800/30 backdrop-blur-xl border-b border-surface-200 dark:border-surface-700 pt-16 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-surface-900 dark:text-white mb-4">
                            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Projects</span>
                        </h1>
                        <p className="text-lg text-surface-600 dark:text-surface-400 max-w-2xl">
                            Discover open source initiatives, startup ideas, and hackathons looking for your exact skills.
                        </p>
                    </div>
                    <Link
                        to="/projects/create"
                        className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl hover:opacity-90 hover:scale-105 transition-all shadow-glow flex items-center gap-2"
                    >
                        + Create Project
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar Filters */}
                <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
                    {/* Search */}
                    <div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:border-primary transition-all shadow-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* Sort Options */}
                    <div>
                        <h3 className="text-sm font-bold tracking-wider text-surface-900 dark:text-surface-100 uppercase mb-3">Sort By</h3>
                        <div className="space-y-2">
                            {SORT_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setSortBy(option.value)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === option.value
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                                        }`}
                                >
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filter Toggles */}
                    <div>
                        <h3 className="text-sm font-bold tracking-wider text-surface-900 dark:text-surface-100 uppercase mb-3 flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" /> Filters
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(filters).map(([key, value]) => {
                                const labels: Record<string, string> = {
                                    beginnerFriendly: 'Beginner Friendly',
                                    remoteOnly: 'Remote Only',
                                    openSource: 'Open Source',
                                    savedOnly: 'Saved Projects'
                                };
                                return (
                                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${value ? 'bg-primary border-primary' : 'border-surface-300 dark:border-surface-600 group-hover:border-primary'}`}>
                                            {value && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className="text-surface-700 dark:text-surface-300 text-sm flex items-center gap-1">
                                            {labels[key]}
                                            {key === 'savedOnly' && <Heart className="w-3 h-3 text-accent" />}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={value}
                                            onChange={() => setFilters(prev => ({ ...prev, [key]: !prev[key as keyof typeof filters] }))}
                                        />
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0">
                    {/* Categories Horizontal Scroll */}
                    <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 pb-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === cat
                                        ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900 shadow-md'
                                        : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 hover:border-primary dark:hover:border-primary'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Projects Grid */}
                    {isLoading ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-surface-800 rounded-3xl p-6 border border-surface-200 dark:border-surface-700 h-[280px] flex flex-col">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700 animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-5 bg-surface-200 dark:bg-surface-700 rounded w-3/4 animate-pulse" />
                                            <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-1/2 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-full animate-pulse" />
                                        <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-full animate-pulse" />
                                        <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-2/3 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredProjects.length > 0 ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredProjects.map((project: any) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        key={project.id}
                                        className="bg-white dark:bg-surface-800 rounded-3xl shadow-sm hover:shadow-glass-sm border border-surface-200 dark:border-surface-700 p-6 transition-all hover:border-primary/50 group flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <Link to={`/project/${project.id}`} className="flex items-start gap-4 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                    {project.logo_url ? (
                                                        <img src={project.logo_url} alt={project.title} className="w-full h-full object-cover rounded-2xl" />
                                                    ) : (
                                                        <Code2 className="w-6 h-6 text-primary" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-lg text-surface-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                        {project.title}
                                                    </h3>
                                                    <p className="text-surface-500 dark:text-surface-400 text-sm flex items-center gap-1.5">
                                                        <Globe className="w-3.5 h-3.5" />
                                                        {project.visibility === 'private' ? 'Private Group' : 'Public Project'}
                                                    </p>
                                                </div>
                                            </Link>
                                            <button className="text-surface-400 hover:text-accent transition-colors p-2 -mr-2 -mt-2">
                                                <Heart className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <p className="text-surface-600 dark:text-surface-300 text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">
                                            {project.description}
                                        </p>

                                        {project.tech_stack && project.tech_stack.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {project.tech_stack.slice(0, 4).map((tech: string) => (
                                                    <Badge key={tech} variant="default">{tech}</Badge>
                                                ))}
                                                {project.tech_stack.length > 4 && (
                                                    <Badge variant="default">+{project.tech_stack.length - 4}</Badge>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-4 border-t border-surface-100 dark:border-surface-700 mt-auto">
                                            <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 text-sm font-medium">
                                                <Users className="w-4 h-4" />
                                                <span>{project.members_count || 1} Members</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm font-medium text-success">
                                                <BookOpen className="w-4 h-4" />
                                                {project.difficulty || 'Open'}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-24 bg-white/50 dark:bg-surface-800/30 rounded-3xl border border-surface-200 border-dashed dark:border-surface-700"
                        >
                            <div className="w-20 h-20 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="w-10 h-10 text-surface-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">No projects found</h3>
                            <p className="text-surface-500 dark:text-surface-400 max-w-md mx-auto mb-8">
                                Try adjusting your filters or search query to find what you're looking for.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('All');
                                    setFilters({ beginnerFriendly: false, remoteOnly: false, openSource: false, savedOnly: false });
                                }}
                                className="px-6 py-3 bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-semibold rounded-xl hover:opacity-90 transition-opacity"
                            >
                                Clear all filters
                            </button>
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
}
