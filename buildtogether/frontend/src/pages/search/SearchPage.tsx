import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDebounce } from '@/hooks';
import { Input } from '@/components/ui';
import { api } from '@/config/api';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const debouncedQuery = useDebounce(query, 400);

    // Simple search on query change
    const handleSearch = async (q: string) => {
        if (!q.trim()) { setResults([]); return; }
        setIsLoading(true);
        try {
            const { data } = await api.get(`/projects?search=${encodeURIComponent(q)}`);
            setResults(data?.data || []);
        } catch {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Effect-like via hook result
    if (debouncedQuery !== query) {
        handleSearch(debouncedQuery);
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-4">Search</h1>
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        handleSearch(e.target.value);
                    }}
                    placeholder="Search projects, people, skills..."
                    className="text-lg"
                />
            </div>

            {isLoading && (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {!isLoading && query && results.length === 0 && (
                <div className="text-center py-16 text-surface-400">
                    No results for "{query}"
                </div>
            )}

            {!isLoading && results.length > 0 && (
                <div className="space-y-3">
                    {results.map((item: any) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-surface-800 rounded-xl border border-surface-100 dark:border-surface-700 p-4 hover:border-primary transition-colors"
                        >
                            <Link to={`/project/${item.id}`}>
                                <h3 className="font-semibold text-surface-900 dark:text-white mb-1">{item.title}</h3>
                                <p className="text-surface-500 dark:text-surface-400 text-sm line-clamp-2">{item.description}</p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}

            {!query && (
                <div className="text-center py-16 text-surface-400">
                    Start typing to search
                </div>
            )}
        </div>
    );
}
