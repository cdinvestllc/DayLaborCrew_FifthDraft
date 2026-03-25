import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, Briefcase, Zap, Mail, X, Trash2, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_ICON = {
  job_match: { icon: Zap, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
  job_invite: { icon: Mail, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950" },
  job_cancelled: { icon: X, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  job_suspended: { icon: Briefcase, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
  admin_message: { icon: MessageSquare, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
  default: { icon: Bell, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
};

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef(null);
  const pollRef = useRef(null);
  const prevUnreadRef = useRef(0);

  const playChaChing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.07);
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/jobs/notifications/me`);
      const newUnread = res.data.unread || 0;
      if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) playChaChing();
      prevUnreadRef.current = newUnread;
      setNotifications(res.data.notifications || []);
      setUnread(newUnread);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollRef.current);
  }, [user, fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await axios.post(`${API}/jobs/notifications/read-all`);
    setNotifications(n => n.map(x => ({ ...x, read: true })));
    setUnread(0);
  };

  const markRead = async (id) => {
    await axios.post(`${API}/jobs/notifications/${id}/read`);
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/users/notifications/${id}`);
      setNotifications(n => n.filter(x => x.id !== id));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const clearAll = async () => {
    try {
      await axios.delete(`${API}/users/notifications`);
      setNotifications([]);
      setUnread(0);
    } catch {}
  };

  const handleNotifClick = (n) => {
    if (!n.read) markRead(n.id);
    // Navigate to job if match
    if (n.type === "job_match" && n.job_id) {
      setOpen(false);
      navigate(`/crew/dashboard?job=${n.job_id}`);
    } else if (n.type === "admin_message" && n.thread_id) {
      setOpen(false);
      navigate("/profile?tab=messages");
    }
  };

  return (
    <div className="relative" ref={dropdownRef} data-testid="notification-bell">
      <button onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        data-testid="notification-bell-btn" aria-label="Notifications">
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" data-testid="notification-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden" data-testid="notification-dropdown">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0000FF]" />
              <span className="font-bold text-[#050A30] dark:text-white text-sm">Notifications</span>
              {unread > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-[#0000FF] hover:underline font-semibold" data-testid="mark-all-read-btn">
                  <CheckCheck className="w-3.5 h-3.5" /> All read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold" data-testid="clear-all-notif-btn">
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : notifications.map(n => {
              const typeInfo = TYPE_ICON[n.type] || TYPE_ICON.default;
              const Icon = typeInfo.icon;
              return (
                <div key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors group ${n.read ? "opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/50" : "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"}`}
                  data-testid={`notification-item-${n.id}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${typeInfo.bg}`}>
                    <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#050A30] dark:text-white leading-snug">{n.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <button onClick={(e) => deleteNotif(e, n.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity flex-shrink-0 mt-1"
                    data-testid={`delete-notif-${n.id}`} title="Delete notification">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {!n.read && <div className="w-2 h-2 bg-[#0000FF] rounded-full flex-shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400">{notifications.length} total</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
