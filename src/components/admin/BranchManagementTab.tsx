'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CustomNotification, useNotification } from '../shared/CustomNotification';


interface Branch {
  _id: string;
  branchCode: string;
  branchName: string;
  city: string;
  state: string;
  isActive: boolean;
  createdAt: Date;
}

const BranchManagementTab = React.memo(() => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    state: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/branches');
      const result = await response.json();
      if (result.success) {
        setBranches(result.data);
      } else {
        console.error('Failed to fetch branches:', result.error);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const states = [
    'Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Karnataka', 'Maharashtra',
    'Andhra Pradesh', 'Gujarat', 'Madhya Pradesh', 'Tamil Nadu', 'West Bengal'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Branch code is required';
    } else if (formData.code.length < 2 || formData.code.length > 5) {
      newErrors.code = 'Branch code must be 2-5 characters';
    } else if (branches.some(branch => 
      branch.branchCode.toLowerCase() === formData.code.toLowerCase() && 
      branch._id !== editingBranchId
    )) {
      newErrors.code = 'Branch code already exists';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          isActive: formData.isActive,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`Branch "${formData.name}" created successfully!`, 'success');
        // Reset form
        setFormData({
          name: '',
          code: '',
          city: '',
          state: '',
          isActive: true,
        });
        setErrors({});
        setIsCreating(false);
        fetchBranches(); // Refresh the branch list
      } else {
        showNotification(`Failed to create branch: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      showNotification('Failed to create branch. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingBranchId(null);
    setFormData({
      name: '',
      code: '',
      city: '',
      state: '',
      isActive: true,
    });
    setErrors({});
  };

  const handleEdit = (branch: Branch) => {
    setIsEditing(true);
    setEditingBranchId(branch._id);
    setFormData({
      name: branch.branchName,
      code: branch.branchCode,
      city: branch.city,
      state: branch.state,
      isActive: branch.isActive,
    });
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !editingBranchId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/branches/${editingBranchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          isActive: formData.isActive,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`Branch "${formData.name}" updated successfully!`, 'success');
        handleCancel();
        fetchBranches(); // Refresh the branch list
      } else {
        showNotification(`Failed to update branch: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error updating branch:', error);
      showNotification('Failed to update branch. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleBranchStatus = async (branchId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        fetchBranches(); // Refresh the branch list
        showNotification('Branch status updated successfully!', 'success');
      } else {
        showNotification(`Failed to update branch status: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error updating branch status:', error);
      showNotification('Failed to update branch status. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to delete "${branchName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`Branch "${branchName}" deleted successfully!`, 'success');
        fetchBranches(); // Refresh the branch list
      } else {
        showNotification(`Failed to delete branch: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      showNotification('Failed to delete branch. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <CustomNotification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Branch Management
            </h2>
            <p className="text-gray-300 text-sm">
              Manage your business branches and locations
            </p>
          </div>
          
          {!isCreating && !isEditing && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Add New Branch</span>
            </button>
          )}
        </div>

      {/* Create Branch Form */}
      {isCreating && (
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6">
          <h4 className="text-2xl font-bold text-purple-300 mb-2">Create New Branch</h4>
          <p className="text-gray-400 mb-6">Fill in the details to add a new branch location</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-400 ${
                    errors.name ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter branch name (e.g., New Delhi Central)"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Branch Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-400 ${
                    errors.code ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter branch code (e.g., NDC)"
                  maxLength={5}
                />
                {errors.code && <p className="text-red-400 text-sm mt-1">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-400 ${
                    errors.city ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter city name"
                />
                {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State *
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 outline-none text-white ${
                    errors.state ? 'border-red-500' : 'border-white/20'
                  }`}
                >
                  <option value="" className="bg-slate-800">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state} className="bg-slate-800">{state}</option>
                  ))}
                </select>
                {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-3 backdrop-blur-sm bg-purple-500/10 border border-purple-400/20 p-4 rounded-xl">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
                Active Branch (Available for assignment)
              </label>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Branch
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-3 backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Branch Form */}
      {isEditing && (
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6">
          <h4 className="text-2xl font-bold text-blue-300 mb-2">Edit Branch</h4>
          <p className="text-gray-400 mb-6">Update the branch information below</p>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-400 ${
                    errors.name ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter branch name"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Branch Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-400 ${
                    errors.code ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter branch code"
                  maxLength={5}
                />
                {errors.code && <p className="text-red-400 text-sm mt-1">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-400 ${
                    errors.city ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter city name"
                />
                {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State *
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full px-4 py-3 backdrop-blur-sm bg-white/10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 outline-none text-white ${
                    errors.state ? 'border-red-500' : 'border-white/20'
                  }`}
                >
                  <option value="" className="bg-slate-800">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state} className="bg-slate-800">{state}</option>
                  ))}
                </select>
                {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-3 backdrop-blur-sm bg-blue-500/10 border border-blue-400/20 p-4 rounded-xl">
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActiveEdit" className="text-sm font-medium text-gray-300">
                Active Branch (Available for assignment)
              </label>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Update Branch
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-3 backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branches Table */}
      <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-purple-500/10">
          <h4 className="text-xl font-bold text-purple-300">
            All Branches ({branches.length})
          </h4>
          <p className="text-gray-400 text-sm mt-1">Complete list of all business locations</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Branch Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && branches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center space-x-3">
                      <svg className="animate-spin h-8 w-8 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-gray-300 text-lg">Loading branches...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch._id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-base font-semibold text-white">{branch.branchName}</div>
                        <div className="text-sm text-gray-400">Code: {branch.branchCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-gray-300">{branch.city}</div>
                      <div className="text-sm text-gray-400">{branch.state}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        branch.isActive 
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-400/30'
                      }`}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(branch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(branch)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleBranchStatus(branch._id, branch.isActive)}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                            branch.isActive
                              ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300'
                              : 'bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300'
                          }`}
                        >
                          {branch.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteBranch(branch._id, branch.branchName)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && branches.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Branches Found</h3>
            <p className="text-gray-400">Create your first branch to get started with your business locations.</p>
          </div>
        )}
      </div>
      </div>
    </>
  );
});

BranchManagementTab.displayName = 'BranchManagementTab';

export default BranchManagementTab; 