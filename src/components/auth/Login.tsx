'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials, UserRole } from '@/types/shared';
import Image from 'next/image';



const Login = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    employeeId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [userRights, setUserRights] = useState<any>(null);
  const [isCheckingEmployee, setIsCheckingEmployee] = useState(false);
  const [showRights, setShowRights] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const { login, isLoading } = useAuth();
  const router = useRouter();

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
    
    // If employee ID is being changed, clear the user rights and check new ID
    if (name === 'employeeId') {
      setUserRights(null);
      setShowRights(false);
      
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Auto-check employee rights when ID has sufficient length with debounce
      if (value.trim().length >= 3) {
        debounceRef.current = setTimeout(() => {
          checkEmployeeRightsAuto(value.trim());
        }, 800); // 800ms delay after user stops typing
      }
    }
  };

  const checkEmployeeRightsAuto = async (employeeId: string) => {
    if (!employeeId.trim()) {
      setUserRights(null);
      setShowRights(false);
      return;
    }

    setIsCheckingEmployee(true);
    setError('');

    try {
      const response = await fetch(`/api/users/check-employee?employeeId=${employeeId}`);
      const result = await response.json();

      if (result.success) {
        setUserRights(result.data);
        setShowRights(true);
        setError('');
      } else {
        setUserRights(null);
        setShowRights(false);
        // Don't show errors during auto-check to avoid annoying the user
      }
    } catch (err) {
      console.error('Error checking employee:', err);
      setUserRights(null);
      setShowRights(false);
    } finally {
      setIsCheckingEmployee(false);
    }
  };

  const checkEmployeeRights = async () => {
    if (!credentials.employeeId.trim()) {
      setError('Please enter your Employee ID first');
      return;
    }

    setIsCheckingEmployee(true);
    setError('');

    try {
      const response = await fetch(`/api/users/check-employee?employeeId=${credentials.employeeId}`);
      const result = await response.json();

      if (result.success) {
        setUserRights(result.data);
        setShowRights(true);
        setError('');
      } else {
        setUserRights(null);
        setShowRights(false);
        
        switch (result.code) {
          case 'USER_NOT_FOUND':
            setError('Employee ID not found. Please check your Employee ID or contact administrator.');
            break;
          case 'ACCOUNT_INACTIVE':
            setError('Your account is inactive. Please contact administrator to reactivate your account.');
            break;
          case 'NO_ACCESS_RIGHTS':
            setError('Account exists but no access rights assigned. Please contact administrator.');
            break;
          default:
            setError(result.error || 'Unable to fetch employee details');
        }
      }
    } catch (err) {
      console.error('Error checking employee:', err);
      setError('Network error. Please check your connection and try again.');
      setUserRights(null);
      setShowRights(false);
    } finally {
      setIsCheckingEmployee(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!credentials.employeeId || !credentials.password) {
      setError('Please fill in all fields');
      return;
    }



    try {
      // Attempt login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      
      if (result.success) {
        // Login successful - update auth context
        const success = await login({
          ...credentials,
          branch: result.user.branch,
          branchCode: result.user.branchCode
        });
        
        if (success) {
          const role = result.user.role;
          console.log('🚀 Login successful, redirecting to:', role);
          
          switch (role) {
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
              router.push('/');
          }
        }
      } else {
        // Handle specific error codes
        console.error('Login failed:', result || 'Empty response');
        
        // Ensure result exists and has proper structure
        if (!result) {
          setError('Server error: No response received. Please try again.');
          return;
        }
        
        switch (result.code) {
          case 'USER_NOT_FOUND':
            setError('Employee ID not found. Please check your employee ID or contact administrator.');
            break;
          case 'ACCOUNT_INACTIVE':
            setError('Your account is inactive. Please contact administrator to reactivate your account.');
            break;
          case 'NO_ACCESS_RIGHTS':
            setError(`Account exists but access rights not assigned. Please contact administrator to assign your role and branch permissions.`);
            break;
          case 'INVALID_CREDENTIALS':
            setError('Invalid employee ID or password. Please check your credentials and try again.');
            break;
          case 'SERVICE_UNAVAILABLE':
            setError('Authentication service temporarily unavailable. Please try again in a few moments.');
            break;
          case 'AUTH_ERROR':
            setError('Authentication system error. Please contact technical support.');
            break;
          default:
            setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-zinc-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Sophisticated Dark Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated mesh gradient */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
        </div>
        
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="max-w-lg w-full space-y-8 relative z-10">
        <div className="backdrop-blur-2xl bg-black/20 border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-10 relative overflow-hidden">
          {/* Dark glass morphism effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 rounded-3xl"></div>
          
          <div className="relative z-10">
            {/* Modern Logo and Title */}
            <div className="text-center mb-10">
            <div className="mx-auto h-20 w-44 relative mb-8 p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/20 shadow-lg">
              <Image
                src="/logo.png"
                alt="Bizloan India - Employee Login Portal"
                fill
                sizes="176px"
                style={{ objectFit: 'contain' }}
                priority
                className="filter drop-shadow-2xl"
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent tracking-tight">
                Welcome To Bizloan Ops Query
              </h1>
              <p className="text-lg text-blue-100/80 font-medium">Bizloan India</p>
              <div className="flex items-center justify-center space-x-2 text-sm text-slate-300">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 3.314-2.686 6-6 6s-6-2.686-6-6a4.75 4.75 0 01.332-1.973z" clipRule="evenodd" />
                </svg>
                <span>Operations Query Management Portal</span>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee ID Field */}
            <div className="space-y-2">
              <label htmlFor="employeeId" className="block text-sm font-semibold text-blue-100 tracking-wide">
                Employee ID
              </label>
              <div className="relative group">
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  required
                  value={credentials.employeeId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 pl-14 backdrop-blur-sm bg-white/8 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 focus:bg-white/12 transition-all duration-300 outline-none text-white placeholder-slate-300 text-lg group-hover:border-white/30"
                  placeholder="Enter your employee ID"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-blue-300/70 group-focus-within:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                {isCheckingEmployee && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-300 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>

            {/* User Info Display - Modern Cards */}
            {showRights && userRights && (
              <div className="space-y-3">
                <div className="backdrop-blur-md bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/40 rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
                  <div className="w-10 h-10 bg-emerald-400/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-emerald-200 font-semibold text-sm">Access Role</p>
                    <p className="text-emerald-100 font-bold">{userRights.accessRights.displayName}</p>
                  </div>
                </div>
                
                <div className="backdrop-blur-md bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/40 rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
                  <div className="w-10 h-10 bg-blue-400/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-blue-200 font-semibold text-sm">Branch Office</p>
                    <p className="text-blue-100 font-bold">{userRights.branch}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-blue-100 tracking-wide">
                Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 pl-14 pr-14 backdrop-blur-sm bg-white/8 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 focus:bg-white/12 transition-all duration-300 outline-none text-white placeholder-slate-300 text-lg group-hover:border-white/30"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-blue-300/70 group-focus-within:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-300/70 hover:text-blue-200 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="backdrop-blur-md bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/40 text-red-200 px-5 py-4 rounded-2xl text-sm font-medium flex items-center space-x-3 shadow-lg">
                <div className="w-8 h-8 bg-red-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center px-6 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold rounded-2xl shadow-xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-400/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-lg tracking-wide"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </div>

            {/* Control Panel Link */}
            <div className="text-center pt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/5 backdrop-blur-sm text-slate-300 rounded-full border border-white/10">
                    Administrative Access
                  </span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link
                  href="/control-panel"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-white/20 rounded-xl text-slate-200 hover:text-white hover:bg-gradient-to-r hover:from-slate-600/60 hover:to-slate-500/60 font-semibold transition-all duration-300 group transform hover:scale-105 shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Control Panel
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;