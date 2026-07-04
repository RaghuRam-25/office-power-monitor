import { Device, getRoomLabel, RoomType, Alert } from '../types';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 🆕 ব্যাকএন্ড থেকে আসা অ্যালার্ট টাইপ
export interface BackendAlert {
  type: string;
  device: string;
  info: string;
}

interface AlertsPanelProps {
  devices: Device[];
  currentHour: number; // 0 to 23
  currentMinute: number; // 0 to 59
  isRealTime: boolean;
  // 🆕 ব্যাকএন্ড ডেটা
  backendAlerts?: BackendAlert[];
  aiSummary?: string;
  isDemoMode?: boolean;
}

export default function AlertsPanel({ 
  devices, 
  currentHour, 
  currentMinute, 
  isRealTime,
  backendAlerts = [],
  aiSummary = '',
  isDemoMode = false
}: AlertsPanelProps) {
  // Generate active alerts dynamically
  const frontendAlerts: Alert[] = [];
  const now = new Date();

  // শুধুমাত্র ডেমো মোড বা ব্যাকএন্ড disconnected থাকলে frontend alerts দেখাবে
  if (isDemoMode || backendAlerts.length === 0) {
    // 1. Outside office hours check (9 AM to 5 PM)
    const isOutsideHours = currentHour < 9 || currentHour >= 17;
    if (isOutsideHours) {
      const onDevices = devices.filter((d) => d.status);
      onDevices.forEach((device) => {
        const formattedTime = isRealTime 
          ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          
        frontendAlerts.push({
          id: `outside-${device.id}`,
          type: 'outside_hours',
          message: `${getRoomLabel(device.room)}: "${device.name}" left ON after shift hours.`,
          timestamp: formattedTime,
          severity: 'warning',
        });
      });
    }

    // 2. Room power abuse: All 5 devices in a room ON continuously for > 2 hours
    const rooms: RoomType[] = ['drawing_room', 'work1', 'work2'];
    rooms.forEach((roomKey) => {
      const roomDevices = devices.filter((d) => d.room === roomKey);
      const allOn = roomDevices.every((d) => d.status);
      if (allOn && roomDevices.length > 0) {
        // Find the most recent change (the one that completed the "All ON" set)
        const lastChangedTimes = roomDevices.map((d) => new Date(d.last_changed).getTime());
        const latestChangeTime = Math.max(...lastChangedTimes);
        const diffMs = now.getTime() - latestChangeTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours >= 2) {
          frontendAlerts.push({
            id: `allon-${roomKey}`,
            type: 'all_on_duration',
            message: `${getRoomLabel(roomKey)}: Energy warning! All 5 devices active continuously for ${diffHours.toFixed(1)} hours.`,
            timestamp: new Date(latestChangeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            severity: 'error',
          });
        }
      }
    });
  }

  // 🆕 ব্যাকএন্ড থেকে আসা অ্যালার্ট ফ্রন্টএন্ড অ্যালার্টের সাথে মার্জ করা
  const mergedAlerts: Alert[] = [
    ...frontendAlerts,
    ...backendAlerts.map((ba, idx) => ({
      id: `backend-${idx}`,
      type: 'backend_alert' as any,
      message: `${ba.device}: ${ba.info}`,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: ba.type === 'After Hours' ? 'warning' as const : 'error' as const,
    }))
  ];

  // 🆕 যদি কোনো অ্যালার্ট থাকে এবং AI সামারি আছে তাহলে সেটা টপে দেখাবে
  const alerts = mergedAlerts;

  const formattedTimeStr = isRealTime
    ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} ${currentHour >= 12 ? 'PM' : 'AM'}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col h-full">
      {/* Dynamic Background Glow when alerts exist */}
      {alerts.length > 0 && (
        <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/60 pb-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${alerts.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            Active Security Alerts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isDemoMode ? 'Local rule-based calculations' : 'Backend + AI-powered analysis'}
          </p>
          {/* 🆕 AI সামারি দেখানো হচ্ছে */}
          {aiSummary && alerts.length > 0 && (
            <p className="text-xs text-indigo-300 mt-2 bg-indigo-950/30 p-2 rounded border border-indigo-500/20">
              🤖 <strong>AI Analysis:</strong> {aiSummary}
            </p>
          )}
        </div>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800/80 shrink-0">
          Clock: <span className="text-amber-400 font-semibold">{formattedTimeStr}</span>
        </div>
      </div>

      {/* Alerts Content */}
      <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-3 scrollbar-thin">
        {alerts.length === 0 ? (
          /* Nominal State card */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center bg-slate-950/20 border border-slate-800/40 rounded-xl"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3 ring-4 ring-emerald-500/5">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">All Systems Nominal</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
              No rule infractions detected. Electrical load limits are within safe thresholds.
            </p>
          </motion.div>
        ) : (
          /* Interactive Alerts List */
          <AnimatePresence initial={false}>
            {alerts.map((alert, index) => {
              const isError = alert.severity === 'error';
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border relative overflow-hidden ${
                    isError
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  }`}
                >
                  {/* Left accent bar */}
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${
                      isError ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />

                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isError ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {isError ? (
                      <ShieldAlert className="w-4 h-4 animate-bounce" />
                    ) : (
                      <Clock className="w-4 h-4 animate-pulse" />
                    )}
                  </div>

                  {/* Message body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isError ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        {isError ? 'CRITICAL ABUSE' : 'SHIFT OVERTIME'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {alert.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Rules Legend */}
      <div className="mt-4 pt-4 border-t border-slate-800/40 text-[10px] text-slate-500 flex flex-col gap-1.5 font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Rule 1: Warning if any device is active outside 9 AM – 5 PM.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Rule 2: Danger if a room has had all 5 devices ON continuously for &gt; 2h.</span>
        </div>
      </div>
    </div>
  );
}
