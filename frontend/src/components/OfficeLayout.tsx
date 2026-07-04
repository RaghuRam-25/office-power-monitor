import { Device, getRoomLabel } from '../types';
import { DeviceWithPosition } from '../data/defaultDevices';
import { Fan, Lightbulb, Compass, Maximize2 } from 'lucide-react';
import { motion } from 'motion/react';

interface OfficeLayoutProps {
  devices: Device[];
  onToggleDevice: (deviceId: string, currentStatus: boolean) => void;
}

export default function OfficeLayout({ devices, onToggleDevice }: OfficeLayoutProps) {
  // Map positions from INITIAL_DEVICES to current state
  // In a real DB flow, we'd map our live devices back to the static positions in INITIAL_DEVICES
  const getPositionedDevices = (): DeviceWithPosition[] => {
    // Standard coordinates from defaultDevices mapped by their room and name
    const coordsMap: Record<string, { x: number; y: number }> = {
      // Drawing room
      'drawing_room-Fan 1': { x: 18, y: 24 },
      'drawing_room-Fan 2': { x: 18, y: 54 },
      'drawing_room-Light 1': { x: 10, y: 15 },
      'drawing_room-Light 2': { x: 26, y: 15 },
      'drawing_room-Light 3': { x: 18, y: 85 },
      // Work room 1
      'work1-Fan 1': { x: 67, y: 20 },
      'work1-Fan 2': { x: 67, y: 36 },
      'work1-Light 1': { x: 48, y: 12 },
      'work1-Light 2': { x: 86, y: 12 },
      'work1-Light 3': { x: 67, y: 44 },
      // Work room 2
      'work2-Fan 1': { x: 67, y: 68 },
      'work2-Fan 2': { x: 67, y: 84 },
      'work2-Light 1': { x: 48, y: 62 },
      'work2-Light 2': { x: 86, y: 62 },
      'work2-Light 3': { x: 67, y: 92 },
    };

    return devices.map((d) => {
      const coordKey = `${d.room}-${d.name}`;
      const coords = coordsMap[coordKey] || { x: 50, y: 50 }; // fallback
      return {
        ...d,
        posX: coords.x,
        posY: coords.y,
      };
    });
  };

  const positionedDevices = getPositionedDevices();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden">
      {/* Blueprint Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #f8fafc 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/60 pb-3 relative z-10">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            Office Blueprint Layout
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Top-down vector CAD visualization</p>
        </div>
        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
          <Maximize2 className="w-3 h-3" />
          <span>Interactive Plan View</span>
        </div>
      </div>

      {/* The Map Floor Plan Container */}
      <div className="relative flex-1 bg-slate-950/80 border border-slate-800 rounded-xl min-h-[360px] md:min-h-[400px] overflow-hidden shadow-inner flex flex-col justify-between">
        
        {/* SVG Walls Layout Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800 stroke-[2] fill-none">
          {/* External Building Outline */}
          <rect x="2%" y="2%" width="96%" height="96%" rx="6" className="stroke-slate-700 stroke-[3]" />

          {/* Division Wall - Vertical line separating Left (Drawing Room) and Right (Work Rooms) */}
          <line x1="36%" y1="2%" x2="36%" y2="98%" />

          {/* Division Wall - Horizontal line separating Work 1 (Top) and Work 2 (Bottom) */}
          <line x1="36%" y1="50%" x2="98%" y2="50%" />

          {/* Architectural Doorways Visual representation */}
          {/* Door into Drawing Room */}
          <path d="M 36,110 A 30,30 0 0,0 36,80" transform="scale(1) translate(0, 0)" className="stroke-slate-800/50 stroke-1" />
          {/* Desk Grid outlines just for visual texture */}
          {/* Drawing room center table */}
          <rect x="13%" y="42%" width="10%" height="16%" rx="4" className="stroke-slate-800/40 fill-slate-900/40" />
          {/* Work room 1 workstation lines */}
          <rect x="46%" y="18%" width="12%" height="14%" rx="2" className="stroke-slate-800/40 fill-slate-900/20" />
          <rect x="72%" y="18%" width="12%" height="14%" rx="2" className="stroke-slate-800/40 fill-slate-900/20" />
          {/* Work room 2 workstation lines */}
          <rect x="46%" y="68%" width="12%" height="14%" rx="2" className="stroke-slate-800/40 fill-slate-900/20" />
          <rect x="72%" y="68%" width="12%" height="14%" rx="2" className="stroke-slate-800/40 fill-slate-900/20" />
        </svg>

        {/* Room Labels (Watermarks) */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Drawing Room watermark (Left) */}
          <div className="absolute left-[18%] top-[50%] -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-[10px] font-mono tracking-widest text-slate-700 uppercase font-bold block mb-1">DRW-01</span>
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Drawing Room</span>
          </div>

          {/* Work Room 1 watermark (Top Right) */}
          <div className="absolute left-[67%] top-[25%] -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-[10px] font-mono tracking-widest text-slate-700 uppercase font-bold block mb-1">WRK-101</span>
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Work Room 1</span>
          </div>

          {/* Work Room 2 watermark (Bottom Right) */}
          <div className="absolute left-[67%] top-[75%] -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-[10px] font-mono tracking-widest text-slate-700 uppercase font-bold block mb-1">WRK-102</span>
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Work Room 2</span>
          </div>
        </div>

        {/* Interactive Device Nodes */}
        <div className="absolute inset-0 z-10">
          {positionedDevices.map((device) => {
            const isFan = device.type === 'fan';
            const isOn = device.status;

            return (
              <div
                key={device.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${device.posX}%`, top: `${device.posY}%` }}
              >
                {/* Device Icon Node */}
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onToggleDevice(device.id, device.status)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 relative focus:outline-none ${
                    isOn
                      ? isFan
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 ring-4 ring-emerald-500/10'
                        : 'bg-amber-500/10 border-amber-400 text-amber-300 ring-4 ring-amber-500/10'
                      : 'bg-slate-900 border-slate-700/60 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  {/* Subtle Lightbeam Glow for Lights */}
                  {!isFan && isOn && (
                    <span className="absolute inset-0 w-full h-full rounded-full animate-ping bg-amber-400/20 pointer-events-none" />
                  )}

                  {isFan ? (
                    <Fan
                      className={`w-5 h-5 ${isOn ? 'animate-spin' : ''}`}
                      style={{ animationDuration: isOn ? '1.2s' : '0s' }}
                    />
                  ) : (
                    <Lightbulb
                      className={`w-5 h-5 ${
                        isOn ? 'fill-amber-400 stroke-amber-400' : ''
                      }`}
                    />
                  )}
                </motion.button>

                {/* Highly Polished Hover Tooltip */}
                <div className="absolute bottom-11 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 border border-slate-700 text-slate-100 text-xs py-2 px-3 rounded-lg shadow-2xl z-20 whitespace-nowrap flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="font-semibold text-slate-200">{device.name}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full font-mono ${
                        isOn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isOn ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between gap-5 font-mono">
                    <span>{getRoomLabel(device.room).replace(' Room', '')}</span>
                    <span className="text-slate-300 font-semibold">{device.power_watt} Watts</span>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blueprint Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-[10px] text-slate-500 font-mono relative z-10 border-t border-slate-800/40 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-amber-400 flex items-center justify-center text-amber-300 bg-amber-500/10">
            <Lightbulb className="w-1.5 h-1.5 fill-amber-300" />
          </div>
          <span>Light Node (Glows when ON)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-emerald-500 flex items-center justify-center text-emerald-400 bg-emerald-500/10">
            <Fan className="w-1.5 h-1.5" />
          </div>
          <span>Fan Node (Rotates when ON)</span>
        </div>
      </div>
    </div>
  );
}
