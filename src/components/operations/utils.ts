// Types
export interface Remark {
  id: number;
  user: string;
  team: string;
  content: string;
  timestamp: string;
}

export interface Query {
  id: number;
  title: string;
  status: 'pending' | 'resolved' | 'deferred';
  tat?: string;
  raisedDate: string;
  resolvedDate?: string;
  remarks: Remark[];
  caseNumber?: string;
  customerName?: string;
}

export interface CaseItem {
  id: number;
  appNo: string;
  customerName: string;
  employeeId: string;
  status: string;
  statusBadgeColor: string;
  queries: Query[];
}

// Helper functions
export const formatDate = (date: Date): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const calculateTAT = (startDate: Date, endDate?: Date): string => {
  if (!endDate) {
    endDate = new Date();
  }
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};

export const getBadgeColor = (status: string): string => {
  if (status.includes('Resolved')) {
    return 'bg-green-100 text-green-800';
  } else if (status.includes('Deferral')) {
    return 'bg-cyan-100 text-cyan-800';
  } else {
    return 'bg-yellow-100 text-yellow-800';
  }
}; 