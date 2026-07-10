import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context';
import { Button, Input, Textarea } from '@/components/ui';
import { api } from '@/config/api';

export default function EditProfilePage() {
    const navigate = useNavigate();
    const { profile, refreshProfile } = useAuth();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [website, setWebsite] = useState(profile?.website || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await api.patch('/users/me', { full_name: fullName, bio, website });
            await refreshProfile();
            navigate(-1);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-6">
                <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white mb-6">
                    Edit Profile
                </h1>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                    <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the community about yourself..." rows={4} />
                    <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" />

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" loading={isLoading}>Save Changes</Button>
                        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
