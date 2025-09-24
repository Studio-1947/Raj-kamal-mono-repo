import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const colorClasses = {
    primary: 'text-rose-600',
    secondary: 'text-gray-500',
    white: 'text-white'
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animate = true
}) => {
  const baseClasses = 'bg-gray-200';
  const animateClass = animate ? 'animate-pulse' : '';
  
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animateClass} ${className}`}
      style={style}
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton width="75%" />
        <Skeleton width="50%" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton />
      <Skeleton width="90%" />
      <Skeleton width="60%" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
    <div className="p-4 border-b border-gray-200">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={20} />
        ))}
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={16} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface PageLoadingProps {
  message?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = 'Loading...' 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  </div>
);