'use client';

import React from 'react';
import { FaUndo, FaUser, FaCalendarAlt, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

interface RevertMessageBoxProps {
  message: {
    id: string;
    message: string;
    responseText?: string;
    sender: string;
    senderRole?: string;
    team?: string;
    timestamp: string;
    actionType?: string;
    revertReason?: string;
    revertedBy?: string;
  };
  teamContext?: 'sales' | 'credit' | 'operations';
}

export default function RevertMessageBox({ message, teamContext }: RevertMessageBoxProps) {
  // Parse the revert message to extract structured information
  const parseRevertMessage = () => {
    const messageText = message.responseText || message.message || '';
    const lines = messageText.split('\n').filter(line => line.trim() !== '');
    
    let revertedBy = message.revertedBy || message.sender || '';
    let revertedOn = '';
    let reason = message.revertReason || '';
    let team = message.team || '';
    
    // Parse structured revert message
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.includes('👤 Reverted by:')) {
        revertedBy = trimmedLine.replace('👤 Reverted by:', '').trim();
      } else if (trimmedLine.includes('📅 Reverted on:')) {
        revertedOn = trimmedLine.replace('📅 Reverted on:', '').trim();
      } else if (trimmedLine.includes('📝 Reason:')) {
        reason = trimmedLine.replace('📝 Reason:', '').trim();
      } else if (trimmedLine.includes('🔄 Query Reverted by')) {
        const teamMatch = trimmedLine.match(/🔄 Query Reverted by (.+)/);
        if (teamMatch) team = teamMatch[1];
      }
    });

    // Extract reason from the message if not found in structured format
    if (!reason && messageText) {
      const reasonPatterns = [
        /📝 Reason:\s*(.+?)(?:\n|$)/i,
        /Reason:\s*(.+?)(?:\n|$)/i,
        /"([^"]+)"/g // Extract quoted text
      ];
      
      for (const pattern of reasonPatterns) {
        const match = messageText.match(pattern);
        if (match && match[1] && match[1].trim()) {
          reason = match[1].trim();
          break;
        }
      }
      
      // If still no reason, try to extract from quoted content
      if (!reason) {
        const quotedMatches = messageText.match(/"([^"]+)"/g);
        if (quotedMatches && quotedMatches.length > 0) {
          reason = quotedMatches[quotedMatches.length - 1].replace(/"/g, '').trim();
        }
      }
    }

    // Clean up team name and extract member name if needed
    if (team && team.includes('Team') && !revertedBy) {
      const teamParts = team.split(' ');
      if (teamParts.length > 2) {
        revertedBy = teamParts.slice(2).join(' ');
        team = teamParts.slice(0, 2).join(' ');
      }
    }

    // Fallback to timestamp if revertedOn is not found
    if (!revertedOn) {
      revertedOn = new Date(message.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }

    // Ensure we have a team member name
    if (!revertedBy) {
      const teamName = teamContext ? teamContext.charAt(0).toUpperCase() + teamContext.slice(1) : 'Team';
      revertedBy = `${teamName} Member`;
    }

    // If no specific reason found, provide default
    if (!reason || reason === '') {
      reason = 'Query needs additional review and processing';
    }

    return { revertedBy, revertedOn, reason, team };
  };

  const { revertedBy, revertedOn, reason, team } = parseRevertMessage();

  // Get team-specific styling
  const getTeamStyling = () => {
    const baseStyles = {
      container: 'bg-gradient-to-br border-l-4 shadow-2xl rounded-2xl p-6 mb-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl',
      icon: 'h-6 w-6',
      title: 'font-bold text-xl mb-4',
      infoSection: 'space-y-4 text-sm',
      noticeBox: 'text-sm p-5 rounded-xl border-2 mt-5 font-semibold'
    };

    switch (teamContext) {
      case 'sales':
        return {
          ...baseStyles,
          container: `${baseStyles.container} from-blue-50 via-blue-100 to-blue-200 border-l-blue-600 border-4 border-blue-300`,
          icon: `${baseStyles.icon} text-blue-800`,
          title: `${baseStyles.title} text-blue-950`,
          infoSection: `${baseStyles.infoSection} text-blue-900`,
          noticeBox: `${baseStyles.noticeBox} text-blue-900 bg-blue-50 border-blue-400`,
          teamEmoji: '💼',
          accentColor: 'blue'
        };
      case 'credit':
        return {
          ...baseStyles,
          container: `${baseStyles.container} from-green-50 via-green-100 to-green-200 border-l-green-600 border-4 border-green-300`,
          icon: `${baseStyles.icon} text-green-800`,
          title: `${baseStyles.title} text-green-950`,
          infoSection: `${baseStyles.infoSection} text-green-900`,
          noticeBox: `${baseStyles.noticeBox} text-green-900 bg-green-50 border-green-400`,
          teamEmoji: '💳',
          accentColor: 'green'
        };
      case 'operations':
        return {
          ...baseStyles,
          container: `${baseStyles.container} from-purple-50 via-purple-100 to-purple-200 border-l-purple-600 border-4 border-purple-300`,
          icon: `${baseStyles.icon} text-purple-800`,
          title: `${baseStyles.title} text-purple-950`,
          infoSection: `${baseStyles.infoSection} text-purple-900`,
          noticeBox: `${baseStyles.noticeBox} text-purple-900 bg-purple-50 border-purple-400`,
          teamEmoji: '⚙️',
          accentColor: 'purple'
        };
      default:
        return {
          ...baseStyles,
          container: `${baseStyles.container} from-orange-50 via-orange-100 to-orange-200 border-l-orange-600 border-4 border-orange-300`,
          icon: `${baseStyles.icon} text-orange-800`,
          title: `${baseStyles.title} text-orange-950`,
          infoSection: `${baseStyles.infoSection} text-orange-900`,
          noticeBox: `${baseStyles.noticeBox} text-orange-900 bg-orange-50 border-orange-400`,
          teamEmoji: '🔄',
          accentColor: 'orange'
        };
    }
  };

  const styles = getTeamStyling();

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full shadow-lg ${
            teamContext === 'sales' ? 'bg-blue-300 ring-4 ring-blue-200' : 
            teamContext === 'credit' ? 'bg-green-300 ring-4 ring-green-200' : 
            teamContext === 'operations' ? 'bg-purple-300 ring-4 ring-purple-200' : 'bg-orange-300 ring-4 ring-orange-200'
          }`}>
            <FaUndo className={styles.icon} />
          </div>
          <div>
            <span className={styles.title}>
              {styles.teamEmoji} Query Reverted
            </span>
            <div className={`text-sm font-bold ${
              teamContext === 'sales' ? 'text-blue-800' : 
              teamContext === 'credit' ? 'text-green-800' : 
              teamContext === 'operations' ? 'text-purple-800' : 'text-orange-800'
            }`}>
              by {team || `${teamContext ? teamContext.charAt(0).toUpperCase() + teamContext.slice(1) : 'System'} Team`}
            </div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full text-xs font-black shadow-md ${
          teamContext === 'sales' ? 'bg-blue-300 text-blue-900' : 
          teamContext === 'credit' ? 'bg-green-300 text-green-900' : 
          teamContext === 'operations' ? 'bg-purple-300 text-purple-900' : 'bg-orange-300 text-orange-900'
        }`}>
          REVERTED
        </div>
      </div>

      {/* Team Member Information Card */}
      <div className={`mb-6 p-5 rounded-2xl border-3 shadow-lg ${
        teamContext === 'sales' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300' : 
        teamContext === 'credit' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300' : 
        teamContext === 'operations' ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300' : 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300'
      }`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-full shadow-md ${
            teamContext === 'sales' ? 'bg-blue-200' : 
            teamContext === 'credit' ? 'bg-green-200' : 
            teamContext === 'operations' ? 'bg-purple-200' : 'bg-orange-200'
          }`}>
            <FaUser className={`h-5 w-5 ${
              teamContext === 'sales' ? 'text-blue-800' : 
              teamContext === 'credit' ? 'text-green-800' : 
              teamContext === 'operations' ? 'text-purple-800' : 'text-orange-800'
            }`} />
          </div>
          <div className="flex-1">
            <div className={`font-bold text-lg ${
              teamContext === 'sales' ? 'text-blue-950' : 
              teamContext === 'credit' ? 'text-green-950' : 
              teamContext === 'operations' ? 'text-purple-950' : 'text-orange-950'
            }`}>
              {teamContext === 'sales' ? '💼 Sales Team Member' : 
               teamContext === 'credit' ? '💳 Credit Team Member' : 
               teamContext === 'operations' ? '⚙️ Operations Team Member' : '🔄 Team Member'}
            </div>
            <div className={`font-bold text-lg ${
              teamContext === 'sales' ? 'text-blue-800' : 
              teamContext === 'credit' ? 'text-green-800' : 
              teamContext === 'operations' ? 'text-purple-800' : 'text-orange-800'
            }`}>
              {revertedBy}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-bold ${
              teamContext === 'sales' ? 'text-blue-700' : 
              teamContext === 'credit' ? 'text-green-700' : 
              teamContext === 'operations' ? 'text-purple-700' : 'text-orange-700'
            }`}>
              Reverted on
            </div>
            <div className={`text-sm font-black ${
              teamContext === 'sales' ? 'text-blue-900' : 
              teamContext === 'credit' ? 'text-green-900' : 
              teamContext === 'operations' ? 'text-purple-900' : 'text-orange-900'
            }`}>
              {revertedOn}
            </div>
          </div>
        </div>
      </div>

      {/* Revert Reason Section */}
      {reason && (
        <div className={`mb-6 p-5 rounded-2xl border-3 shadow-lg ${
          teamContext === 'sales' ? 'bg-white border-blue-300' : 
          teamContext === 'credit' ? 'bg-white border-green-300' : 
          teamContext === 'operations' ? 'bg-white border-purple-300' : 'bg-white border-orange-300'
        }`}>
          <div className="flex items-start gap-4">
            <FaExclamationTriangle className={`h-6 w-6 mt-1 flex-shrink-0 ${
              teamContext === 'sales' ? 'text-blue-700' : 
              teamContext === 'credit' ? 'text-green-700' : 
              teamContext === 'operations' ? 'text-purple-700' : 'text-orange-700'
            }`} />
            <div className="flex-1">
              <div className={`font-bold text-lg mb-3 ${
                teamContext === 'sales' ? 'text-blue-950' : 
                teamContext === 'credit' ? 'text-green-950' : 
                teamContext === 'operations' ? 'text-purple-950' : 'text-orange-950'
              }`}>
                📝 Revert Reason:
              </div>
              <div className={`p-4 rounded-xl border-2 font-semibold text-base leading-relaxed break-words whitespace-pre-wrap ${
                teamContext === 'sales' ? 'bg-blue-50 text-blue-900 border-blue-300' : 
                teamContext === 'credit' ? 'bg-green-50 text-green-900 border-green-300' : 
                teamContext === 'operations' ? 'bg-purple-50 text-purple-900 border-purple-300' : 'bg-orange-50 text-orange-900 border-orange-300'
              }`}>
                "{reason}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Notice */}
      <div className={`p-5 rounded-2xl border-3 text-center shadow-lg ${
        teamContext === 'sales' ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-400 text-blue-950' : 
        teamContext === 'credit' ? 'bg-gradient-to-r from-green-100 to-green-200 border-green-400 text-green-950' : 
        teamContext === 'operations' ? 'bg-gradient-to-r from-purple-100 to-purple-200 border-purple-400 text-purple-950' : 'bg-gradient-to-r from-orange-100 to-orange-200 border-orange-400 text-orange-950'
      }`}>
        <div className="flex items-center justify-center gap-4 mb-3">
          <FaInfoCircle className="h-6 w-6 flex-shrink-0" />
          <div className="font-bold text-lg">
            Status Update: Query Reverted to <span className={`px-4 py-2 rounded-full shadow-md ${
              teamContext === 'sales' ? 'bg-blue-300 text-blue-900' : 
              teamContext === 'credit' ? 'bg-green-300 text-green-900' : 
              teamContext === 'operations' ? 'bg-purple-300 text-purple-900' : 'bg-orange-300 text-orange-900'
            }`}>PENDING</span>
          </div>
        </div>
        <div className="text-sm font-bold opacity-90">
          This query requires additional processing by the appropriate team before final resolution.
        </div>
      </div>
    </div>
  );
} 