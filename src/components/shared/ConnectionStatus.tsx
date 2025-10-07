'use client';

import React, { useState, useEffect } from 'react';
import { FaWifi, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { querySyncService } from '@/lib/querySyncService';

interface ConnectionStatusProps {
  team: 'sales' | 'credit' | 'operations';
  onRetry?: () => void;
}

export default function ConnectionStatus({ team, onRetry }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const checkConnection = async () => {
    try {
      setError(null);
      
      const health = await querySyncService.getConnectionHealth(team);
      
      setIsConnected(health.connected);
      setLatency(health.latency);
      setLastChecked(new Date());
      
      if (!health.connected) {
        setError(health.error || 'Connection failed');
      }
    } catch (err: any) {
      setIsConnected(false);
      setError(err.message || 'Network error');
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 45000); // Every 45 seconds (staggered)
    
    return () => clearInterval(interval);
  }, [team]);

  const handleRetry = () => {
    checkConnection();
    if (onRetry) {
      onRetry();
    }
  };

  const getStatusColor = () => {
    if (isConnected === null) return 'text-gray-500';
    return isConnected ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = () => {
    if (isConnected === null) return 'Checking...';
    if (isConnected) {
      return latency ? `Connected (${latency}ms)` : 'Connected';
    }
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnected === null) {
      return <FaSync className="animate-spin" />;
    }
    return isConnected ? <FaWifi /> : <FaExclamationTriangle />;
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="font-medium">{getStatusText()}</span>
      </div>
      
      {lastChecked && (
        <span className="text-gray-500 text-xs">
          {lastChecked.toLocaleTimeString()}
        </span>
      )}
      
      {!isConnected && (
        <button
          onClick={handleRetry}
          className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
        >
          <FaSync className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
      
      {error && (
        <div className="flex items-center space-x-1 text-red-500 text-xs">
          <FaExclamationTriangle />
          <span title={error}>Error</span>
        </div>
      )}
    </div>
  );
}
