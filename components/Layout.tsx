
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  Warehouse, 
  Utensils, 
  FileText, 
  Settings as SettingsIcon,
  Menu, 
  X,
  Bell,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const NavItem: React.FC<{ to: string, icon: any, label: string, active: boolean }> = ({ to, icon: Icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { config } = useApp();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tablou de bord', roles: ['ADMIN'] },
    { to: '/students', icon: Users, label: 'Elevi și Părinți', roles: ['ADMIN', 'EDUCATOR'] },
    { to: '/attendance', icon: CalendarCheck, label: 'Prezență', roles: ['ADMIN', 'EDUCATOR'] },
    { to: '/payments', icon: CreditCard, label: 'Plăți și Facturare', roles: ['ADMIN'] },
    { to: '/inventory', icon: Warehouse, label: 'Magazie Alimente', roles: ['ADMIN'] },
    { to: '/menu', icon: Utensils, label: 'Meniu Zilnic', roles: ['ADMIN', 'ASISTENT'] },
    { to: '/reports', icon: FileText, label: 'Rapoarte', roles: ['ADMIN', 'EDUCATOR'] },
    { to: '/settings', icon: SettingsIcon, label: 'Setări', roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {config.institutionName[0]}
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800 truncate max-w-[140px]">{config.institutionName}</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {filteredMenuItems.map((item) => (
              <NavItem 
                key={item.to} 
                to={item.to} 
                icon={item.icon} 
                label={item.label} 
                active={location.pathname === item.to} 
              />
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs uppercase">
                {user?.name.substring(0, 2)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-slate-700 truncate">{user?.name}</span>
                <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{user?.role}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Deconectare
            </button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800">
              {menuItems.find(i => i.to === location.pathname)?.label || 'Aplicație'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
               <span>{new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
