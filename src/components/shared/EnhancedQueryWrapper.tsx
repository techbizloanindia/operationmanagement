'use client';

import React from 'react';

interface EnhancedQueryWrapperProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  actionButtons?: React.ReactNode;
}

export default function EnhancedQueryWrapper({
  title,
  subtitle,
  icon,
  children,
  isLoading = false,
  error = null,
  actionButtons
}: EnhancedQueryWrapperProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-300 rounded-md w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-bold text-red-800">Error Loading Content</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-red-700 font-medium mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-responsive-lg font-bold text-gray-900 truncate dashboard-text">
                {title}
              </h3>
              {subtitle && (
                <p className="text-responsive-md text-gray-600 truncate dashboard-subtitle-text mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actionButtons && (
            <div className="flex-shrink-0 ml-4">
              {actionButtons}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <div className="force-visible-text">
          {children}
        </div>
      </div>
    </div>
  );
}