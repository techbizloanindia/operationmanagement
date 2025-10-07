'use client';

import React from 'react';
import { FaChartBar, FaQuestionCircle, FaClock, FaExclamationTriangle, FaPlus, FaCheckCircle, FaFileAlt } from 'react-icons/fa';
import { TabType } from './OperationsDashboard';

interface SidebarProps {
  activeTab: TabType;
  onTabChangeAction: (tab: TabType) => void;
}

export default function OperationsSidebar({ activeTab, onTabChangeAction }: SidebarProps) {
  const menuItems: Array<{
    id: TabType;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
  }> = [
    {
      id: 'dashboard',
      name: 'Dashboard Overview',
      icon: FaChartBar,
      active: true
    },
    {
      id: 'query-raised',
      name: 'Queries Raised',
      icon: FaQuestionCircle,
      active: false
    },
    {
      id: 'sanctioned-cases',
      name: 'Sanctioned Cases',
      icon: FaExclamationTriangle,
      active: false
    },
    {
      id: 'add-query',
      name: 'Add Query',
      icon: FaPlus,
      active: false
    },

    {
      id: 'query-resolved',
      name: 'Queries Resolved',
      icon: FaCheckCircle,
      active: false
    }
  ];

  return (
    <div className="w-64 bg-slate-800 text-white min-h-screen hidden lg:block">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChangeAction(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-green-600 text-white font-bold border-2 border-green-400'
                    : 'text-gray-100 hover:bg-slate-700 hover:text-white font-medium'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
