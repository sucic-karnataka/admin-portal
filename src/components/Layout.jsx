import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import {
  Shield, LayoutDashboard, Image, LogOut,
} from 'lucide-react';

const NAV = [
  { to: '/media',  label: 'Media',  icon: Image,  roles: ['owner', 'moderator', 'section_editor'] },
  { to: '/admins', label: 'Admins', icon: Shield,  roles: ['owner'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const role = user?.role || 'moderator';

  const visibleNav = NAV.filter(({ roles }) => roles.includes(role));

  return (
    <div className="min-h-dvh bg-gray-50 md:flex md:h-screen">
      <aside className="sticky top-0 z-20 bg-white border-b md:static md:flex md:h-screen md:w-56 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 p-3 md:p-4">
          <div className="flex min-w-0 items-center gap-2">
            <LayoutDashboard size={20} className="shrink-0" />
            <span className="truncate text-sm font-semibold">Admin Portal</span>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.avatar} alt={user?.login} />
              <AvatarFallback>{user?.login?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon-sm" onClick={logout} title="Sign out">
              <LogOut size={14} />
            </Button>
          </div>
        </div>
        <Separator />
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col md:space-y-0.5 md:overflow-visible">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-100 font-semibold text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <Separator className="hidden md:block" />
        <div className="hidden space-y-1 p-3 md:block">
          {user?.section && (
            <p className="text-xs text-muted-foreground px-1">
              Section: <span className="font-medium text-gray-700">{user.section}</span>
            </p>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.avatar} alt={user?.login} />
              <AvatarFallback>{user?.login?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 flex-1 truncate">{user?.login}</span>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
