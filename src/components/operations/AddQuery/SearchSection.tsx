'use client';

import React from 'react';
import { FaSearch, FaSpinner, FaExclamationCircle } from 'react-icons/fa';

interface SearchSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onSearch: (e: React.FormEvent) => void;
  isSearching: boolean;
  searchError: string | null;
  appNo?: string;
}

export default function SearchSection({
  searchTerm,
  setSearchTerm,
  onSearch,
  isSearching,
  searchError,
  appNo
}: SearchSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
          <FaSearch className="text-blue-600 text-xs" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Search Application</h2>
          <p className="text-gray-600 text-xs">Enter application number to find cases</p>
        </div>
        {appNo && (
          <span className="ml-auto bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            Auto-loaded: {appNo}
          </span>
        )}
      </div>

      <form onSubmit={onSearch} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Enter App.No (e.g., GGNP001, APP123)"
            className="w-full h-10 pl-8 pr-3 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
        </div>
        
        <button
          type="submit"
          disabled={isSearching || !searchTerm.trim()}
          className="w-full h-9 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isSearching ? (
            <>
              <FaSpinner className="animate-spin text-xs" />
              Searching...
            </>
          ) : (
            <>
              <FaSearch className="text-xs" />
              Search Application
            </>
          )}
        </button>
      </form>
      
      {searchError && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0 text-xs" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-1">Search Failed</h4>
              <p className="text-red-700 text-xs whitespace-pre-wrap">{searchError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
