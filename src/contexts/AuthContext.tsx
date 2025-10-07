'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials, AuthContextType } from '@/types/shared';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      console.log('🔐 Auth context login result:', result);

      if (result.success && result.user) {
        const loggedInUser: User = {
          employeeId: result.user.employeeId,
          name: result.user.fullName || result.user.name,
          role: result.user.role,
          isAuthenticated: true,
          branch: result.user.branch || credentials.branch || null,
          branchCode: result.user.branchCode || credentials.branchCode || null,
          assignedBranches: result.user.assignedBranches || [],
          department: result.user.department,
          permissions: result.user.permissions || []
        };
        
        setUser(loggedInUser);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setIsLoading(false);
        return true;
      } else {
        console.error('❌ Auth context login failed:', result?.error || 'Unknown error');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('💥 Auth context login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 