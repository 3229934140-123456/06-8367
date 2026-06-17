import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  Sprout,
  Carrot,
  DollarSign,
  TrendingUp,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '总览' },
  { path: '/fields', icon: MapPin, label: '地块管理' },
  { path: '/seasons', icon: Calendar, label: '种植季' },
  { path: '/operations', icon: Sprout, label: '农事操作' },
  { path: '/harvest', icon: Carrot, label: '收成管理' },
  { path: '/costs', icon: DollarSign, label: '成本管理' },
  { path: '/analytics', icon: TrendingUp, label: '收益分析' },
  { path: '/weather', icon: Cloud, label: '气象信息' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen bg-farm-800 text-white flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-farm-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-farm-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg whitespace-nowrap">农场种植管理系统</span>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-farm-600 text-white shadow-lg shadow-farm-900/30'
                      : 'text-farm-100 hover:bg-farm-700 hover:text-white',
                    collapsed && 'justify-center'
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 border-t border-farm-700 flex items-center justify-center hover:bg-farm-700 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>
    </aside>
  );
}
