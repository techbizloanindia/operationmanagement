'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole } from '@/types/shared';

// Notification component
interface NotificationProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-full">
      <div className={`backdrop-blur-xl border-2 rounded-2xl shadow-2xl p-6 ${
        type === 'success' 
          ? 'bg-green-500/20 border-green-400/50 text-green-100' 
          : 'bg-red-500/20 border-red-400/50 text-red-100'
      }`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {type === 'success' ? (
                <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm mt-2 opacity-90">{message}</p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={onClose}
              className="inline-flex text-white/70 hover:text-white focus:outline-none transition-colors duration-200"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface User {
  _id?: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: string;
  branch: string;
  department: string;
  isActive: boolean;
  createdAt: string;
}

interface Branch {
  _id: string;
  branchCode: string;
  branchName: string;
  isActive: boolean;
}

interface EditModalData {
  isOpen: boolean;
  user: User | null;
  type: 'password' | 'details';
}

interface DeleteModalData {
  isOpen: boolean;
  user: User | null;
}

const UserCreationTab = React.memo(() => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editModal, setEditModal] = useState<EditModalData>({ isOpen: false, user: null, type: 'password' });
  const [deleteModal, setDeleteModal] = useState<DeleteModalData>({ isOpen: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'operations' as UserRole,
    selectedBranches: [] as string[]
  });
  const [editSelectAll, setEditSelectAll] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ show: false, type: 'success', title: '', message: '' });

  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const hideNotification = () => {
    setNotification({ show: false, type: 'success', title: '', message: '' });
  };

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '', // Keep for display but not required
    password: '',
    confirmPassword: '',
    role: 'operations' as UserRole,
    selectedBranches: [] as string[]
  });

  const [selectAll, setSelectAll] = useState(false);

  // Fetch users and branches on component mount
  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  // Filter users based on search term and selected role
  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.employeeId.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower)
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRole]);

  // Memoized API call functions
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data);
      } else {
        console.error('Failed to fetch users:', result.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch('/api/branches?isActive=true');
      const result = await response.json();
      if (result.success) {
        setBranches(result.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, []);

  // Memoize active branch names calculation
  const activeBranchNames = useMemo(() => 
    [...new Set(branches.filter(branch => branch.isActive).map(branch => branch.branchName))],
    [branches]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
  };

  const handleBranchChange = (branch: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(branch)
        ? prev.selectedBranches.filter(b => b !== branch)
        : [...prev.selectedBranches, branch]
    }));
  };

  const handleSelectAllBranches = () => {
    if (selectAll) {
      setFormData(prev => ({ ...prev, selectedBranches: [] }));
    } else {
      setFormData(prev => ({ ...prev, selectedBranches: [...activeBranchNames] }));
    }
    setSelectAll(!selectAll);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      showNotification('error', '❌ Validation Error', 'Passwords do not match! Please ensure both password fields are identical.');
      return;
    }
    
    if (!formData.employeeId || !formData.fullName || !formData.email || !formData.password) {
      const missingFields = [];
      if (!formData.employeeId) missingFields.push('Employee ID');
      if (!formData.fullName) missingFields.push('Full Name');
      if (!formData.email) missingFields.push('Email Address');
      if (!formData.password) missingFields.push('Password');
      
      showNotification('error', '📝 Missing Information', `Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (formData.selectedBranches.length === 0) {
      showNotification('error', '🏢 Branch Selection Required', 'Please select at least one branch for the user to access.');
      return;
    }

    try {
      setLoading(true);
      
      // Create user first
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          branch: formData.selectedBranches.length === 1 ? formData.selectedBranches[0] : 'Multiple',
          department: 'General'
        }),
      });

      const userResult = await userResponse.json();
      
      if (userResult.success) {
        // Now assign access rights
        const accessResponse = await fetch('/api/access-rights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userResult.data._id,
            role: formData.role,
            branches: formData.selectedBranches,
            permissions: []
          }),
        });

        const accessResult = await accessResponse.json();
        
        if (accessResult.success) {
          showNotification(
            'success', 
            '🎉 User Created Successfully!', 
            `${formData.fullName} has been created with ${formData.role} role and access to ${formData.selectedBranches.length} branch(es). The user can now log in with Employee ID: ${formData.employeeId}`
          );
          
          // Reset form
          setFormData({
            employeeId: '',
            fullName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            role: 'operations',
            selectedBranches: []
          });
          setSelectAll(false);
          
          fetchUsers(); // Refresh the user list
        } else {
          showNotification(
            'error',
            '⚠️ Partial Success',
            `User ${formData.fullName} was created but failed to assign access rights: ${accessResult.error}`
          );
        }
      } else {
        showNotification(
          'error',
          '❌ Failed to Create User',
          `Could not create user ${formData.fullName}: ${userResult.error}`
        );
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while creating the user. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditPasswordModal = (user: User) => {
    setEditModal({ isOpen: true, user, type: 'password' });
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const openEditDetailsModal = async (user: User) => {
    setEditModal({ isOpen: true, user, type: 'details' });
    
    // Load user's current details and branch permissions
    setEditFormData({
      fullName: user.fullName,
      email: user.email,
      phone: '', // Will be loaded from API
      role: user.role as UserRole,
      selectedBranches: []
    });

    // Fetch user's branch permissions
    if (user._id) {
      try {
        const response = await fetch(`/api/users/${user._id}`);
        const result = await response.json();
        if (result.success && result.data.permissions) {
          const branchPermissions = result.data.permissions
            .filter((perm: string) => perm.startsWith('branch:'))
            .map((perm: string) => perm.replace('branch:', ''));
          setEditFormData(prev => ({ ...prev, selectedBranches: branchPermissions }));
        }
      } catch (error) {
        console.error('Error loading user details:', error);
      }
    }
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, user: null, type: 'password' });
    setNewPassword('');
    setConfirmNewPassword('');
    setEditFormData({
      fullName: '',
      email: '',
      phone: '',
      role: 'operations',
      selectedBranches: []
    });
    setEditSelectAll(false);
  };

  const openDeleteModal = (user: User) => {
    setDeleteModal({ isOpen: true, user });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, user: null });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      showNotification('error', '❌ Password Mismatch', 'New passwords do not match! Please ensure both password fields are identical.');
      return;
    }

    if (!editModal.user || !editModal.user._id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${editModal.user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(
          'success',
          '🔐 Password Updated',
          `Password for ${editModal.user.fullName} has been updated successfully!`
        );
        closeEditModal();
        fetchUsers(); // Refresh the user list
      } else {
        showNotification(
          'error',
          '❌ Password Update Failed',
          `Failed to update password for ${editModal.user.fullName}: ${result.error}`
        );
      }
    } catch (error) {
      console.error('Error updating password:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while updating the password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditRoleChange = (role: UserRole) => {
    setEditFormData(prev => ({
      ...prev,
      role
    }));
  };

  const handleEditBranchChange = (branch: string) => {
    setEditFormData(prev => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(branch)
        ? prev.selectedBranches.filter(b => b !== branch)
        : [...prev.selectedBranches, branch]
    }));
  };

  const handleEditSelectAllBranches = () => {
    if (editSelectAll) {
      setEditFormData(prev => ({ ...prev, selectedBranches: [] }));
    } else {
      setEditFormData(prev => ({ ...prev, selectedBranches: [...activeBranchNames] }));
    }
    setEditSelectAll(!editSelectAll);
  };

  const handleUserDetailsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editModal.user || !editModal.user._id) return;

    if (editFormData.selectedBranches.length === 0) {
      showNotification('error', '🏢 Branch Selection Required', 'Please select at least one branch for the user to access.');
      return;
    }

    try {
      setLoading(true);
      
      // Update user details
      const userResponse = await fetch(`/api/users/${editModal.user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editFormData.fullName,
          email: editFormData.email,
          role: editFormData.role,
          branch: editFormData.selectedBranches.length === 1 ? editFormData.selectedBranches[0] : 'Multiple',
        }),
      });

      const userResult = await userResponse.json();
      
      if (userResult.success) {
        // Update access rights
        const accessResponse = await fetch('/api/access-rights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: editModal.user._id,
            role: editFormData.role,
            branches: editFormData.selectedBranches,
            permissions: []
          }),
        });

        const accessResult = await accessResponse.json();
        
        if (accessResult.success) {
          showNotification(
            'success',
            '✅ User Updated',
            `${editFormData.fullName} has been updated successfully with ${editFormData.role} role and access to ${editFormData.selectedBranches.length} branch(es)!`
          );
          closeEditModal();
          fetchUsers(); // Refresh the user list
        } else {
          showNotification(
            'error',
            '⚠️ Partial Update',
            `User ${editFormData.fullName} was updated but failed to update access rights: ${accessResult.error}`
          );
        }
      } else {
        showNotification(
          'error',
          '❌ Update Failed',
          `Failed to update user ${editFormData.fullName}: ${userResult.error}`
        );
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while updating the user. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.user || !deleteModal.user._id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${deleteModal.user._id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(
          'success',
          '🗑️ User Deleted',
          `${deleteModal.user.fullName} has been permanently deleted from the system.`
        );
        closeDeleteModal();
        fetchUsers(); // Refresh the user list
      } else {
        showNotification(
          'error',
          '❌ Delete Failed',
          `Failed to delete user ${deleteModal.user.fullName}: ${result.error}`
        );
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while deleting the user. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!user._id) return;

    try {
      setLoading(true);
      const newStatus = !user.isActive;
      
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(
          'success',
          newStatus ? '✅ User Activated' : '⏸️ User Deactivated',
          `${user.fullName} has been ${newStatus ? 'activated' : 'deactivated'} successfully.`
        );
        fetchUsers(); // Refresh the user list
      } else {
        showNotification(
          'error',
          '❌ Status Update Failed',
          `Failed to ${newStatus ? 'activate' : 'deactivate'} user ${user.fullName}: ${result.error}`
        );
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      showNotification(
        'error',
        '💥 System Error',
        'An unexpected error occurred while updating the user status. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Compact Header Section */}
      <div className="relative">
        <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent truncate">
                👤 User Management
              </h3>
              <p className="text-purple-200/90 text-xs sm:text-sm font-medium">Create and manage user accounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Form Container */}
      <div className="relative">
        <form onSubmit={handleSubmit} className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        
        {/* Compact Required Fields Info */}
        <div className="flex items-center space-x-2 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-200/80">
            Fields marked with <span className="text-red-400 font-semibold">*</span> are required
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-purple-200 mb-1">
              Employee ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="employeeId"
              id="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-200"
              placeholder="Enter employee ID"
            />
          </div>
          
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-purple-200 mb-1">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              id="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-200"
              placeholder="Enter full name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-purple-200 mb-1">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-200"
              placeholder="Enter email address"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-purple-200 mb-1">
              Phone <span className="text-xs text-purple-300/60">(Optional)</span>
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-200"
              placeholder="Enter phone number"
            />
          </div>
        </div>

        {/* Password Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-purple-200 mb-1">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-200"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-purple-300 hover:text-white transition-colors duration-200"
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-purple-200 mb-1">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-200"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-purple-300 hover:text-white transition-colors duration-200"
              >
                {showConfirmPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <h4 className="text-sm font-medium text-white mb-2">Role Assignment</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
              formData.role === 'operations' 
                ? 'border-blue-400 bg-blue-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}>
              <input
                type="radio"
                name="role"
                value="operations"
                checked={formData.role === 'operations'}
                onChange={() => handleRoleChange('operations')}
                className="sr-only"
              />
              <span className="text-lg mr-2">⚙️</span>
              <span className="text-sm font-medium text-white">Operations</span>
            </label>
            
            <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
              formData.role === 'credit' 
                ? 'border-orange-400 bg-orange-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}>
              <input
                type="radio"
                name="role"
                value="credit"
                checked={formData.role === 'credit'}
                onChange={() => handleRoleChange('credit')}
                className="sr-only"
              />
              <span className="text-lg mr-2">💳</span>
              <span className="text-sm font-medium text-white">Credit</span>
            </label>
            
            <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
              formData.role === 'sales' 
                ? 'border-green-400 bg-green-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}>
              <input
                type="radio"
                name="role"
                value="sales"
                checked={formData.role === 'sales'}
                onChange={() => handleRoleChange('sales')}
                className="sr-only"
              />
              <span className="text-lg mr-2">📈</span>
              <span className="text-sm font-medium text-white">Sales</span>
            </label>
            
            <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
              formData.role === 'admin' 
                ? 'border-red-400 bg-red-500/20' 
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={formData.role === 'admin'}
                onChange={() => handleRoleChange('admin')}
                className="sr-only"
              />
              <span className="text-lg mr-2">👑</span>
              <span className="text-sm font-medium text-white">Admin</span>
            </label>
          </div>
        </div>

        {/* Branch Access */}
        <div>
          <h4 className="text-sm font-medium text-white mb-2">Branch Access</h4>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            {/* Select All Option */}
            <div className="flex items-center mb-3 pb-3 border-b border-white/10">
              <input
                id="selectAllBranches"
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAllBranches}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-400 focus:ring-offset-0"
              />
              <label htmlFor="selectAllBranches" className="ml-2 text-sm text-white cursor-pointer">
                Select All ({activeBranchNames.length} branches)
              </label>
            </div>

            {/* Branch Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {activeBranchNames.map((branch, index) => (
                <label 
                  key={`branch-${index}-${branch}`} 
                  className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                    formData.selectedBranches.includes(branch)
                      ? 'border-blue-400 bg-blue-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedBranches.includes(branch)}
                    onChange={() => handleBranchChange(branch)}
                    className="w-3 h-3 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-400 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-xs text-white truncate" title={branch}>
                    {branch}
                  </span>
                </label>
              ))}
            </div>

            {/* Selected Count */}
            {formData.selectedBranches.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-blue-200">
                  ✅ {formData.selectedBranches.length} branch{formData.selectedBranches.length !== 1 ? 'es' : ''} selected
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create User
              </>
            )}
          </button>
        </div>
      </form>
      </div>

      {/* User List Section */}
      <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">User List</h3>
              <p className="text-purple-200/80 text-sm">
                {searchTerm || selectedRole !== 'all' 
                  ? `Showing ${filteredUsers.length} of ${users.length} users` 
                  : `Total: ${users.length} users`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search users by name, email, employee ID, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-purple-300/70 transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-300 hover:text-white transition-colors duration-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRole('all')}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedRole === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              All Users ({users.length})
            </button>
            
            <button
              onClick={() => setSelectedRole('admin')}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedRole === 'admin'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
            >
              <span className="text-lg mr-2">👑</span>
              Admin ({users.filter(u => u.role === 'admin').length})
            </button>
            
            <button
              onClick={() => setSelectedRole('operations')}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedRole === 'operations'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
            >
              <span className="text-lg mr-2">⚙️</span>
              Operations ({users.filter(u => u.role === 'operations').length})
            </button>
            
            <button
              onClick={() => setSelectedRole('sales')}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedRole === 'sales'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
            >
              <span className="text-lg mr-2">📈</span>
              Sales ({users.filter(u => u.role === 'sales').length})
            </button>
            
            <button
              onClick={() => setSelectedRole('credit')}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedRole === 'credit'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
            >
              <span className="text-lg mr-2">💳</span>
              Credit ({users.filter(u => u.role === 'credit').length})
            </button>
          </div>
        </div>

        {/* Role-wise User Organization */}
        {!loading && filteredUsers.length > 0 && selectedRole === 'all' && !searchTerm && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Users by Role
              </h4>
              <p className="text-purple-200/70 text-sm">Click on a role card to filter users</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Admin Users */}
              {users.filter(u => u.role === 'admin').length > 0 && (
                <button
                  onClick={() => setSelectedRole('admin')}
                  className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-400/30 rounded-lg p-4 hover:from-red-500/20 hover:to-red-600/20 hover:border-red-400/50 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">👑</span>
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Admin</h5>
                      <p className="text-red-200 text-sm">{users.filter(u => u.role === 'admin').length} users</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {users.filter(u => u.role === 'admin').slice(0, 3).map(user => (
                      <div key={user._id} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-white truncate">{user.fullName}</span>
                      </div>
                    ))}
                    {users.filter(u => u.role === 'admin').length > 3 && (
                      <div className="text-red-200 text-xs">
                        +{users.filter(u => u.role === 'admin').length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              )}

              {/* Operations Users */}
              {users.filter(u => u.role === 'operations').length > 0 && (
                <button
                  onClick={() => setSelectedRole('operations')}
                  className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-400/30 rounded-lg p-4 hover:from-blue-500/20 hover:to-blue-600/20 hover:border-blue-400/50 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">⚙️</span>
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Operations</h5>
                      <p className="text-blue-200 text-sm">{users.filter(u => u.role === 'operations').length} users</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {users.filter(u => u.role === 'operations').slice(0, 3).map(user => (
                      <div key={user._id} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-white truncate">{user.fullName}</span>
                      </div>
                    ))}
                    {users.filter(u => u.role === 'operations').length > 3 && (
                      <div className="text-blue-200 text-xs">
                        +{users.filter(u => u.role === 'operations').length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              )}

              {/* Sales Users */}
              {users.filter(u => u.role === 'sales').length > 0 && (
                <button
                  onClick={() => setSelectedRole('sales')}
                  className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-400/30 rounded-lg p-4 hover:from-green-500/20 hover:to-green-600/20 hover:border-green-400/50 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">📈</span>
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Sales</h5>
                      <p className="text-green-200 text-sm">{users.filter(u => u.role === 'sales').length} users</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {users.filter(u => u.role === 'sales').slice(0, 3).map(user => (
                      <div key={user._id} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-white truncate">{user.fullName}</span>
                      </div>
                    ))}
                    {users.filter(u => u.role === 'sales').length > 3 && (
                      <div className="text-green-200 text-xs">
                        +{users.filter(u => u.role === 'sales').length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              )}

              {/* Credit Users */}
              {users.filter(u => u.role === 'credit').length > 0 && (
                <button
                  onClick={() => setSelectedRole('credit')}
                  className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-400/30 rounded-lg p-4 hover:from-orange-500/20 hover:to-orange-600/20 hover:border-orange-400/50 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">💳</span>
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Credit</h5>
                      <p className="text-orange-200 text-sm">{users.filter(u => u.role === 'credit').length} users</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {users.filter(u => u.role === 'credit').slice(0, 3).map(user => (
                      <div key={user._id} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-white truncate">{user.fullName}</span>
                      </div>
                    ))}
                    {users.filter(u => u.role === 'credit').length > 3 && (
                      <div className="text-orange-200 text-xs">
                        +{users.filter(u => u.role === 'credit').length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-white font-medium">Loading users...</span>
              </div>
            </div>
          ) : (
            filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {users.length === 0 ? 'No Users Found' : 'No Matching Users'}
                </h4>
                <p className="text-purple-200/80">
                  {users.length === 0 
                    ? 'Create your first user to get started' 
                    : 'Try adjusting your search criteria or filters'
                  }
                </p>
                {(searchTerm || selectedRole !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedRole('all');
                    }}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-500/20 text-blue-200 text-sm font-medium rounded-lg border border-blue-400/30 hover:bg-blue-500/30 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                          Employee ID
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-200 uppercase tracking-wider hidden sm:table-cell">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-200 uppercase tracking-wider hidden md:table-cell">
                          Branch
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-purple-300">
                      No users match your search criteria
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id || user.employeeId} className="hover:bg-white/5 transition-colors duration-200">
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-white">{user.employeeId}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-white">{user.fullName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-purple-200 hidden sm:table-cell">{user.email}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin' ? 'bg-red-500/20 text-red-200 border border-red-400/30' :
                          user.role === 'operations' ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30' :
                          user.role === 'sales' ? 'bg-green-500/20 text-green-200 border border-green-400/30' :
                          user.role === 'credit' ? 'bg-orange-500/20 text-orange-200 border border-orange-400/30' :
                          'bg-gray-500/20 text-gray-200 border border-gray-400/30'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-purple-200 hidden md:table-cell">{user.branch}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          user.isActive 
                            ? 'bg-green-500/20 text-green-200 border border-green-400/30' 
                            : 'bg-red-500/20 text-red-200 border border-red-400/30'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openEditDetailsModal(user)}
                            className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-200 text-xs font-medium rounded border border-blue-400/30 hover:bg-blue-500/30 transition-colors duration-200"
                            title="Edit User"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="ml-1 hidden sm:inline">Edit</span>
                          </button>
                          
                          <button
                            onClick={() => openEditPasswordModal(user)}
                            className="inline-flex items-center px-2 py-1 bg-amber-500/20 text-amber-200 text-xs font-medium rounded border border-amber-400/30 hover:bg-amber-500/30 transition-colors duration-200"
                            title="Change Password"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2l-4.257-2.257A6 6 0 0117 9zm-5 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2h2m0-4V3a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                            <span className="ml-1 hidden lg:inline">Password</span>
                          </button>
                          
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border transition-colors duration-200 ${
                              user.isActive 
                                ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30 hover:bg-yellow-500/30' 
                                : 'bg-green-500/20 text-green-200 border-green-400/30 hover:bg-green-500/30'
                            }`}
                            title={user.isActive ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.isActive ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            <span className="ml-1 hidden xl:inline">{user.isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="inline-flex items-center px-2 py-1 bg-red-500/20 text-red-200 text-xs font-medium rounded border border-red-400/30 hover:bg-red-500/30 transition-colors duration-200"
                            title="Delete User"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="ml-1 hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
      </div>

      {/* Edit Modal */}
      {editModal.isOpen && editModal.type === 'password' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2l-4.257-2.257A6 6 0 0117 9zm-5 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2h2m0-4V3a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Update Password
                </h3>
                <p className="text-sm text-gray-600">
                  Change password for <span className="font-semibold text-amber-600">{editModal.user?.fullName}</span>
                </p>
              </div>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  placeholder="Enter new password"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                  placeholder="Confirm new password"
                  required
                />
              </div>
              
              <div className="pt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-semibold rounded-lg shadow-md hover:from-gray-500 hover:to-gray-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-green-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editModal.isOpen && editModal.type === 'details' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Edit User Details
                </h3>
                <p className="text-sm text-gray-600">
                  Update information for <span className="font-semibold text-blue-600">{editModal.user?.fullName}</span>
                </p>
              </div>
            </div>
            <form onSubmit={handleUserDetailsUpdate} className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editFullName" className="block text-sm font-bold text-black mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="editFullName"
                    name="fullName"
                    value={editFormData.fullName}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-black bg-white font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="editEmail" className="block text-sm font-bold text-black mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="editEmail"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-black bg-white font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Role Assignment</h4>
                <div className="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
                  <div className="flex items-center">
                    <input
                      id="edit-role-ops"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'operations'}
                      onChange={() => handleEditRoleChange('operations')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-ops" className="ml-3 block text-sm font-medium text-gray-700">
                      Operations
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="edit-role-credit"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'credit'}
                      onChange={() => handleEditRoleChange('credit')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-credit" className="ml-3 block text-sm font-medium text-gray-700">
                      Credit
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="edit-role-sales"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'sales'}
                      onChange={() => handleEditRoleChange('sales')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-sales" className="ml-3 block text-sm font-medium text-gray-700">
                      Sales
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="edit-role-admin"
                      name="editRole"
                      type="radio"
                      checked={editFormData.role === 'admin'}
                      onChange={() => handleEditRoleChange('admin')}
                      className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300"
                    />
                    <label htmlFor="edit-role-admin" className="ml-3 block text-sm font-medium text-gray-700">
                      Admin
                    </label>
                  </div>
                </div>
              </div>

              {/* Branch Access */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Branch Access</h4>
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  {/* Select All */}
                  <div className="flex items-center mb-4 pb-4 border-b border-gray-300">
                    <input
                      id="editSelectAllBranches"
                      type="checkbox"
                      checked={editSelectAll}
                      onChange={handleEditSelectAllBranches}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="editSelectAllBranches" className="ml-3 text-sm font-bold text-gray-700">
                      Select All ({activeBranchNames.length} branches)
                    </label>
                  </div>

                  {/* Branch Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {activeBranchNames.map((branch, index) => (
                      <div key={`edit-branch-${index}-${branch}`} className="flex items-center">
                        <input
                          id={`edit-branch-${branch.toLowerCase().replace(/\s+/g, '')}`}
                          type="checkbox"
                          checked={editFormData.selectedBranches.includes(branch)}
                          onChange={() => handleEditBranchChange(branch)}
                          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label
                          htmlFor={`edit-branch-${branch.toLowerCase().replace(/\s+/g, '')}`}
                          className="ml-3 text-sm text-gray-700 truncate"
                          title={branch}
                        >
                          {branch}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Selected Count */}
                  {editFormData.selectedBranches.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <p className="text-sm text-cyan-600 font-medium">
                        {editFormData.selectedBranches.length} branch{editFormData.selectedBranches.length !== 1 ? 'es' : ''} selected
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-semibold rounded-lg shadow-md hover:from-gray-500 hover:to-gray-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Update User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              Are you sure you want to permanently delete <span className="font-bold text-red-600">{deleteModal.user?.fullName}</span>? 
              This will remove the user and all associated data from the system.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-semibold rounded-lg shadow-md hover:from-gray-500 hover:to-gray-600 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={loading}
                className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-lg shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      )}
    </div>
  );
});

UserCreationTab.displayName = 'UserCreationTab';

export default UserCreationTab; 