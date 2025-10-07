'use client';

import React, { useState } from 'react';
import { FaCheckCircle, FaTimes, FaPaperPlane, FaBuilding, FaCreditCard } from 'react-icons/fa';

interface ApplicationDetails {
  appNo: string;
  customerName: string;
}

interface QuerySuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationDetails | null;
  queries: string[];
  sentTo: string;
  onSendToTeam: (team: 'Sales' | 'Credit') => void;
}

export default function QuerySuccessModal({
  isOpen,
  onClose,
  application,
  queries,
  sentTo,
  onSendToTeam
}: QuerySuccessModalProps) {
  const [selectedTeam, setSelectedTeam] = useState<'Sales' | 'Credit' | null>(null);

  if (!isOpen || !application) return null;

  const handleSendToTeam = () => {
    if (selectedTeam) {
      onSendToTeam(selectedTeam);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FaCheckCircle className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Query Sent Successfully!</h3>
              <p className="text-green-100">Query has been submitted to {sentTo} team</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Application Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Application Number</span>
              <span className="font-bold text-gray-900">{application.appNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Customer Name</span>
              <span className="font-bold text-gray-900">{application.customerName}</span>
            </div>
          </div>

          {/* Current Team Info */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                sentTo === 'Sales' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                <span className="text-white text-lg">
                  {sentTo === 'Sales' ? '🏢' : '💳'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Successfully sent to</p>
                <p className="font-bold text-gray-900">{sentTo} Team</p>
              </div>
            </div>
          </div>

          {/* Queries Summary */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm font-bold text-blue-800 mb-2">
              {queries.length} {queries.length === 1 ? 'Query' : 'Queries'} Submitted
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {queries.slice(0, 2).map((query, index) => (
                <p key={index} className="text-sm text-blue-700 truncate">
                  • {query}
                </p>
              ))}
              {queries.length > 2 && (
                <p className="text-sm text-blue-600 italic">
                  + {queries.length - 2} more {queries.length - 2 === 1 ? 'query' : 'queries'}
                </p>
              )}
            </div>
          </div>

          {/* Additional Team Selection */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-bold text-gray-700 mb-3">
              Send this query to another team?
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setSelectedTeam('Sales')}
                disabled={sentTo === 'Sales'}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  sentTo === 'Sales'
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : selectedTeam === 'Sales'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaBuilding className={`${sentTo === 'Sales' ? 'text-gray-400' : selectedTeam === 'Sales' ? 'text-blue-600' : 'text-gray-600'}`} />
                  <div className="text-left">
                    <p className="font-bold text-sm">Sales Team</p>
                    <p className="text-xs">Documentation & Process</p>
                  </div>
                </div>
                {sentTo === 'Sales' && (
                  <p className="text-xs text-gray-500 mt-1">Already sent</p>
                )}
              </button>

              <button
                onClick={() => setSelectedTeam('Credit')}
                disabled={sentTo === 'Credit'}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  sentTo === 'Credit'
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : selectedTeam === 'Credit'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaCreditCard className={`${sentTo === 'Credit' ? 'text-gray-400' : selectedTeam === 'Credit' ? 'text-green-600' : 'text-gray-600'}`} />
                  <div className="text-left">
                    <p className="font-bold text-sm">Credit Team</p>
                    <p className="text-xs">Financial & Approval</p>
                  </div>
                </div>
                {sentTo === 'Credit' && (
                  <p className="text-xs text-gray-500 mt-1">Already sent</p>
                )}
              </button>
            </div>

            {selectedTeam && (
              <button
                onClick={handleSendToTeam}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <FaPaperPlane />
                Send Query to {selectedTeam} Team
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <FaTimes />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}