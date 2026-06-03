import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TabItem {
  path: string;
  label: string;
  color: string;
}

const TABS: TabItem[] = [
  { path: '/', label: 'Total Sales', color: '#4F46E5' },
  { path: '/offline-sheet-sales', label: 'Delhi Offline', color: '#3B82F6' },
  { path: '/mumbai-offline-sales', label: 'Mumbai Offline', color: '#10B981' },
  { path: '/patna-offline-sales', label: 'Patna Offline', color: '#8B5CF6' },
  { path: '/online-offline-sales', label: 'Online - Website', color: '#F97316' },
  { path: '/bookfair-offline-sales', label: 'BookFair Offline', color: '#EC4899' },
  { path: '/lokbharti-offline-sales', label: 'Lokbharti - Allahabad', color: '#0D9488' },
];

export default function SalesDashboardTabs() {
  const location = useLocation();

  return (
    <div className="w-full mb-6">
      <div className="flex items-center gap-2 p-1.5 bg-white/95 backdrop-blur border border-gray-200/50 rounded-2xl shadow-sm overflow-x-auto custom-scrollbar flex-nowrap whitespace-nowrap">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 whitespace-nowrap ${
                isActive
                  ? 'border-2 shadow-sm'
                  : 'border-2 border-transparent text-gray-500 hover:bg-gray-100/50 hover:text-gray-800'
              }`}
              style={
                isActive
                  ? {
                      borderColor: tab.color,
                      color: tab.color,
                      backgroundColor: `${tab.color}0E`, // ~9% opacity for premium tint
                    }
                  : {}
              }
            >
              <span
                className="h-2 w-2 rounded-full shrink-0 transition-transform duration-300"
                style={{
                  backgroundColor: tab.color,
                  transform: isActive ? 'scale(1.2)' : 'scale(1)',
                }}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
