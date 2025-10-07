'use client';

import React from 'react';
import { TabType } from './OperationsDashboard';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { 
      id: 'query-raised' as TabType, 
      name: 'Query Raised', 
      description: 'Pending queries requiring attention'
    },
    { 
      id: 'query-resolved' as TabType, 
      name: 'Query Resolved', 
      description: 'Completed and resolved queries'
    },
    { 
      id: 'sanctioned-cases' as TabType, 
      name: 'Sanctioned Cases', 
      description: 'Approved loan applications'
    },
    { 
      id: 'add-query' as TabType, 
      name: 'Add Query', 
      description: 'Raise new queries'
    },
    { 
      id: 'reports' as TabType, 
      name: 'Reports', 
      description: 'Query status reports and analytics'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      <nav className="flex space-x-1" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 text-center py-3 px-4 text-sm font-bold rounded-md transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-700'
                : 'text-gray-800 hover:text-gray-900 hover:bg-blue-50 border-2 border-transparent'
              }
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            title={tab.description}
          >
            {tab.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
