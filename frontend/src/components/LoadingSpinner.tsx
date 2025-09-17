import React from 'react';
import { RajkamalEmblem } from '../shared/RajkamalLogo';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12', 
  lg: 'h-16 w-16',
  xl: 'h-24 w-24'
};

export function LoadingSpinner({ 
  size = 'lg', 
  className = '', 
  message = 'Loading...' 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Animated ring using Rajkamal brand colors */}
        <div className="absolute inset-0 rounded-full border-2 border-rose-100 animate-spin border-t-rose-600"></div>
        
        {/* Your Rajkamal logo in center */}
        <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white shadow-sm">
          <RajkamalEmblem 
            className="text-rose-600" 
            width={size === 'sm' ? 20 : size === 'md' ? 32 : size === 'lg' ? 48 : 64}
            height={size === 'sm' ? 20 : size === 'md' ? 32 : size === 'lg' ? 48 : 64}
          />
        </div>
      </div>
      
      {message && (
        <p className="text-sm text-gray-600 animate-pulse font-medium">{message}</p>
      )}
    </div>
  );
}

export function FullPageLoader({ message = 'Loading your workspace...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" message={message} />
        <div className="mt-6">
          <div className="text-rose-600 font-semibold text-lg">Rajkamal</div>
          <div className="text-gray-500 text-sm">Powering your business intelligence</div>
        </div>
      </div>
    </div>
  );
}