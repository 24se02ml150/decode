'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth';
import { LayoutDashboard, Users, Calendar, MapPin, QrCode, Settings, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events & Rounds', icon: Calendar },
  { href: '/admin/teams', label: 'Teams', icon: Users },
  { href: '/admin/locations', label: 'Locations', icon: MapPin },
  { href: '/admin/qr', label: 'QR Codes', icon: QrCode },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const { user, loading, logout } = useRequireAuth('admin');
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <div className="animate-pulse-soft text-center">
          <div className="w-10 h-10 rounded-full bg-accent mx-auto mb-3"></div>
          <p className="text-text-secondary text-sm">Loading admin...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-bg flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-dvh w-64 bg-sidebar text-sidebar-text z-50 transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Decode</h1>
            <p className="text-xs text-sidebar-text/70 uppercase tracking-widest mt-1">Admin Panel</p>
          </div>
          <button className="lg:hidden text-sidebar-text hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-accent text-white' 
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-hover">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-hover flex items-center justify-center flex-shrink-0 text-white font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-text/70 truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-text hover:bg-error/10 hover:text-error transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-bg-card border-b border-border h-16 flex items-center px-4 sticky top-0 z-30">
          <button 
            className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary hover:text-text-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-text-primary ml-2">Admin</h1>
        </header>
        
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
