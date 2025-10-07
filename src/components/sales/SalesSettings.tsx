'use client';

import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Clock,
  Users,
  Shield,
  Database,
  Mail,
  Smartphone,
  Save,
  RefreshCw
} from 'lucide-react';

export default function SalesSettings() {
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      newQueryAlerts: true,
      resolutionReminders: true,
      dailySummary: true
    },
    queryManagement: {
      autoAssignment: true,
      priorityBasedRouting: true,
      escalationTimeout: 24,
      maxQueriesPerUser: 10,
      requireApproval: false
    },
    teamSettings: {
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      timezone: 'Asia/Kolkata',
      weekends: false,
      holidays: true
    },
    integration: {
      syncWithOperations: true,
      realTimeUpdates: true,
      dataRetention: 90,
      backupFrequency: 'daily'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const handleSettingChange = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleNestedSettingChange = (section: string, subsection: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [subsection]: {
          ...(prev[section as keyof typeof prev] as any)[subsection],
          [key]: value
        }
      }
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSavedMessage('Settings saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      setSavedMessage('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        newQueryAlerts: true,
        resolutionReminders: true,
        dailySummary: true
      },
      queryManagement: {
        autoAssignment: true,
        priorityBasedRouting: true,
        escalationTimeout: 24,
        maxQueriesPerUser: 10,
        requireApproval: false
      },
      teamSettings: {
        workingHours: {
          start: '09:00',
          end: '18:00'
        },
        timezone: 'Asia/Kolkata',
        weekends: false,
        holidays: true
      },
      integration: {
        syncWithOperations: true,
        realTimeUpdates: true,
        dataRetention: 90,
        backupFrequency: 'daily'
      }
    });
    setSavedMessage('Settings reset to defaults');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Settings</h1>
            <p className="text-gray-600">Configure your sales team dashboard preferences</p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
        {savedMessage && (
          <div className={`mt-4 p-3 rounded-md ${
            savedMessage.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {savedMessage}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Notifications Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.emailNotifications}
                onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                <p className="text-sm text-gray-500">Receive notifications via SMS</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.smsNotifications}
                onChange={(e) => handleSettingChange('notifications', 'smsNotifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">New Query Alerts</label>
                <p className="text-sm text-gray-500">Get notified when new queries arrive</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.newQueryAlerts}
                onChange={(e) => handleSettingChange('notifications', 'newQueryAlerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Resolution Reminders</label>
                <p className="text-sm text-gray-500">Reminders for pending queries</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.resolutionReminders}
                onChange={(e) => handleSettingChange('notifications', 'resolutionReminders', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Daily Summary</label>
                <p className="text-sm text-gray-500">Daily query summary report</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.dailySummary}
                onChange={(e) => handleSettingChange('notifications', 'dailySummary', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Query Management Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Settings className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Query Management</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto Assignment</label>
                <p className="text-sm text-gray-500">Automatically assign queries to team members</p>
              </div>
              <input
                type="checkbox"
                checked={settings.queryManagement.autoAssignment}
                onChange={(e) => handleSettingChange('queryManagement', 'autoAssignment', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Priority-based Routing</label>
                <p className="text-sm text-gray-500">Route high-priority queries to senior members</p>
              </div>
              <input
                type="checkbox"
                checked={settings.queryManagement.priorityBasedRouting}
                onChange={(e) => handleSettingChange('queryManagement', 'priorityBasedRouting', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Escalation Timeout (hours)</label>
                <p className="text-sm text-gray-500">Auto-escalate queries after this duration</p>
              </div>
              <input
                type="number"
                min="1"
                max="72"
                value={settings.queryManagement.escalationTimeout}
                onChange={(e) => handleSettingChange('queryManagement', 'escalationTimeout', parseInt(e.target.value))}
                className="w-20 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Max Queries Per User</label>
                <p className="text-sm text-gray-500">Maximum concurrent queries per team member</p>
              </div>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.queryManagement.maxQueriesPerUser}
                onChange={(e) => handleSettingChange('queryManagement', 'maxQueriesPerUser', parseInt(e.target.value))}
                className="w-20 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Require Approval</label>
                <p className="text-sm text-gray-500">Require supervisor approval for query resolution</p>
              </div>
              <input
                type="checkbox"
                checked={settings.queryManagement.requireApproval}
                onChange={(e) => handleSettingChange('queryManagement', 'requireApproval', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Team Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Team Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours Start</label>
                <input
                  type="time"
                  value={settings.teamSettings.workingHours.start}
                  onChange={(e) => handleNestedSettingChange('teamSettings', 'workingHours', 'start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours End</label>
                <input
                  type="time"
                  value={settings.teamSettings.workingHours.end}
                  onChange={(e) => handleNestedSettingChange('teamSettings', 'workingHours', 'end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={settings.teamSettings.timezone}
                onChange={(e) => handleSettingChange('teamSettings', 'timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Weekend Operations</label>
                <p className="text-sm text-gray-500">Handle queries during weekends</p>
              </div>
              <input
                type="checkbox"
                checked={settings.teamSettings.weekends}
                onChange={(e) => handleSettingChange('teamSettings', 'weekends', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Holiday Schedule</label>
                <p className="text-sm text-gray-500">Respect national and company holidays</p>
              </div>
              <input
                type="checkbox"
                checked={settings.teamSettings.holidays}
                onChange={(e) => handleSettingChange('teamSettings', 'holidays', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Integration Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Integration & Data</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Sync with Operations</label>
                <p className="text-sm text-gray-500">Real-time synchronization with operations dashboard</p>
              </div>
              <input
                type="checkbox"
                checked={settings.integration.syncWithOperations}
                onChange={(e) => handleSettingChange('integration', 'syncWithOperations', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Real-time Updates</label>
                <p className="text-sm text-gray-500">Enable live updates across the dashboard</p>
              </div>
              <input
                type="checkbox"
                checked={settings.integration.realTimeUpdates}
                onChange={(e) => handleSettingChange('integration', 'realTimeUpdates', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Data Retention (days)</label>
                <p className="text-sm text-gray-500">How long to keep query data</p>
              </div>
              <select
                value={settings.integration.dataRetention}
                onChange={(e) => handleSettingChange('integration', 'dataRetention', parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
                <option value={-1}>Indefinite</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Backup Frequency</label>
                <p className="text-sm text-gray-500">How often to backup data</p>
              </div>
              <select
                value={settings.integration.backupFrequency}
                onChange={(e) => handleSettingChange('integration', 'backupFrequency', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}