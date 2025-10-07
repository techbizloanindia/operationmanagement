'use client';

import React from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { BranchProvider } from '@/contexts/BranchContext';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <BranchProvider>
        <AdminDashboard />
      </BranchProvider>
    </ProtectedRoute>
  );
} 