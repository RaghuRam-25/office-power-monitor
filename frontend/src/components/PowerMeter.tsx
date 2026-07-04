import { Device, getRoomLabel, ROOM_LABELS, RoomType } from '../types';
import { Zap, Activity, BatteryCharging } from 'lucide-react';
import { motion } from 'motion/react';

interface PowerMeterProps {
  devices: Device[];
}

export default function PowerMeter({ devices }: PowerMeterProps) {
  // Calculate total power
  const activeDevices = devices.filter((d) => d.status);
  const totalPower = activeDevices.reduce((sum, d) => sum + d.power_watt, 0);

  // Maximum power if all 18 devices were ON
  // 3 rooms * (2 fans * 60W + 4 lights * 15W) = 3 * (120 + 60) = 540W
  const maxOfficePower = devices.reduce((sum, d) => sum + d.power_watt, 0) || 540;

  // Group by room
  const powerByRoom: Record<RoomType, number> = {
    drawing_room: 0,
    work1: 0,
    work2: 0,
  };

  const maxPowerByRoom: Record<RoomType, number> = {
    drawing_room: 0,
    work1: 0,
    work2: 0,
  };

  devices.forEach((d) => {
    maxPowerByRoom[d.room] += d.power_watt;
    if (d.status) {
      powerByRoom[d.room] += d.power_watt;
    }
  });

  const percentageOfMax = Math.round((totalPower / maxOfficePower) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col h-full">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            Live Power Meter
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time electricity consumption</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-medium">LIVE</span>
        </div>
      </div>

      {/* Main Meter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-1">
        {/* Total Circular Progress */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Arc Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Glowing Active Arc */}
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-emerald-500"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * percentageOfMax) / 100 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                strokeLinecap="round"
                style={{ filter: totalPower > 0 ? 'drop-shadow(0 0 4px rgba(16,185,129,0.3))' : 'none' }}
              />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-slate-400 font-medium">Total Load</span>
              <motion.span 
                key={totalPower}
                initial={{ scale: 0.9, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold font-mono text-slate-100 tracking-tight"
              >
                {totalPower}
              </motion.span>
              <span className="text-[10px] text-slate-400 font-mono">/ {maxOfficePower} W</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 justify-center">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>{percentageOfMax}% utilization</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {activeDevices.length} of {devices.length} devices currently active
            </p>
          </div>
        </div>

        {/* Room Breakdown Progress Bars */}
        <div className="md:col-span-7 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            Room Consumption
          </h3>

          {(Object.keys(ROOM_LABELS) as RoomType[]).map((roomKey) => {
            const roomPower = powerByRoom[roomKey];
            const roomMax = maxPowerByRoom[roomKey] || 180;
            const roomPercent = Math.round((roomPower / roomMax) * 100);

            // Set color based on room status
            const barColor = 
              roomPercent > 70 
                ? 'bg-amber-500 shadow-amber-500/20' 
                : roomPercent > 0 
                ? 'bg-emerald-500 shadow-emerald-500/20' 
                : 'bg-slate-700';

            return (
              <div key={roomKey} className="space-y-1 bg-slate-950/20 p-3 rounded-lg border border-slate-800/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-200 font-medium">{getRoomLabel(roomKey)}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-100 font-semibold">{roomPower} W</span>
                    <span className="text-slate-500 text-[10px]">/ {roomMax}W</span>
                  </div>
                </div>

                <div className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`absolute top-0 left-0 h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${roomPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>{devices.filter(d => d.room === roomKey && d.status).length} devices active</span>
                  <span>{roomPercent}% capacity</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
