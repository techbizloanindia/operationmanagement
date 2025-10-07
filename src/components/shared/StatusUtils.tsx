'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'text' | 'dot';
}

export const getStatusColor = (status: string) => {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
    case 'approved':
      return {
        bg: 'bg-green-200',
        text: 'text-green-900',
        border: 'border-green-400',
        dot: 'bg-green-600',
        hover: 'hover:bg-green-300'
      };
    case 'otc':
      return {
        bg: 'bg-blue-200',
        text: 'text-blue-900',
        border: 'border-blue-400',
        dot: 'bg-blue-600',
        hover: 'hover:bg-blue-300'
      };
    case 'deferred':
    case 'deferral':
      return {
        bg: 'bg-orange-200',
        text: 'text-orange-900',
        border: 'border-orange-400',
        dot: 'bg-orange-600',
        hover: 'hover:bg-orange-300'
      };
    case 'pending':
      return {
        bg: 'bg-yellow-200',
        text: 'text-yellow-900',
        border: 'border-yellow-400',
        dot: 'bg-yellow-600',
        hover: 'hover:bg-yellow-300'
      };
    case 'resolved':
      return {
        bg: 'bg-gray-200',
        text: 'text-gray-900',
        border: 'border-gray-400',
        dot: 'bg-gray-600',
        hover: 'hover:bg-gray-300'
      };
    case 'waived':
    case 'waiver':
      return {
        bg: 'bg-purple-200',
        text: 'text-purple-900',
        border: 'border-purple-400',
        dot: 'bg-purple-600',
        hover: 'hover:bg-purple-300'
      };
    case 'rejected':
      return {
        bg: 'bg-red-200',
        text: 'text-red-900',
        border: 'border-red-400',
        dot: 'bg-red-600',
        hover: 'hover:bg-red-300'
      };
    case 'active':
      return {
        bg: 'bg-green-200',
        text: 'text-green-900',
        border: 'border-green-400',
        dot: 'bg-green-600',
        hover: 'hover:bg-green-300'
      };
    case 'closed':
      return {
        bg: 'bg-gray-200',
        text: 'text-gray-900',
        border: 'border-gray-400',
        dot: 'bg-gray-600',
        hover: 'hover:bg-gray-300'
      };
    default:
      return {
        bg: 'bg-gray-200',
        text: 'text-gray-900',
        border: 'border-gray-400',
        dot: 'bg-gray-600',
        hover: 'hover:bg-gray-300'
      };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  variant = 'badge' 
}) => {
  const colors = getStatusColor(status);
  const displayText = status.charAt(0).toUpperCase() + status.slice(1);

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 font-semibold',
    md: 'text-sm px-4 py-2 font-semibold',
    lg: 'text-base px-5 py-2.5 font-bold'
  };

  if (variant === 'text') {
    return (
      <span className={`font-bold ${colors.text}`}>
        {displayText}
      </span>
    );
  }

  if (variant === 'dot') {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${colors.dot} shadow-sm`}></div>
        <span className={`font-bold ${colors.text}`}>
          {displayText}
        </span>
      </div>
    );
  }

  // Default badge variant
  return (
    <span className={`
      inline-flex items-center rounded-full shadow-sm
      ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}
      border transition-colors duration-200 ${colors.hover}
    `}>
      {displayText}
    </span>
  );
};

export const StatusText: React.FC<{ status: string; className?: string }> = ({ 
  status, 
  className = '' 
}) => {
  const colors = getStatusColor(status);
  const displayText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`font-bold ${colors.text} ${className}`}>
      {displayText}
    </span>
  );
};

// Enhanced button variant for action buttons
export const StatusButton: React.FC<{
  status: string;
  onClick: () => void;
  className?: string;
}> = ({ status, onClick, className = '' }) => {
  const colors = getStatusColor(status);
  const displayText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-bold rounded-full border shadow-sm
        ${colors.bg} ${colors.text} ${colors.border} ${colors.hover}
        transition-all duration-200 transform hover:scale-105 active:scale-95
        ${className}
      `}
    >
      {displayText}
    </button>
  );
}; 

// Function to get user-friendly status names
export const getStatusDisplayName = (status: string, assignedTo?: string): string => {
  const normalizedStatus = status.toLowerCase();
  
  // Available people for OTC and Deferral actions - updated with titles from screenshot  
  const availablePeople = [
    'Abhishek Mishra',
    'Aarti Pujara - Credit Manager', 
    'Sumit Khari - Sales Manager',
    'Rahul Jain',
    'Vikram Diwan'
  ];
  
  const isAuthorizedPerson = (personName: string): boolean => {
    // Check both exact match and partial match (for names with titles)
    return availablePeople.some(person => 
      person === personName || 
      person.startsWith(personName) || 
      personName.includes(person.split(' - ')[0])
    );
  };
  
  switch (normalizedStatus) {
    case 'approved':
      return 'Approved';
    case 'deferred':
      if (assignedTo && isAuthorizedPerson(assignedTo)) {
        return `Deferred to ${assignedTo}`;
      }
      return 'Not Specified';
    case 'otc':
      if (assignedTo && isAuthorizedPerson(assignedTo)) {
        return `OTC to ${assignedTo}`;
      }
      return 'Not Specified';
    case 'pending':
      return 'Pending';
    case 'resolved':
      return 'Resolved';
    case 'rejected':
      return 'Rejected';
    case 'active':
      return 'Active';
    case 'closed':
      return 'Closed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}; 