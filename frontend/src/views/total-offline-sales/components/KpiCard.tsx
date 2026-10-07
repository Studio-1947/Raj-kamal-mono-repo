import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, badge }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-md hover:border-gray-300/80 flex flex-col justify-between h-full">
      <div className="absolute -top-2 -right-2 p-4 opacity-[0.04] text-gray-900 pointer-events-none transition-transform group-hover:scale-110 duration-500">
        {icon}
      </div>
      <div className="relative z-10 flex-1">
        <p className="text-[10px] 2xl:text-[11px] font-medium text-gray-500 uppercase tracking-wider line-clamp-1 mb-1" title={title}>
          {title}
        </p>
        <p className="text-xl 2xl:text-2xl font-normal text-gray-900 tracking-tight truncate" title={value}>
          {value}
        </p>
      </div>
      {badge && (
        <div className="relative z-10 mt-3 pt-3 border-t border-gray-100">
          <div className="line-clamp-2">
            {badge}
          </div>
        </div>
      )}
    </div>
  );
};
