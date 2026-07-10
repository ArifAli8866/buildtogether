import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input, Textarea } from '@/components/ui';
import { api } from '@/config/api';

export default function CreateProjectPage() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [techStack, setTechStack] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const techArr = techStack.split(',').map((t) => t.trim()).filter(Boolean);
            const { data } = await api.post('/projects', { title, description, tech_stack: techArr });
            navigate(`/project/${data.data?.id || ''}`);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create project.');
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-8"
            >
                <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white mb-6">
                    Create New Project
                </h1>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <Input label="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Awesome Project" required />
                    <Textarea
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your project and what kind of collaborators you're looking for..."
                        rows={5}
                        required
                    />
                    <Input
                        label="Tech Stack (comma separated)"
                        value={techStack}
                        onChange={(e) => setTechStack(e.target.value)}
                        placeholder="React, Node.js, PostgreSQL"
                    />

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={isLoading}>Create Project</Button>
                        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
