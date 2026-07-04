import { DiscordLog } from '../App';
import { MessageSquare, Terminal, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiscordLogsPanelProps {
  logs: DiscordLog[];
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DiscordLogsPanel({ logs, isOpen = false, onClose }: DiscordLogsPanelProps) {
  // টাইমস্ট্যাম্প ফরম্যাট করার জন্য হেল্পার ফাংশন
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--:--';
    }
  };

  // পরিমার্জিত লগস (সর্বশেষ প্রথম)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // মোডাল ওপেন না থাকলে স্ক্রিনে কিছুই দেখাবে না
  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
        
        {/* ব্যাকড্রপ (কালো আবছা স্ক্রিন) - ক্লিক করলে প্যানেল বন্ধ হবে */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* আসল প্যানেল বক্স (স্ক্রিনের ঠিক মাঝখানে থাকবে) */}
        <motion.div
          key="modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.15 }}
          className="relative bg-[#0b1324] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[400px] w-full max-w-lg z-10"
          onClick={(e) => e.stopPropagation()} // এটার ভেতরে ক্লিক করলে যেন বন্ধ না হয়ে যায়
        >
          
          {/* ক্লোজ বাটন (X) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* প্যানেল হেডার */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0 pr-8">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Discord Notification Logs</h3>
                <p className="text-[11px] text-slate-500">
                  {sortedLogs.length > 0 ? `Showing ${sortedLogs.length} latest messages` : 'Live feed from automation bot channel'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-850 hidden sm:flex">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">Bot Active</span>
            </div>
          </div>

          {/* লগ মেসেজ দেখার মেইন বক্স */}
          <div className="flex-1 overflow-y-auto bg-slate-950/80 rounded-xl p-3 border border-slate-850 font-mono text-[11px] leading-relaxed space-y-2 custom-scrollbar">
            {sortedLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-1.5 py-8">
                <Terminal className="w-4 h-4 text-slate-700" />
                <span>No Discord activities streamed yet.</span>
              </div>
            ) : (
              sortedLogs.map((log, idx) => (
                <div
                  key={`${log._id}-${idx}`}
                  className="flex items-start gap-2 border-b border-slate-900/50 pb-1.5 last:border-0"
                >
                  {/* টাইমস্ট্যাম্প */}
                  <span className="text-slate-500 shrink-0 flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    <Clock className="w-3 h-3 text-indigo-400/70" />
                    {formatTime(log.timestamp)}
                  </span>

                  {/* বটের মেসেজ টেক্সট */}
                  <span className="text-slate-300 break-words flex-1">
                    <span className="text-indigo-400 font-bold mr-1">[Discord-Bot]:</span>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}