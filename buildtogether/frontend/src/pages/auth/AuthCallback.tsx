import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { LoadingScreen } from '@/components/ui';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/login', { replace: true });
            }
        });
    }, [navigate]);

    return <LoadingScreen />;
}
