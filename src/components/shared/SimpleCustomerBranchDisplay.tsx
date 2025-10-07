'use client';

import React from 'react';
import { FaUser, FaBuilding } from 'react-icons/fa';

interface SimpleCustomerBranchDisplayProps {
  customerName: string;
  branch: string;
  branchCode?: string;
  appNo: string;
  className?: string;
  compact?: boolean;
}

const SimpleCustomerBranchDisplay: React.FC<SimpleCustomerBranchDisplayProps> = ({
  customerName,
  branch,
  branchCode,
  appNo,
  className = '',
  compact = false
}) => {
  const displayCustomerName = customerName || appNo;
  const displayBranch = branch || '';
  const displayBranchCode = branchCode && branchCode !== branch ? ` (${branchCode})` : '';

  if (compact) {
    return (
      <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg p-2`}>
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex items-center space-x-1">
            <FaUser className="h-3 w-3 text-gray-500" />
            <span className="text-gray-700">{displayCustomerName}</span>
          </div>
          {displayBranch && (
            <>
              <span className="text-gray-400">|</span>
              <div className="flex items-center space-x-1">
                <FaBuilding className="h-3 w-3 text-gray-500" />
                <span className="text-gray-700">{displayBranch}{displayBranchCode}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg p-4`}>
      {/* Application Number */}
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-600">Application:</span>
        <span className="ml-2 text-lg font-bold text-gray-800">{appNo}</span>
      </div>

      {/* Customer Information */}
      <div className="mb-3 p-3 rounded-lg bg-white border border-gray-200">
        <div className="flex items-center space-x-2 mb-1">
          <FaUser className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Customer Name:</span>
        </div>
        <div className="text-lg font-bold text-gray-800">{displayCustomerName}</div>
      </div>

      {/* Branch Information */}
      {displayBranch && (
        <div className="p-3 rounded-lg bg-white border border-gray-200">
          <div className="flex items-center space-x-2 mb-1">
            <FaBuilding className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Branch:</span>
          </div>
          <div className="text-lg font-bold text-gray-800">{displayBranch}{displayBranchCode}</div>
        </div>
      )}
    </div>
  );
};

export default SimpleCustomerBranchDisplay;