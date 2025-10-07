'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FaChevronDown, FaSignOutAlt } from 'react-icons/fa';
import NotificationCenter from '@/components/shared/NotificationCenter';

// Custom Logout Confirmation Modal
interface LogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <FaSignOutAlt className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
            Logout Confirmation
          </h3>
          <p className="text-center text-gray-600 mb-6">
            Are you sure you want to logout? You will need to sign in again to access the dashboard.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Branch {
  id: string;
  branchCode: string;
  branchName: string;
  city: string;
  state: string;
  isActive: boolean;
}

export default function OperationsNavbar() {
  const { user, logout } = useAuth();
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Fetch branches on component mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBranchDropdown && !(event.target as Element)?.closest('.branches-dropdown')) {
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showBranchDropdown]);

  const fetchBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const response = await fetch('/api/branches?isActive=true');
      const result = await response.json();
      
      if (result.success) {
        // Filter out test branches and branches with "test" in name
        const filteredBranches = result.data
          .filter((branch: Branch) => 
            !branch.branchName.toLowerCase().includes('test') &&
            !branch.branchCode.toLowerCase().includes('test') &&
            branch.branchName.toLowerCase() !== 'tested branch'
          )
          .sort((a: Branch, b: Branch) => {
            // Sort by state first, then by city, then by name
            if (a.state !== b.state) return a.state.localeCompare(b.state);
            if (a.city !== b.city) return a.city.localeCompare(b.city);
            return a.branchName.localeCompare(b.branchName);
          });
        
        setBranches(filteredBranches);
        console.log(`📋 Loaded ${filteredBranches.length} active branches (filtered out test branches)`);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white px-4 lg:px-8 py-4 shadow-xl border-b-2 border-slate-600">
      <div className="flex items-center justify-between">
        {/* Left section - Enhanced Logo and title */}
        <div className="flex items-center space-x-4 lg:space-x-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm lg:text-base drop-shadow-sm">BIZ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-green-400 font-bold text-base lg:text-lg tracking-wide">BIZLOAN</span>
              <span className="text-slate-300 text-xs lg:text-sm font-medium">Query Management</span>
            </div>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-600"></div>
          <span className="text-lg lg:text-xl font-bold hidden md:block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Operations Center
          </span>
        </div>

        {/* Center section - Navigation tabs (hidden on mobile) */}
        <div className="hidden lg:flex items-center space-x-1">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium">
            📊 Operations
          </button>
          
          {/* Enhanced Branches dropdown */}
          <div className="relative branches-dropdown">
            <button
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="flex items-center space-x-3 px-6 py-3 hover:bg-slate-600/70 rounded-xl transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500"
            >
              <span className="flex items-center space-x-2">
                <span className="text-lg">🏢</span>
                <span className="font-semibold">
                  Branches ({isLoadingBranches ? '...' : branches.length})
                </span>
                {isLoadingBranches && <span className="animate-pulse ml-1 text-yellow-400">⏳</span>}
              </span>
              <FaChevronDown className={`w-4 h-4 transition-transform duration-200 ${showBranchDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showBranchDropdown && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-white text-gray-800 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="py-1">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <div className="font-semibold text-sm text-gray-800">
                      All Active Branches {isLoadingBranches && <span className="text-blue-500">(Loading...)</span>}
                    </div>
                    {branches.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {branches.length} branches • {new Set(branches.map(b => b.state)).size} states • {new Set(branches.map(b => b.city)).size} cities
                      </div>
                    )}
                  </div>
                  {branches.length === 0 && !isLoadingBranches ? (
                    <div className="px-4 py-3 text-gray-500 text-sm">No branches available</div>
                  ) : (
                    branches.map((branch, index) => (
                      <div 
                        key={`branch-${branch.id || index}`} 
                        className="block px-4 py-2 hover:bg-gray-100 border-b border-gray-100 cursor-pointer"
                        onClick={() => setShowBranchDropdown(false)}
                      >
                        <div className="font-medium text-sm">{branch.branchName}</div>
                        <div className="text-xs text-gray-500">
                          Code: {branch.branchCode} • {branch.city}, {branch.state}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right section - Enhanced User info, notifications and logout */}
        <div className="flex items-center space-x-3 lg:space-x-6">
          {/* User Info Card */}
          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-right">
              <div className="text-xs lg:text-sm text-emerald-400 font-semibold tracking-wide">OPERATIONS TEAM</div>
              <div className="text-sm lg:text-base font-bold text-white">ID: {user?.employeeId || 'CONS0130'}</div>
              {branches.length > 0 && (
                <div className="text-xs text-blue-300 font-medium">
                  🏢 {branches.length} Active Branches
                </div>
              )}
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xs lg:text-sm">
                {user?.employeeId?.charAt(0) || 'O'}
              </span>
            </div>
          </div>
          
          {/* Mobile User Info */}
          <div className="sm:hidden w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xs">
              {user?.employeeId?.charAt(0) || 'O'}
            </span>
          </div>
          
          {/* Vertical Separator */}
          <div className="h-8 w-px bg-slate-600"></div>
          
          {/* Notifications */}
          <div className="flex items-center">
            <NotificationCenter team="operations" />
          </div>
          
          {/* Enhanced Logout Button */}
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-4 lg:px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            <FaSignOutAlt className="text-sm lg:text-base" />
            <span className="hidden sm:inline text-sm lg:text-base">LOGOUT</span>
          </button>
        </div>
      </div>
      <LogoutConfirmationModal 
        isOpen={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </nav>
  );
} 