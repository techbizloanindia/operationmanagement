'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="backdrop-blur-xl bg-slate-900/80 border-b border-purple-500/20 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="relative h-12 w-40 sm:h-14 sm:w-44 p-3 bg-gradient-to-r from-white/95 to-purple-50/95 rounded-xl backdrop-blur-sm border border-white/40 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
                <Image
                  src="/logo.png"
                  alt="Bizloan India - Admin Dashboard"
                  fill
                  sizes="(max-width: 640px) 160px, 176px"
                  style={{ 
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                  priority
                  className="filter drop-shadow-md"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* System Status Indicator */}
            <div className="hidden md:flex items-center space-x-3 px-4 py-2 rounded-xl backdrop-blur-sm bg-green-500/20 border border-green-400/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-300">System Online</span>
            </div>
            
            {/* User Info Card */}
            <div className="flex items-center space-x-4 px-5 py-3 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-white">
                  {user?.name || user?.employeeId}
                </div>
                <div className="text-xs text-purple-200">Administrator</div>
              </div>
            </div>
            
            {/* Enhanced Logout Button */}
            <button 
              className="group flex items-center space-x-3 px-5 py-3 rounded-xl backdrop-blur-sm bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/30 text-red-200 hover:text-white hover:from-red-500/40 hover:to-pink-500/40 hover:border-red-300/50 focus:outline-none transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/20"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline text-sm font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar; 