import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, badge }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="absolute top-0 right-0 p-6 opacity-10">
        {icon}
      </div>
      <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      <p className="mt-2 text-xl sm:text-2xl xl:text-3xl font-black text-gray-900 tracking-tight truncate" title={value}>
        {value}
      </p>
      {badge}
    </div>
  );
};
