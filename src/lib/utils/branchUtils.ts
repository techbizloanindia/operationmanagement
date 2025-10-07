// Centralized branch utility functions

export interface User {
  assignedBranches?: string[];
  branch?: string;
  branchCode?: string;
}

/**
 * Get user's assigned branches with ENHANCED multiple branch support
 * Priority: assignedBranches > branch + branchCode
 * Handles multiple branch assignments and special cases
 */
export function getUserBranches(user: User | null | undefined): string[] {
  if (!user) {
    console.log('🚫 getUserBranches: No user provided');
    return [];
  }

  // Priority 1: assignedBranches array (for multiple assignments)
  if (user.assignedBranches && user.assignedBranches.length > 0) {
    const validAssignedBranches = user.assignedBranches.filter(branch => 
      branch && branch !== 'Unassigned' && branch.trim() !== ''
    );
    if (validAssignedBranches.length > 0) {
      console.log('🏢 getUserBranches: Using assignedBranches:', validAssignedBranches);
      return validAssignedBranches;
    }
  }

  // Priority 2: Single branch assignment
  const branches: string[] = [];
  
  // Handle special case for "Multiple" branch assignment
  if (user.branch && user.branch.toLowerCase() === 'multiple') {
    console.log('🏢 getUserBranches: User has "Multiple" branch access - will get all branches');
    return ['Multiple']; // This will be handled by the API to expand to all branches
  }
  
  // Regular single branch assignment
  if (user.branch && user.branch !== 'Unassigned' && user.branch.toLowerCase() !== 'multiple') {
    branches.push(user.branch);
  }
  
  if (user.branchCode && 
      user.branchCode !== user.branch && 
      user.branchCode !== 'Unassigned' && 
      user.branchCode.toLowerCase() !== 'multiple') {
    branches.push(user.branchCode);
  }

  const validBranches = branches.filter(Boolean);
  
  if (validBranches.length === 0) {
    console.log('🚫 getUserBranches: User has no valid branch assignments');
  } else {
    console.log('🏢 getUserBranches: Valid branches found:', validBranches);
  }

  return validBranches;
}

/**
 * Check if a query/application belongs to user's branches with STRICT validation
 */
export function isInUserBranches(
  item: { branch?: string; branchCode?: string; assignedToBranch?: string; applicationBranch?: string; applicationBranchCode?: string },
  userBranches: string[]
): boolean {
  // STRICT: If user has no branch assignments, they can't access any queries
  if (userBranches.length === 0) {
    console.log('🚫 isInUserBranches: User has no branch assignments - access denied');
    return false;
  }

  // Check all possible branch fields for matches
  const hasAccess = userBranches.some(userBranch =>
    item.branch === userBranch ||
    item.branchCode === userBranch ||
    item.assignedToBranch === userBranch ||
    item.applicationBranch === userBranch ||
    item.applicationBranchCode === userBranch ||
    // Case-insensitive matching
    (item.branch && item.branch.toLowerCase() === userBranch.toLowerCase()) ||
    (item.branchCode && item.branchCode.toLowerCase() === userBranch.toLowerCase()) ||
    (item.assignedToBranch && item.assignedToBranch.toLowerCase() === userBranch.toLowerCase()) ||
    (item.applicationBranch && item.applicationBranch.toLowerCase() === userBranch.toLowerCase()) ||
    (item.applicationBranchCode && item.applicationBranchCode.toLowerCase() === userBranch.toLowerCase())
  );

  if (!hasAccess) {
    console.log('🚫 isInUserBranches: No branch match found - access denied');
  }

  return hasAccess;
}

/**
 * Create MongoDB query filter for branches
 */
export function createBranchFilter(branches: string[]) {
  if (branches.length === 0) return {};

  return {
    $or: [
      { branch: { $in: branches } },
      { branchCode: { $in: branches } },
      { assignedToBranch: { $in: branches } }
    ]
  };
}

/**
 * Filter items by branches with STRICT validation (for in-memory filtering)
 */
export function filterByBranches<T extends { branch?: string; branchCode?: string; assignedToBranch?: string; applicationBranch?: string; applicationBranchCode?: string }>(
  items: T[],
  userBranches: string[]
): T[] {
  // STRICT: If user has no branch assignments, return empty array
  if (userBranches.length === 0) {
    console.log('🚫 filterByBranches: User has no branch assignments - returning empty array');
    return [];
  }

  const filteredItems = items.filter(item => isInUserBranches(item, userBranches));
  console.log(`🏢 filterByBranches: Filtered ${items.length} items to ${filteredItems.length} based on branches: ${userBranches.join(', ')}`);
  
  return filteredItems;
}

/**
 * Create branch parameter string for API calls
 */
export function createBranchParam(userBranches: string[]): string {
  return userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
}

/**
 * Normalize branch name (handle different naming conventions)
 */
export function normalizeBranchName(branch: string): string {
  return branch.trim().toLowerCase();
}

/**
 * Check if branch names match (case-insensitive, trimmed)
 */
export function branchesMatch(branch1: string, branch2: string): boolean {
  return normalizeBranchName(branch1) === normalizeBranchName(branch2);
}