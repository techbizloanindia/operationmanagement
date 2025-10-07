'use client';

import React, { useState } from 'react';
import AdminNavbar from './AdminNavbar';
import UserCreationTab from './UserCreationTab';
import BulkUploadTab from './BulkUploadTab';
import BranchManagementTab from './BranchManagementTab';
import SanctionedCasesTab from './SanctionedCasesTab';

type TabType = 'user-management' | 'bulk-upload' | 'branch-management' | 'sanctioned-cases';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('user-management');

  const tabs = [
    { id: 'user-management', label: 'User Management', icon: '👤' },
    { id: 'bulk-upload', label: 'Bulk Upload', icon: '📄' },
    { id: 'branch-management', label: 'Branch Management', icon: '🏢' },
    { id: 'sanctioned-cases', label: 'Sanctioned Cases', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <AdminNavbar />
      
      {/* Advanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-15 blur-3xl animate-pulse delay-75"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-10 blur-3xl animate-pulse delay-150"></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        ></div>
      </div>
      
      <div className="relative z-10 w-full max-w-7xl mx-auto my-4 sm:my-8 px-4">
        {/* Modern Header Card with Glass Morphism */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl mb-8 overflow-hidden relative">
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[1px]">
            <div className="h-full w-full rounded-3xl bg-slate-900/90 backdrop-blur-xl"></div>
          </div>
          
          <div className="relative z-10">
            <div className="bg-gradient-to-r from-slate-800/80 via-purple-900/50 to-slate-800/80 p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-2">
                        Administrative Control Center
                      </h1>
                      <p className="text-lg text-purple-200/90 font-medium">
                        Comprehensive system management and data operations
                      </p>
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex flex-wrap gap-6 mt-6">
                    <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-white/90">System Active</span>
                    </div>
                    <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <span className="text-sm text-white/90">Multi-User Access</span>
                    </div>
                  </div>
                </div>
                
                <div className="hidden lg:block">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl">
                    <svg className="w-12 h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tab Navigation with Modern Design */}
          <div className="px-8 sm:px-10 pt-6 pb-4">
            <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`group relative whitespace-nowrap px-6 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 border ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl border-transparent transform scale-105'
                      : 'text-purple-200 hover:text-white hover:bg-white/10 backdrop-blur-sm border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl filter drop-shadow-sm">{tab.icon}</span>
                    <span className="hidden sm:inline font-medium">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
                  )}
                  
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area with Enhanced Glass Morphism */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 p-[1px]">
            <div className="h-full w-full rounded-3xl bg-slate-900/60 backdrop-blur-xl"></div>
          </div>
          
          <div className="relative z-10 p-8 sm:p-10 min-h-[600px]">
            {/* Content with smooth animations */}
            <div className="animate-fadeIn">
              {activeTab === 'user-management' && <UserCreationTab />}
              {activeTab === 'bulk-upload' && <BulkUploadTab />}
              {activeTab === 'branch-management' && <BranchManagementTab />}
              {activeTab === 'sanctioned-cases' && <SanctionedCasesTab />}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(147, 51, 234, 0.6);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        /* Custom scrollbar for tab navigation */
        nav::-webkit-scrollbar {
          height: 4px;
        }
        
        nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        nav::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard; 