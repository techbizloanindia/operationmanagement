import crypto from 'crypto';

/**
 * Utility functions for standardizing queryId format across the application
 */

export type QueryIdFormat = 'uuid' | 'sequential' | 'timestamp' | 'hybrid';

export interface QueryIdValidation {
  isValid: boolean;
  format: QueryIdFormat | 'unknown';
  normalized: string;
  original: string;
}

/**
 * Detects the format of a queryId
 */
export function detectQueryIdFormat(queryId: string): QueryIdFormat | 'unknown' {
  if (!queryId) return 'unknown';
  
  const trimmed = queryId.toString().trim();
  
  // UUID format (with or without hyphens)
  const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}(-\d+)?$/i;
  if (uuidRegex.test(trimmed)) {
    return 'uuid';
  }
  
  // Sequential number format (1-6 digits)
  const sequentialRegex = /^\d{1,6}$/;
  if (sequentialRegex.test(trimmed)) {
    return 'sequential';
  }
  
  // Timestamp format (13 digits - milliseconds since epoch)
  const timestampRegex = /^\d{13}$/;
  if (timestampRegex.test(trimmed)) {
    return 'timestamp';
  }
  
  // Hybrid format (Q + timestamp + random)
  const hybridRegex = /^Q\d{13}-[a-z0-9]{9}$/;
  if (hybridRegex.test(trimmed)) {
    return 'hybrid';
  }
  
  return 'unknown';
}

/**
 * Validates and normalizes a queryId
 */
export function validateAndNormalizeQueryId(queryId: string | number): QueryIdValidation {
  const original = queryId.toString();
  const trimmed = original.trim();
  const format = detectQueryIdFormat(trimmed);
  
  // For now, we'll accept all valid formats but log inconsistencies
  const isValid = format !== 'unknown' && trimmed.length > 0;
  
  return {
    isValid,
    format,
    normalized: trimmed,
    original
  };
}

/**
 * Generates a standardized queryId using UUID format
 */
export function generateStandardQueryId(): string {
  return crypto.randomUUID();
}

/**
 * Generates a queryId with index suffix for multiple queries
 */
export function generateIndexedQueryId(baseId: string, index: number): string {
  return `${baseId}-${index}`;
}

/**
 * Extracts the base queryId from an indexed queryId
 */
export function extractBaseQueryId(indexedId: string): string {
  const lastDashIndex = indexedId.lastIndexOf('-');
  if (lastDashIndex === -1) return indexedId;
  
  const suffix = indexedId.substring(lastDashIndex + 1);
  if (/^\d+$/.test(suffix)) {
    return indexedId.substring(0, lastDashIndex);
  }
  
  return indexedId;
}

/**
 * Logs queryId format inconsistencies for debugging
 */
export function logQueryIdInconsistency(
  context: string,
  expectedId: string,
  actualId: string,
  operation: string = 'operation'
) {
  const expected = validateAndNormalizeQueryId(expectedId);
  const actual = validateAndNormalizeQueryId(actualId);
  
  if (expected.format !== actual.format || expected.normalized !== actual.normalized) {
    console.error(`🚨 QueryId Format Inconsistency in ${context}:`);
    console.error(`   Operation: ${operation}`);
    console.error(`   Expected: "${expectedId}" (${expected.format})`);
    console.error(`   Actual: "${actualId}" (${actual.format})`);
    console.error(`   Normalized Expected: "${expected.normalized}"`);
    console.error(`   Normalized Actual: "${actual.normalized}"`);
  }
}

/**
 * Migration helper to handle legacy queryId formats
 */
export function migrateLegacyQueryId(legacyId: string): string {
  const validation = validateAndNormalizeQueryId(legacyId);
  
  if (!validation.isValid) {
    console.warn(`⚠️ Invalid queryId format detected: "${legacyId}", generating new UUID`);
    return generateStandardQueryId();
  }
  
  // For now, keep existing valid formats but log for future migration
  if (validation.format !== 'uuid') {
    console.info(`ℹ️ Legacy queryId format detected: "${legacyId}" (${validation.format})`);
  }
  
  return validation.normalized;
}