'use client';

import React, { useEffect } from 'react';
import OperationsDashboard from '@/components/operations/OperationsDashboard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function OperationsPage() {
  // Initialize real-time services when page loads
  useEffect(() => {
    // Import and initialize query update service
    import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
      queryUpdateService.initialize();
      console.log('🌐 Operations Page: Initialized query update service');
    });
    
    // Import and initialize query sync service
    import('@/lib/querySyncService').then(({ querySyncService }) => {
      // Start auto-sync for operations team
      const intervalId = querySyncService.startAutoSync('operations', 1);
      console.log('🔄 Operations Page: Started auto-sync for operations team');
      
      return () => {
        clearInterval(intervalId);
      };
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['operations']}>
      <OperationsDashboard />
    </ProtectedRoute>
  );
}