'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CreditDashboardData {
  queriesRaised: number;
  queriesResolved: number;
  pendingQueries: number;
  assignedBranches: string[];
  isLoading: boolean;
  error: string | null;
}

export const useCreditDashboardData = () => {
  const [data, setData] = useState<CreditDashboardData>({
    queriesRaised: 0,
    queriesResolved: 0,
    pendingQueries: 0,
    assignedBranches: [],
    isLoading: true,
    error: null
  });

  const { user } = useAuth();

  // Helper function to get user's assigned branches
  const getUserBranches = (user: any) => {
    if (!user) return [];
    
    // Priority: assignedBranches > branch > branchCode
    if (user.assignedBranches && user.assignedBranches.length > 0) {
      return user.assignedBranches;
    }
    
    const branches = [];
    if (user.branch) branches.push(user.branch);
    if (user.branchCode && user.branchCode !== user.branch) branches.push(user.branchCode);
    
    return branches.filter(Boolean);
  };

  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const userBranches = getUserBranches(user);
      const branchParam = userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';

      // Fetch query statistics
      const statsResponse = await fetch(`/api/queries?team=credit&stats=true&includeBoth=true${branchParam}`);
      const statsResult = await statsResponse.json();

      // Use user's assigned branches instead of all branches
      const userBranchesForDisplay = userBranches.length > 0 ? userBranches : [];

      if (statsResult.success) {
        setData({
          queriesRaised: statsResult.data?.total || 0,
          queriesResolved: statsResult.data?.resolved || 0,
          pendingQueries: statsResult.data?.pending || 0,
          assignedBranches: userBranchesForDisplay,
          isLoading: false,
          error: null
        });
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching credit dashboard data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data'
      }));
    }
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (user) {
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return {
    ...data,
    refreshData
  };
};
