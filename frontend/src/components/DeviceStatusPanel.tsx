import { Device, getRoomLabel, ROOM_LABELS, RoomType } from '../types';
import { Fan, Lightbulb, Power, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface DeviceStatusPanelProps {
  devices: Device[];
  onToggleDevice: (deviceId: string, currentStatus: boolean) => void;
}

export default function DeviceStatusPanel({ devices, onToggleDevice }: DeviceStatusPanelProps) {
  const [selectedRoom, setSelectedRoom] = useState<RoomType | 'all'>('all');

  // Helper to format date
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  const rooms: RoomType[] = ['drawing_room', 'work1', 'work2'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Device Controller
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Click any device card to toggle status</p>
        </div>

        {/* Room Filter Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setSelectedRoom('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              selectedRoom === 'all'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Rooms
          </button>
          {rooms.map((roomKey) => (
            <button
              key={roomKey}
              onClick={() => setSelectedRoom(roomKey)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                selectedRoom === roomKey
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {getRoomLabel(roomKey).replace(' Room', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid grouped by rooms */}
      <div className="space-y-6 flex-1 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin">
        {rooms
          .filter((room) => selectedRoom === 'all' || selectedRoom === room)
          .map((roomKey) => {
            const roomDevices = devices.filter((d) => d.room === roomKey);

            return (
              <div key={roomKey} className="space-y-3">
                {/* Room Title & Stats */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <h3 className="text-sm font-semibold text-slate-200 tracking-wide">
                    {getRoomLabel(roomKey)}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800/50">
                    {roomDevices.filter((d) => d.status).length}/{roomDevices.length} ON
                  </div>
                </div>

                {/* Device Card Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {roomDevices.map((device) => {
                    const isFan = device.type === 'fan';
                    const isOn = device.status;

                    return (
                      <motion.div
                        key={device.id}
                        layoutId={device.id}
                        onClick={() => onToggleDevice(device.id, device.status)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-300 relative group overflow-hidden ${
                          isOn
                            ? 'bg-slate-800/80 border-emerald-500/50 hover:border-emerald-400 shadow-lg shadow-emerald-950/10'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        {/* Decorative Active Background Glow */}
                        {isOn && (
                          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />
                        )}

                        <div className="flex items-start justify-between gap-2 relative z-10">
                          {/* Device Icon Area */}
                          <div
                            className={`p-2 rounded-lg transition-all duration-300 ${
                              isOn
                                ? 'bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/10'
                                : 'bg-slate-900 text-slate-500'
                            }`}
                          >
                            {isFan ? (
                              <Fan
                                className={`w-4 h-4 ${
                                  isOn ? 'animate-spin' : ''
                                }`}
                                style={{ animationDuration: '2s' }}
                              />
                            ) : (
                              <Lightbulb
                                className={`w-4 h-4 ${
                                  isOn ? 'fill-amber-400 stroke-amber-400 filter drop-shadow-[0_0_3px_rgba(251,191,36,0.6)]' : ''
                                }`}
                              />
                            )}
                          </div>

                          {/* Toggle Switch Visual */}
                          <div
                            className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${
                              isOn ? 'bg-emerald-500' : 'bg-slate-800'
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 transform ${
                                isOn ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Device Info */}
                        <div className="mt-3.5 relative z-10">
                          <h4
                            className={`text-xs font-semibold tracking-tight transition-colors duration-200 ${
                              isOn ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-300'
                            }`}
                          >
                            {device.name}
                          </h4>
                          <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                            <span className={isOn ? 'text-emerald-400/90 font-medium' : 'text-slate-500'}>
                              {device.power_watt}W
                            </span>
                            <span className="text-slate-500">
                              {formatTimeAgo(device.last_changed)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
