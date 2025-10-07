'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [],
  redirectTo = '/login' 
}) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // If user is not authenticated, redirect to login
      if (!user || !user.isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // If specific roles are required and user doesn't have the required role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirect to their appropriate dashboard based on their role
        switch (user.role) {
          case 'sales':
            router.push('/sales');
            break;
          case 'credit':
            router.push('/credit-dashboard');
            break;
          case 'operations':
            router.push('/operations');
            break;
          case 'admin':
            router.push('/admin-dashboard');
            break;
          default:
            router.push('/login');
        }
        return;
      }
    }
  }, [user, isLoading, router, allowedRoles, redirectTo]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user || !user.isAuthenticated) {
    return null;
  }

  // If role check fails, show nothing while redirecting
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  // User is authenticated and has proper role, show the protected content
  return <>{children}</>;
};

export default ProtectedRoute; 