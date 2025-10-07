'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export function OperationsQueryProvider({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient instance for each session
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 1 minute
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  }));

  return (
    <ProtectedRoute allowedRoles={['operations']}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ProtectedRoute>
  );
} 