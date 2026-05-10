import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import {
  Shield, LayoutDashboard, Image,
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <LayoutDashboard size={20} />
          <span className="font-semibold text-sm">Admin Portal</span>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-0.5">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
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
        <Separator />
        <div className="p-3 space-y-1">
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
