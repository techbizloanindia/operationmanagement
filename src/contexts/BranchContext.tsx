'use client';

import React, { createContext, useContext, useState } from 'react';

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  isActive: boolean;
  createdAt: Date;
}

interface BranchContextType {
  branches: Branch[];
  addBranch: (branch: Omit<Branch, 'id' | 'createdAt'>) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  toggleBranchStatus: (id: string) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// Initial branches from the original HTML
const initialBranches: Branch[] = [
  { id: '1', name: 'Alipur', code: 'ALP', city: 'Delhi', state: 'Delhi', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '2', name: 'Nangloi', code: 'NGL', city: 'Delhi', state: 'Delhi', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '3', name: 'Pitampura', code: 'PTP', city: 'Delhi', state: 'Delhi', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '4', name: 'Sonipat', code: 'SNP', city: 'Sonipat', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '5', name: 'Badarpur', code: 'BDP', city: 'Delhi', state: 'Delhi', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '6', name: 'Faridabad', code: 'FBD', city: 'Faridabad', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '7', name: 'Goverdhan', code: 'GVD', city: 'Mathura', state: 'Uttar Pradesh', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '8', name: 'Jewar', code: 'JWR', city: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '9', name: 'Mathura', code: 'MTR', city: 'Mathura', state: 'Uttar Pradesh', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '10', name: 'Palwal', code: 'PLW', city: 'Palwal', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '11', name: 'East Delhi', code: 'EDL', city: 'Delhi', state: 'Delhi', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '12', name: 'Ghaziabad', code: 'GZB', city: 'Ghaziabad', state: 'Uttar Pradesh', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '13', name: 'Hapur', code: 'HPR', city: 'Hapur', state: 'Uttar Pradesh', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '14', name: 'Loni', code: 'LON', city: 'Ghaziabad', state: 'Uttar Pradesh', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '15', name: 'Surajpur', code: 'SRP', city: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '16', name: 'Behror', code: 'BHR', city: 'Alwar', state: 'Rajasthan', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '17', name: 'Bhiwadi', code: 'BWD', city: 'Alwar', state: 'Rajasthan', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '18', name: 'Gurugram', code: 'GGN', city: 'Gurugram', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '19', name: 'Narnaul', code: 'NRN', city: 'Mahendragarh', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '20', name: 'Pataudi', code: 'PTD', city: 'Gurugram', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '21', name: 'Rewari', code: 'RWR', city: 'Rewari', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '22', name: 'Sohna', code: 'SHN', city: 'Gurugram', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '23', name: 'Davangere', code: 'DVG', city: 'Davangere', state: 'Karnataka', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '24', name: 'Kanakpura', code: 'KNK', city: 'Ramanagara', state: 'Karnataka', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '25', name: 'Kengeri', code: 'KNG', city: 'Bangalore', state: 'Karnataka', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '26', name: 'Mandya', code: 'MDY', city: 'Mandya', state: 'Karnataka', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '27', name: 'Ramnagar', code: 'RMN', city: 'Bangalore', state: 'Karnataka', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '28', name: 'Yelahanka', code: 'YLH', city: 'Bangalore', state: 'Karnataka', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '29', name: 'Karnal', code: 'KRN', city: 'Karnal', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '30', name: 'Panipat', code: 'PNP', city: 'Panipat', state: 'Haryana', isActive: true, createdAt: new Date('2024-01-01') },
  { id: '31', name: 'Kalyan', code: 'KLN', city: 'Kalyan', state: 'Maharashtra', isActive: true, createdAt: new Date('2024-01-01') },

];

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);

  const addBranch = (branchData: Omit<Branch, 'id' | 'createdAt'>) => {
    const newBranch: Branch = {
      ...branchData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setBranches(prev => [...prev, newBranch]);
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches(prev => prev.map(branch => 
      branch.id === id ? { ...branch, ...updates } : branch
    ));
  };

  const deleteBranch = (id: string) => {
    setBranches(prev => prev.filter(branch => branch.id !== id));
  };

  const toggleBranchStatus = (id: string) => {
    setBranches(prev => prev.map(branch => 
      branch.id === id ? { ...branch, isActive: !branch.isActive } : branch
    ));
  };

  const value: BranchContextType = {
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    toggleBranchStatus,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranches(): BranchContextType {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranches must be used within a BranchProvider');
  }
  return context;
} 