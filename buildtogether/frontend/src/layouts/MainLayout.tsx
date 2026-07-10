import { Outlet } from 'react-router-dom';
import { Navbar, Footer } from '@/components/layout';

export const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
