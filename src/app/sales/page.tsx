'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import SalesDashboard from '@/components/sales/SalesDashboard';

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

export default function SalesPage() {
  return (
    <ProtectedRoute allowedRoles={['sales']}>
      <QueryClientProvider client={queryClient}>
        <SalesDashboard />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ProtectedRoute>
  );
} 