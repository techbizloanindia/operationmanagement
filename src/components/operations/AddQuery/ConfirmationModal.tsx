'use client';

import React from 'react';
import { FaPaperPlane, FaCheckCircle, FaTimes, FaSpinner, FaExclamationCircle } from 'react-icons/fa';

interface ApplicationDetails {
  appNo: string;
  customerName: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  application: ApplicationDetails | null;
  queries: string[];
  sendTo: string;
}

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  isSubmitting,
  application,
  queries,
  sendTo
}: ConfirmationModalProps) {
  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FaPaperPlane className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Confirm Query Submission</h3>
              <p className="text-blue-100">Review before sending to team</p>
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

          {/* Team Info */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                sendTo === 'Sales' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                <span className="text-white text-lg">
                  {sendTo === 'Sales' ? '🏢' : '💳'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sending to</p>
                <p className="font-bold text-gray-900">{sendTo} Team</p>
              </div>
            </div>
          </div>

          {/* Queries List */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-700">Queries to be raised ({queries.length}):</p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {queries.map((query, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-800 font-medium">{query}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FaExclamationCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Important Notice</p>
                <p className="text-sm text-amber-700 mt-1">
                  This query will be sent to the {sendTo} team for review.
                  The team will be notified immediately and the query will appear in the Queries Raised section.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Sending to Team...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Yes, Send Query to Team
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTimes />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
