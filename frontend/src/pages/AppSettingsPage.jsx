import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import axios from "axios";
import { toast } from "sonner";
import {
  Bell, Volume2, Vibrate, Globe, BarChart2, BriefcaseIcon, CheckCircle2, XCircle, ChevronRight, Smartphone, Save
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function ToggleRow({ label, desc, checked, onChange, testId, disabled }) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div>
        <p className="font-semibold text-[#050A30] dark:text-white text-sm">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        data-testid={testId}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-[#0000FF]" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export default function AppSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [settings, setSettings] = useState({
    soundAlerts: true,
    vibrationAlerts: true,
    browserNotifications: false,
    pushNotifications: false,
    notificationsBlocked: false,
    analyticsPrivacy: false,
    notify: {
      jobCompleted: true,
      jobAccepted: true,
      jobAcceptedContractor: true,
      jobDeclined: false,
      jobDeclinedContractor: false
    }
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    axios.get(`${API}/users/preferences`)
      .then(r => setSettings(s => ({ ...s, ...r.data, notify: { ...s.notify, ...(r.data.notify || {}) } })))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Check if notifications are blocked
    if ("Notification" in window && Notification.permission === "denied") {
      setSettings(s => ({ ...s, notificationsBlocked: true, browserNotifications: false, pushNotifications: false }));
    }
  }, [user, navigate]);

  const save = async (updated) => {
    setSaving(true);
    try {
      await axios.put(`${API}/users/preferences`, updated);
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save settings"); }
    setSaving(false);
  };

  const update = (key, val) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    save(updated);
  };

  const updateNotify = (key, val) => {
    const updated = { ...settings, notify: { ...settings.notify, [key]: val } };
    setSettings(updated);
    save(updated);
  };

  const testSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      toast.success("Sound test played!");
    } catch { toast.error("Sound not supported in this browser"); }
  };

  const requestBrowserNotification = async () => {
    if (!("Notification" in window)) { toast.error("Notifications not supported"); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      update("browserNotifications", true);
      toast.success("Browser notifications enabled!");
    } else if (perm === "denied") {
      setSettings(s => ({ ...s, notificationsBlocked: true, browserNotifications: false }));
      toast.error("Notifications blocked in browser settings");
    }
  };

  const requestPushNotification = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { toast.error("Push notifications not supported"); return; }
    try {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      await axios.post(`${API}/users/push/subscribe`, sub.toJSON());
      update("pushNotifications", true);
      toast.success("Push notifications enabled!");
    } catch (e) { toast.error("Could not subscribe to push: " + e.message); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617]">
      <Navbar />
      <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0000FF]" /></div>
    </div>
  );

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#050A30] dark:text-white mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>App Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your notification and privacy preferences</p>
        </div>

        {/* Sound Alerts */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-[#0000FF]" />
            <h2 className="font-bold text-[#050A30] dark:text-white" style={{ fontFamily: "Manrope, sans-serif" }}>Sound</h2>
          </div>
          <ToggleRow
            label="Sound Alerts"
            desc="Play a notification sound for new jobs and messages"
            checked={settings.soundAlerts}
            onChange={v => update("soundAlerts", v)}
            testId="toggle-sound-alerts" />
          {settings.soundAlerts && (
            <button onClick={testSound}
              className="mt-3 w-full border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              data-testid="test-sound-btn">
              Test Sound
            </button>
          )}
        </div>

        {/* Vibration */}
        {isMobile && (
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-[#0000FF]" />
              <h2 className="font-bold text-[#050A30] dark:text-white" style={{ fontFamily: "Manrope, sans-serif" }}>Vibration</h2>
            </div>
            <ToggleRow
              label="Vibration Alerts"
              desc="Vibrate device for notifications (mobile only)"
              checked={settings.vibrationAlerts}
              onChange={v => update("vibrationAlerts", v)}
              testId="toggle-vibration-alerts" />
          </div>
        )}

        {/* Notifications */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[#0000FF]" />
            <h2 className="font-bold text-[#050A30] dark:text-white" style={{ fontFamily: "Manrope, sans-serif" }}>Notifications</h2>
            {settings.notificationsBlocked && (
              <span className="ml-auto flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3 h-3" /> Blocked in browser</span>
            )}
          </div>

          <ToggleRow
            label="Browser Notifications"
            desc="Standard web notifications via browser"
            checked={settings.browserNotifications}
            onChange={async (v) => {
              if (v) await requestBrowserNotification();
              else update("browserNotifications", false);
            }}
            disabled={settings.notificationsBlocked}
            testId="toggle-browser-notifications" />

          <ToggleRow
            label="Push Notifications"
            desc="Server-sent push via Service Worker"
            checked={settings.pushNotifications}
            onChange={async (v) => {
              if (v) await requestPushNotification();
              else update("pushNotifications", false);
            }}
            disabled={settings.notificationsBlocked}
            testId="toggle-push-notifications" />
        </div>

        {/* Alert Types */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <BriefcaseIcon className="w-5 h-5 text-[#0000FF]" />
            <h2 className="font-bold text-[#050A30] dark:text-white" style={{ fontFamily: "Manrope, sans-serif" }}>Alert Types</h2>
          </div>

          <ToggleRow
            label="Job Completed"
            desc="Get notified when a crew member marks a job as complete."
            checked={settings.notify?.jobCompleted}
            onChange={v => updateNotify("jobCompleted", v)}
            testId="toggle-notify-job-completed" />

          {user?.role === "crew" && (
            <ToggleRow
              label="Job Accepted"
              desc="Notify when a contractor accepts your application."
              checked={settings.notify?.jobAccepted}
              onChange={v => updateNotify("jobAccepted", v)}
              testId="toggle-notify-job-accepted" />
          )}

          {user?.role === "contractor" && (
            <ToggleRow
              label="Job Accepted by Crew"
              desc="Notify when a crew member accepts your job offer."
              checked={settings.notify?.jobAcceptedContractor}
              onChange={v => updateNotify("jobAcceptedContractor", v)}
              testId="toggle-notify-job-accepted-contractor" />
          )}

          {user?.role === "crew" && (
            <ToggleRow
              label="Job Declined"
              desc="Notify when your application is declined."
              checked={settings.notify?.jobDeclined}
              onChange={v => updateNotify("jobDeclined", v)}
              testId="toggle-notify-job-declined" />
          )}

          {user?.role === "contractor" && (
            <ToggleRow
              label="Job Declined by Crew"
              desc="Notify when a crew member declines your offer."
              checked={settings.notify?.jobDeclinedContractor}
              onChange={v => updateNotify("jobDeclinedContractor", v)}
              testId="toggle-notify-job-declined-contractor" />
          )}
        </div>

        {/* Usage Analytics */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-[#0000FF]" />
            <h2 className="font-bold text-[#050A30] dark:text-white" style={{ fontFamily: "Manrope, sans-serif" }}>Privacy & Analytics</h2>
          </div>

          <ToggleRow
            label="Share Usage Data"
            desc="Allow anonymous analytics to help improve the platform. No personal data is shared."
            checked={settings.analyticsPrivacy}
            onChange={v => update("analyticsPrivacy", v)}
            testId="toggle-analytics-privacy" />
        </div>

        <p className="text-xs text-center text-slate-400 mt-4">Changes are saved automatically.</p>
      </div>
    </div>
  );
}
