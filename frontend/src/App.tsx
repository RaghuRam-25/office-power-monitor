import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Device } from './types';
import { INITIAL_DEVICES } from './data/defaultDevices';
import PowerMeter from './components/PowerMeter';
import DeviceStatusPanel from './components/DeviceStatusPanel';
import AlertsPanel from './components/AlertsPanel';
import OfficeLayout from './components/OfficeLayout';
import DiscordLogsPanel from './components/DiscordLogsPanel';
import { 
  Settings, 
  Database, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Github,
  Monitor,
  MessageSquare 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

export interface AlertPayload {
  type: string;
  device: string;
  info: string;
}

export interface DiscordLog {
  _id: string;
  message: string;
  timestamp: string;
}

// ডিসকোর্ড লগ ফরম্যাট ঠিক করার জন্য নরমালটেইজার
const normalizeDiscordLog = (log: any): DiscordLog => {
  return {
    _id: String(log?._id ?? log?.id ?? Math.random().toString(36).substr(2, 9)),
    message: String(log?.message ?? log?.text ?? log?.content ?? 'Unknown automation event'),
    timestamp: String(log?.timestamp ?? log?.createdAt ?? log?.date ?? new Date().toISOString())
  };
};

const normalizeDevicePayload = (device: any): Device => {
  const rawStatus = device?.status;
  const status = typeof rawStatus === 'boolean'
    ? rawStatus
    : typeof rawStatus === 'string'
      ? rawStatus.toLowerCase() === 'on' || rawStatus.toLowerCase() === 'true'
      : Boolean(rawStatus);

  const normalizedRoom = typeof device?.room === 'string' ? device.room.toLowerCase() : '';
  const room = normalizedRoom.includes('drawing')
    ? 'drawing_room'
    : normalizedRoom.includes('work') && normalizedRoom.includes('2')
      ? 'work2'
      : normalizedRoom.includes('work') && normalizedRoom.includes('1')
        ? 'work1'
        : 'drawing_room';

  return {
    id: String(device?.id ?? device?.deviceId ?? device?._id ?? device?.device_id ?? ''),
    name: String(device?.name ?? 'Unnamed Device'),
    type: device?.type === 'fan' || /fan/i.test(device?.name ?? '') ? 'fan' : 'light',
    room,
    status,
    power_watt: Number(device?.power_watt ?? device?.powerDraw ?? device?.power ?? 0),
    last_changed: String(device?.last_changed ?? device?.lastChanged ?? new Date().toISOString()),
  };
};

export default function App() {
  // Application State
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isSimulatingTicks, setIsSimulatingTicks] = useState<boolean>(true);
  const [useRealTimeClock, setUseRealTimeClock] = useState<boolean>(true);
  const [simulatedHour, setSimulatedHour] = useState<number>(10);
  const [simulatedMinute, setSimulatedMinute] = useState<number>(0);
  const [dbMessage, setDbMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({
    text: '',
    type: null
  });

  const [backendAlerts, setBackendAlerts] = useState<AlertPayload[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [discordLogs, setDiscordLogs] = useState<DiscordLog[]>([]);
  
  // ফিক্স: মোডাল ওপেন/ক্লোজ স্টেট
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);

  // Clock references
  const [systemHour, setSystemHour] = useState<number>(new Date().getHours());
  const [systemMinute, setSystemMinute] = useState<number>(new Date().getMinutes());

  // Real-time Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemHour(now.getHours());
      setSystemMinute(now.getMinutes());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = useRealTimeClock ? systemHour : simulatedHour;
  const currentMinute = useRealTimeClock ? systemMinute : simulatedMinute;
  const isOutsideHours = currentHour < 9 || currentHour >= 17;

  // Fetch initial devices & Discord logs from backend
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/devices`);
      if (backendRes.ok) {
        const data = await backendRes.json();
        const normalizedDevices = Array.isArray(data) ? data.map((item: any) => normalizeDevicePayload(item)) : [];

        setDevices(normalizedDevices);
        setBackendConnected(true);
        setDbMessage({ text: 'Connected to the Node.js backend successfully.', type: 'success' });
        setIsDemoMode(false);

        try {
          const logRes = await fetch(`${BACKEND_URL}/api/discord-logs`);
          if (logRes.ok) {
            const logsData = await logRes.json();
            if (Array.isArray(logsData)) {
              setDiscordLogs(logsData.map(log => normalizeDiscordLog(log)));
            }
          }
        } catch (logErr) {
          console.error("Failed to fetch Discord logs:", logErr);
        }

        return;
      }
      throw new Error('Backend returned a non-OK response');
    } catch (backendErr: any) {
      console.warn('Backend unavailable, trying Supabase fallback:', backendErr);

      if (supabase && isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('devices')
            .select('*')
            .order('room', { ascending: true })
            .order('name', { ascending: true });

          if (error) throw error;

          if (data && data.length > 0) {
            const normalizedDevices = data.map((item: any) => normalizeDevicePayload(item));
            setDevices(normalizedDevices);
            setBackendConnected(false);
            setDbMessage({ text: 'Loaded devices from Supabase.', type: 'success' });
          } else {
            setDevices([]);
            setDbMessage({
              text: 'Table "devices" is empty. Click "Seed Database" below to create the 15 devices.',
              type: 'info'
            });
          }
        } catch (supabaseErr: any) {
          console.error('Error fetching devices from Supabase:', supabaseErr);
          setDevices(INITIAL_DEVICES);
          setBackendConnected(false);
          setDbMessage({
            text: `Backend unavailable and Supabase is not ready. Showing demo data.`,
            type: 'error'
          });
          setIsDemoMode(true);
        }
      } else {
        setDevices(INITIAL_DEVICES);
        setBackendConnected(false);
        setDbMessage({
          text: 'Backend not reachable. Showing demo data until the server is running.',
          type: 'error'
        });
        setIsDemoMode(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!supabase) return;
    setIsLoading(true);
    setDbMessage({ text: 'Seeding database...', type: 'info' });
    try {
      const { error: deleteError } = await supabase
        .from('devices')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      const seedPayloads = INITIAL_DEVICES.map(({ id, name, type, room, status, power_watt }) => ({
        id,
        name,
        type,
        room,
        status,
        power_watt,
        last_changed: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('devices')
        .insert(seedPayloads);

      if (insertError) throw insertError;

      setDbMessage({ text: 'Successfully seeded 15 devices into your Supabase database!', type: 'success' });
      await fetchDevices();
    } catch (err: any) {
      console.error('Seeding error:', err);
      setDbMessage({ text: `Seeding failed: ${err.message}`, type: 'error' });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      setDevices(INITIAL_DEVICES);
      setIsLoading(false);
      return;
    }
    fetchDevices();
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode || !backendConnected) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ Socket.io connected to backend');
    });

    socket.on('deviceUpdate', (updatedDevice: any) => {
      const normalizedDevice = normalizeDevicePayload(updatedDevice);
      setDevices((prev) =>
        prev.map((device) => (device.id === normalizedDevice.id ? normalizedDevice : device))
      );
    });

    socket.on('newAlerts', (data: { alerts: AlertPayload[]; aiSummary: string }) => {
      setBackendAlerts(data.alerts);
      setAiSummary(data.aiSummary);
    });

    const handleIncomingDiscordLog = (rawLog: any) => {
      console.log('💬 Received Discord log payload via Socket:', rawLog);
      const readyLog = normalizeDiscordLog(rawLog);
      
      setDiscordLogs((prev) => {
        const isDuplicate = prev.some(log => log._id === readyLog._id);
        if (isDuplicate) return prev;
        return [readyLog, ...prev].slice(0, 15);
      });
    };

    socket.on('newDiscordLog', handleIncomingDiscordLog);
    socket.on('discordLog', handleIncomingDiscordLog);
    socket.on('discord-log', handleIncomingDiscordLog);

    return () => {
      socket.off('newDiscordLog', handleIncomingDiscordLog);
      socket.off('discordLog', handleIncomingDiscordLog);
      socket.off('discord-log', handleIncomingDiscordLog);
      socket.disconnect();
    };
  }, [isDemoMode, backendConnected]);

  useEffect(() => {
    if (isDemoMode || !supabase || !isSupabaseConfigured) return;

    const channel = supabase
      .channel('devices-live-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedDevice = normalizeDevicePayload(payload.new as Device);
            setDevices((prev) => prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d)));
          } else if (payload.eventType === 'INSERT') {
            const newDevice = normalizeDevicePayload(payload.new as Device);
            setDevices((prev) => prev.some((d) => d.id === newDevice.id) ? prev : [...prev, newDevice]);
          } else if (payload.eventType === 'DELETE') {
            setDevices((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode]);

  const handleToggleDevice = async (deviceId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const nowIso = new Date().toISOString();

    setDevices((prev) =>
      prev.map((d) => d.id === deviceId ? { ...d, status: nextStatus, last_changed: nowIso } : d)
    );

    if (isDemoMode) return;

    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (backendRes.ok) return;
      throw new Error('Backend toggle failed');
    } catch (backendErr: any) {
      if (supabase && isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('devices')
            .update({ status: nextStatus, last_changed: nowIso })
            .eq('id', deviceId);

          if (error) throw error;
        } catch (supabaseErr: any) {
          setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, status: currentStatus } : d));
        }
      }
    }
  };

  useEffect(() => {
    if (!isDemoMode || !isSimulatingTicks) return;
    const interval = setInterval(() => {
      setDevices((prev) => {
        if (prev.length === 0) return prev;
        const randomIndex = Math.floor(Math.random() * prev.length);
        return prev.map((d, i) => i === randomIndex ? { ...d, status: !d.status, last_changed: new Date().toISOString() } : d);
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [isDemoMode, isSimulatingTicks]);

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-md">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-100">Office Power Monitor</h1>
                <span className="text-[10px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-full border border-slate-700">v1.2</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real-time architectural load & compliance dashboard</p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-3">
            {/* ফিক্সড ক্লিক বাটন */}
            <button
              type="button"
              onClick={() => {
                console.log('Opening Discord panel... current state:', isDiscordModalOpen);
                setIsDiscordModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white px-4 py-2 rounded-xl border border-indigo-500/30 text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Discord Logs ({discordLogs.length})</span>
            </button>

            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium ${
              isDemoMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-ping'}`} />
              <span>{isDemoMode ? 'Simulated Demo Mode' : backendConnected ? 'Connected to Node.js backend' : 'Connected to Supabase'}</span>
            </div>

            <button
              onClick={() => {
                if (!isSupabaseConfigured && isDemoMode) {
                  setDbMessage({ text: 'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.', type: 'error' });
                  return;
                }
                setIsDemoMode(!isDemoMode);
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold transition-all duration-200 shadow-sm"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Switch to {isDemoMode ? 'Supabase' : 'Demo'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* Database Warning Banner */}
        <AnimatePresence>
          {dbMessage.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                dbMessage.type === 'success' ? 'bg-emerald-950/15 border-emerald-500/25 text-emerald-300' : dbMessage.type === 'error' ? 'bg-rose-950/15 border-rose-500/25 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {dbMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                <span>{dbMessage.text}</span>
              </div>
              <button onClick={() => setDbMessage({ text: '', type: null })} className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulation Clock Controller */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Simulation Clock Controller</h3>
                </div>
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button onClick={() => setUseRealTimeClock(true)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${useRealTimeClock ? 'bg-slate-800 text-amber-400' : 'text-slate-400'}`}>REAL TIME</button>
                  <button onClick={() => setUseRealTimeClock(false)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${!useRealTimeClock ? 'bg-slate-800 text-amber-400' : 'text-slate-400'}`}>CUSTOM SLIDER</button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Shift Timer: 12:00 AM</span>
                  <span className="text-amber-300 font-bold">Active Target: {String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')} {currentHour >= 12 ? 'PM' : 'AM'}{isOutsideHours && ' (OFF-HOURS)'}</span>
                  <span>11:59 PM</span>
                </div>
                <input type="range" min="0" max="23" disabled={useRealTimeClock} value={simulatedHour} onChange={(e) => { setSimulatedHour(parseInt(e.target.value)); setSimulatedMinute(0); }} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-950 ${useRealTimeClock ? 'opacity-40 cursor-not-allowed' : 'accent-amber-400'}`} />
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col sm:flex-row gap-3 md:justify-end">
              {isDemoMode ? (
                <div className="flex flex-col gap-2 w-full sm:max-w-[240px]">
                  <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Demo Ticker state</span>
                  <button onClick={() => setIsSimulatingTicks(!isSimulatingTicks)} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all ${isSimulatingTicks ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/15' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'}`}>
                    {isSimulatingTicks ? (<><Pause className="w-3.5 h-3.5" /><span>Freeze Auto Ticks</span></>) : (<><Play className="w-3.5 h-3.5" /><span>Run Auto Ticks</span></>)}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full md:items-end">
                  <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Database Commands</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={fetchDevices} disabled={isLoading} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /><span>Sync Now</span></button>
                    <button onClick={handleSeedDatabase} disabled={isLoading} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/20 transition-all"> <Database className="w-3.5 h-3.5" /><span>Seed DB Table</span></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            <div className="w-full"><PowerMeter devices={devices} /></div>
            <div className="w-full"><OfficeLayout devices={devices} onToggleDevice={handleToggleDevice} /></div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            <div className="w-full">
              <AlertsPanel devices={devices} currentHour={currentHour} currentMinute={currentMinute} isRealTime={useRealTimeClock} backendAlerts={backendAlerts} aiSummary={aiSummary} isDemoMode={isDemoMode} />
            </div>
            <div className="w-full">
              <DeviceStatusPanel devices={devices} onToggleDevice={handleToggleDevice} />
            </div>
          </div>
        </div>

      </main>

      {/* Footer Bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950/50 py-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Office Power Monitor. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Server Status: <span className={backendConnected ? "text-emerald-400" : "text-amber-400"}>{backendConnected ? 'Online' : 'Offline'}</span></span>
            <span>Ingress Port: <span className="text-slate-400">3000</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}