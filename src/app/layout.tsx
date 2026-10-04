import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { getCurrentUser } from '@/lib/queries/profile';

export const metadata: Metadata = {
  title: 'Build Together — Turn Ideas Into Real Products',
  description:
    'Collaborative developer platform for discovering projects, finding contributors, forming teams, and building products together.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile } = await getCurrentUser();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-app-bg text-content-primary antialiased flex flex-col">
        <Navbar user={user} profile={profile} />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
