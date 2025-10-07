'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/types/shared';
import Image from 'next/image';

const ControlPanelLogin = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    employeeId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!credentials.employeeId || !credentials.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const success = await login(credentials);
      if (success) {
        // Check if user has admin role
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.role === 'admin') {
            router.push('/admin-dashboard');
          } else {
            setError('Access denied. Admin privileges required.');
            // Clear the user data since they shouldn't have access
            localStorage.removeItem('currentUser');
          }
        }
      } else {
        setError('Invalid admin credentials');
      }
    } catch {
      setError('Login failed. Please try again.');
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
          <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
        </div>
        
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="backdrop-blur-2xl bg-black/20 border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-10 relative overflow-hidden">
          {/* Dark glass morphism effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 rounded-3xl"></div>
          
          <div className="relative z-10">
            {/* Logo and Header */}
            <div className="text-center mb-10">
              <div className="mx-auto h-20 w-44 relative mb-8 p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl backdrop-blur-sm border border-emerald-400/20 shadow-lg">
                <Image
                  src="/logo.png"
                  alt="Bizloan India - Admin Control Panel"
                  fill
                  sizes="176px"
                  style={{ objectFit: 'contain' }}
                  priority
                  className="filter drop-shadow-2xl"
                />
              </div>
              
              {/* Security Shield Icon */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-2xl border border-emerald-300/30">
                    <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent tracking-tight">
                  Admin Control Panel
                </h2>
                <p className="text-lg text-emerald-100/80 font-medium">Secure Administrative Access</p>
                
                <div className="inline-flex items-center px-4 py-2 rounded-full backdrop-blur-md bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-200 border border-emerald-400/30 shadow-lg">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-semibold">Restricted Access Zone</span>
                </div>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Admin ID Field */}
              <div className="space-y-2">
                <label htmlFor="employeeId" className="block text-sm font-semibold text-emerald-100 tracking-wide">
                  Administrator ID
                </label>
                <div className="relative group">
                  <input
                    id="employeeId"
                    name="employeeId"
                    type="text"
                    required
                    value={credentials.employeeId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 pl-14 backdrop-blur-sm bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:bg-white/10 transition-all duration-300 outline-none text-white placeholder-slate-300 text-lg group-hover:border-white/30"
                    placeholder="Enter administrator ID"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-emerald-300/70 group-focus-within:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-emerald-100 tracking-wide">
                  Administrator Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={credentials.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 pl-14 pr-14 backdrop-blur-sm bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 focus:bg-white/10 transition-all duration-300 outline-none text-white placeholder-slate-300 text-lg group-hover:border-white/30"
                    placeholder="Enter administrator password"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-emerald-300/70 group-focus-within:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-300/70 hover:text-emerald-200 transition-colors"
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

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center px-6 py-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:via-emerald-800 hover:to-teal-800 text-white font-bold rounded-2xl shadow-xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-emerald-400/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-lg tracking-wide"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Access Control Panel
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/5 backdrop-blur-sm text-slate-300 rounded-full border border-white/10">
                    or
                  </span>
                </div>
              </div>

              {/* Back to Regular Login */}
              <div>
                <Link
                  href="/login"
                  className="w-full inline-flex justify-center items-center px-6 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm border border-white/20 rounded-xl text-slate-200 hover:text-white hover:bg-gradient-to-r hover:from-slate-600/60 hover:to-slate-500/60 font-semibold transition-all duration-300 group transform hover:scale-105 shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Regular Employee Login
                </Link>
              </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanelLogin; 