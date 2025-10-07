'use client';

import React, { useState } from 'react';

interface CustomQueryModalProps {
  isOpen: boolean;
  onSubmit: (customMessage: string) => void;
  onCancel: () => void;
  defaultTeam: 'Sales' | 'Credit';
  onTeamChange: (team: 'Sales' | 'Credit') => void;
}

export default function CustomQueryModal({
  isOpen,
  onSubmit,
  onCancel,
  defaultTeam,
  onTeamChange
}: CustomQueryModalProps) {
  const [customMessage, setCustomMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (customMessage.trim()) {
      onSubmit(customMessage.trim());
      setCustomMessage('');
    }
  };

  const handleCancel = () => {
    setCustomMessage('');
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-4">
          <h3 className="text-lg font-bold text-black mb-4">Write Custom Query</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Send to Team:</label>
              <select
                value={defaultTeam}
                onChange={(e) => onTeamChange(e.target.value as 'Sales' | 'Credit')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-black font-medium bg-white"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '600' }}
              >
                <option value="Sales">🏢 Sales Team</option>
                <option value="Credit">💳 Credit Team</option>
              </select>
            </div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your custom query..."
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-black font-medium bg-white"
              style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '600' }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!customMessage.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Query
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
