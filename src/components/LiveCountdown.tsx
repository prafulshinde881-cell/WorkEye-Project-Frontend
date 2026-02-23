/**
 * LiveCountdown.tsx - Live Activity Countdown Component
 * ====================================================
 * Shows real-time countdown since last activity
 * Updates every second with status badge
 */

import { useRealTimeStatus, MemberStatus } from '../hooks/useRealTimeStatus';

interface LiveCountdownProps {
  lastActivityAt: string | null;
  status?: MemberStatus; // Override calculated status (e.g., when offline from punch-out)
  className?: string;
}

export function LiveCountdown({ lastActivityAt, status: overrideStatus, className = '' }: LiveCountdownProps) {
  const { status: calculatedStatus, formattedTime } = useRealTimeStatus(lastActivityAt);
  
  // Use override status if provided (e.g., explicit offline from punch-out), otherwise use calculated
  const status = overrideStatus || calculatedStatus;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Indicator */}
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'active'
            ? 'bg-green-500 animate-pulse'
            : status === 'idle'
            ? 'bg-yellow-500'
            : 'bg-gray-400'
        }`}
        title={
          status === 'active'
            ? 'Active (< 1 minute ago)'
            : status === 'idle'
            ? 'Idle (1-5 minutes ago)'
            : 'Offline (> 5 minutes ago)'
        }
      />
      
      {/* Formatted Time */}
      <span className="text-sm text-gray-700 font-medium">
        {formattedTime}
      </span>
    </div>
  );
}
