'use client';

import React from 'react';
import { FaBuilding, FaUser, FaEnvelope } from 'react-icons/fa';

interface ApplicationData {
  appNo: string;
  customerName: string;
  branchName: string;
  appliedDate: string;
  loanAmount: string;
  sanctionedAmount: string;
  status: string;
  salesExec: string;
  employeeId: string;
  priority?: string;
  loanNo?: string;
  loginFee?: string;
  loanType?: string;
}

interface ApplicationDetailsProps {
  application: ApplicationData;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'sanctioned':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'under processing':
    case 'in progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function ApplicationDetails({ application }: ApplicationDetailsProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <FaBuilding className="text-white text-sm" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Application Details</h3>
            <p className="text-indigo-100 text-xs">App.No: {application.appNo}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Customer Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 pb-3 border-b border-gray-200">
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-gray-900">{application.customerName}</h4>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                {application.status}
              </span>
              {application.priority && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                  application.priority === 'high' ? 'bg-red-100 text-red-800' :
                  application.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {application.priority} Priority
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">Applied on {application.appliedDate}</p>
          </div>
          
          <div className="mt-4 lg:mt-0 text-left lg:text-right">
            <div className="space-y-1">
              <div>
                <p className="text-xs text-gray-600">Loan Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  {application.loanAmount !== 'Not specified' ? `₹${application.loanAmount}` : application.loanAmount}
                </p>
              </div>
              {application.sanctionedAmount && application.sanctionedAmount !== 'Same as loan amount' && (
                <div>
                  <p className="text-xs text-gray-600">Sanctioned Amount</p>
                  <p className="text-base font-semibold text-green-600">₹{application.sanctionedAmount}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Essential Information Only */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Loan Information - Compact */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h5 className="text-sm font-semibold text-blue-900">💰 Loan Details</h5>
            </div>
            <div className="space-y-2">
              <div className="bg-white rounded-md p-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-blue-700">Requested Amount</span>
                  <span className="text-sm font-semibold text-blue-900">
                    {application.loanAmount !== 'Not specified' ? `₹${application.loanAmount}` : application.loanAmount}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-md p-3 border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-green-700">Sanctioned Amount</span>
                  <span className="text-sm font-semibold text-green-700">
                    {application.sanctionedAmount !== 'Same as loan amount' ? `₹${application.sanctionedAmount}` : '₹' + application.loanAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contact Information - Compact */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center">
                <FaEnvelope className="text-white text-xs" />
              </div>
              <h5 className="text-sm font-semibold text-purple-900">📞 Contact & Branch</h5>
            </div>
            <div className="space-y-2">
              <div className="bg-white rounded-md p-3 border border-purple-200">
                <div className="flex items-center gap-2">
                  <FaUser className="text-purple-500 text-xs" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-purple-700">Sales Executive</p>
                    <p className="text-sm font-medium text-purple-900 truncate">{application.salesExec}</p>
                    {application.employeeId && (
                      <p className="text-xs text-purple-600">ID: {application.employeeId}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-md p-3 border border-purple-200">
                <div className="flex items-center gap-2">
                  <FaBuilding className="text-purple-500 text-xs" />
                  <div>
                    <p className="text-xs font-medium text-purple-700">Branch</p>
                    <p className="text-sm font-medium text-purple-900">{application.branchName}</p>
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
