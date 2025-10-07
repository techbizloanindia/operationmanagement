'use client';

import React from 'react';
import { 
  MessageSquare,
  CheckCircle,
  FileText,
  Settings,
  Badge,
  List
} from 'lucide-react';
import { SalesTabType } from './SalesDashboard';

interface SalesSidebarProps {
  activeTab: SalesTabType;
  onTabChange: (tab: SalesTabType) => void;
  newQueriesCount: number;
}

export default function SalesSidebar({ 
  activeTab, 
  onTabChange, 
  newQueriesCount 
}: SalesSidebarProps) {
  const tabs = [
    {
      id: 'queries-raised' as SalesTabType,
      label: 'Query Raised',
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Incoming Queries',
      badge: newQueriesCount > 0 ? newQueriesCount : null
    },
    {
      id: 'queries-resolved' as SalesTabType,
      label: 'Query Resolved',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Resolved Cases'
    }
  ];

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-80">
        <div className="flex-1 min-h-0 border-r border-gray-200 bg-gradient-to-b from-white to-blue-50 shadow-xl">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-8">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
                  <span className="text-white font-bold text-lg">📊</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Sales Team</h2>
                  <p className="text-sm text-gray-600">Dashboard Navigation</p>
                </div>
              </div>
            </div>
            
            <nav className="mt-2 flex-1 px-4 space-y-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`group flex items-center w-full px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                      isActive
                        ? `${tab.bgColor} ${tab.color} shadow-lg border-2 border-blue-200`
                        : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-md bg-gray-50/50'
                    }`}
                  >
                    <Icon
                      className={`flex-shrink-0 mr-4 h-6 w-6 transition-all duration-200 ${
                        isActive ? tab.color : 'text-gray-500 group-hover:text-gray-700'
                      }`}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate">{tab.label}</span>
                        {tab.badge && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm animate-pulse">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        isActive ? 'text-current opacity-80' : 'text-gray-500'
                      }`}>
                        {tab.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
            
            {/* Team Info */}
            <div className="flex-shrink-0 px-4 mt-6 pt-4 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Badge className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">
                      Sales Team
                    </p>
                    <p className="text-xs text-blue-700">
                      Query Management System
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}