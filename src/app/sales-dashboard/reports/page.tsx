'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import SalesReports from '@/components/sales/SalesReports';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Always consider data stale for real-time updates
      retry: 3,
    },
  },
});

export default function SalesReportsPage() {
  // Initialize real-time services when page loads
  useEffect(() => {
    // Import and initialize query update service
    import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
      queryUpdateService.initialize();
      console.log('< Sales Reports Page: Initialized query update service');
    });
    
    // Import and initialize query sync service
    import('@/lib/querySyncService').then(({ querySyncService }) => {
      // Start auto-sync for sales team
      const intervalId = querySyncService.startAutoSync('sales', 1);
      console.log('= Sales Reports Page: Started auto-sync for sales team');
      
      return () => {
        clearInterval(intervalId);
      };
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['sales']}>
      <QueryClientProvider client={queryClient}>
        <SalesReports />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ProtectedRoute>
  );
}