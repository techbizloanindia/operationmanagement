'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CreditDashboard from '@/components/credit/CreditDashboard';

// Create a NEW client with proper configuration for credit team
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Always consider data stale for real-time updates
      retry: (failureCount, error) => {
        // Don't retry for 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations
    },
  },
});

export default function CreditDashboardPage() {
  // Initialize real-time services when page loads
  useEffect(() => {
    // Import and initialize query update service
    import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
      queryUpdateService.initialize();
      console.log('🌐 Credit Page: Initialized query update service');
    });
    
    // Import and initialize query sync service
    import('@/lib/querySyncService').then(({ querySyncService }) => {
      // Start auto-sync for credit team
      const intervalId = querySyncService.startAutoSync('credit', 1);
      console.log('🔄 Credit Page: Started auto-sync for credit team');
      
      return () => {
        clearInterval(intervalId);
      };
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['credit']}>
      <QueryClientProvider client={queryClient}>
        <CreditDashboard />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ProtectedRoute>
  );
} 