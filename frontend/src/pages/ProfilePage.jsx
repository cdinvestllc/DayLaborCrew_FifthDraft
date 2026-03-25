import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import { toast } from "sonner";
import axios from "axios";
import { Camera, Star, Gift, Copy, Check, Edit2, Save, MapPin, Phone, Briefcase, User, Plus, X, Image, MessageSquare, Shield } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GEOAPIFY_KEY = process.env.REACT_APP_GEOAPIFY_KEY || "02cb3a68d60c4ca49d7dde0c4d7811bf";

const TRADES = ["Carpentry", "Electrical", "Plumbing", "Painting", "Landscaping", "Masonry", "HVAC", "Roofing", "Drywall", "General Labor", "Demolition", "Concrete"];

const ALL_SKILLS = ["Framing", "Drywall", "Painting", "Flooring", "Roofing", "Electrical Work", "Plumbing", "Landscaping", "Concrete", "Welding", "HVAC", "Demolition", "Tile Setting", "Cabinetry", "Deck Building"];

function AddressAutocomplete({ value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&filter=countrycode:us&format=json&apiKey=${GEOAPIFY_KEY}`);
      const data = await res.json();
      setSuggestions((data.results || []).slice(0, 5));
      setShow(true);
    } catch {}
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(e.target.value), 300);
  };

  const handleSelect = (item) => {
    onChange(item.formatted);
    onSelect({ address: item.formatted, lat: item.lat, lng: item.lon });
    setSuggestions([]);
    setShow(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          placeholder="Enter your address..."
          className="w-full pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
          data-testid="address-input"
        />
      </div>
      {show && suggestions.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onMouseDown={() => handleSelect(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {s.formatted}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MessagesPanel({ user }) {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`${API}/users/messages`).then(r => setThreads(r.data)).catch(() => {});
  }, []);

  const openThread = async (thread) => {
    const res = await axios.get(`${API}/users/messages/${thread.thread_id}`);
    setActiveThread(res.data);
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/users/messages/${activeThread.thread_id}/reply`, { body: replyText });
      setReplyText("");
      const res = await axios.get(`${API}/users/messages/${activeThread.thread_id}`);
      setActiveThread(res.data);
    } catch { toast.error("Failed to send reply"); }
    setSending(false);
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold text-[#050A30] dark:text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Manrope, sans-serif" }}>
        <MessageSquare className="w-5 h-5 text-[#0000FF]" /> Admin Messages
      </h3>
      {!activeThread ? (
        threads.length === 0 ? (
          <p className="text-slate-400 text-sm">No messages from admin yet.</p>
        ) : (
          <div className="space-y-2">
            {threads.map(t => (
              <button key={t.thread_id} onClick={() => openThread(t)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${!t.read ? "border-[#0000FF] bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"} hover:bg-slate-50 dark:hover:bg-slate-800`}>
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-sm text-[#050A30] dark:text-white">{t.subject}</p>
                  {!t.read && <span className="w-2 h-2 rounded-full bg-[#0000FF] mt-1 flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">{t.body}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(t.created_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        )
      ) : (
        <div>
          <button onClick={() => setActiveThread(null)} className="text-[#0000FF] text-sm font-semibold mb-4 flex items-center gap-1">← Back</button>
          <h4 className="font-bold text-[#050A30] dark:text-white mb-3">{activeThread.subject}</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-xs text-slate-500 font-semibold mb-1">Admin — {new Date(activeThread.created_at).toLocaleString()}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{activeThread.body}</p>
            </div>
            {(activeThread.replies || []).map(r => (
              <div key={r.id} className={`p-3 rounded-xl ${r.sender_id === user?.id ? "bg-slate-100 dark:bg-slate-800 ml-4" : "bg-blue-50 dark:bg-blue-950"}`}>
                <p className="text-xs text-slate-500 font-semibold mb-1">{r.sender_name} — {new Date(r.created_at).toLocaleString()}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{r.body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              onKeyDown={e => e.key === "Enter" && sendReply()}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
              data-testid="message-reply-input" />
            <button onClick={sendReply} disabled={sending}
              className="bg-[#0000FF] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              data-testid="send-reply-btn">
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [ratings, setRatings] = useState([]);
  const [referralInfo, setReferralInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [privacy, setPrivacy] = useState({});
  const fileRef = useRef(null);
  const portfolioRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        bio: user.bio || "",
        trade: user.trade || "",
        skills: user.skills || [],
        company_name: user.company_name || "",
        availability: user.availability !== false,
        address: user.address || "",
        lat: user.lat || null,
        lng: user.lng || null,
      });
      setPortfolio(user.portfolio || []);
      setPrivacy(user.privacy || {});
      fetchReferralInfo();
      fetchRatings();
    }
  }, [user]);

  const fetchRatings = async () => {
    try {
      const myJobs = await axios.get(`${API}/jobs/my-jobs`);
      const completedJobs = (myJobs.data || []).filter(j => j.status === "completed");
      if (completedJobs.length > 0) {
        const ratingRes = await axios.get(`${API}/jobs/${completedJobs[0].id}/ratings`);
        setRatings(ratingRes.data.filter(r => r.rated_id === user?.id) || []);
      }
    } catch { }
  };

  const fetchReferralInfo = async () => {
    try {
      const res = await axios.get(`${API}/users/referral/info`);
      setReferralInfo(res.data);
    } catch { }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`${API}/users/profile`, form);
      updateUser(res.data);
      setEditing(false);
      toast.success("Profile updated!");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(`${API}/users/upload-photo`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      updateUser({ profile_photo: res.data.url, logo: res.data.url });
      toast.success("Photo updated!");
      await refreshUser();
    } catch {
      toast.error("Failed to upload photo");
    }
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (portfolio.length + files.length > 8) {
      toast.error("Maximum 8 portfolio images allowed");
      return;
    }
    setPortfolioUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      const res = await axios.post(`${API}/users/upload-portfolio`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const newUrls = res.data.urls || [];
      const updated = [...portfolio, ...newUrls];
      setPortfolio(updated);
      await axios.put(`${API}/users/profile`, { ...form, portfolio: updated });
      updateUser({ portfolio: updated });
      toast.success("Portfolio updated!");
    } catch {
      toast.error("Failed to upload images");
    }
    setPortfolioUploading(false);
  };

  const removePortfolioImage = async (url) => {
    const updated = portfolio.filter(u => u !== url);
    setPortfolio(updated);
    await axios.put(`${API}/users/profile`, { ...form, portfolio: updated });
    updateUser({ portfolio: updated });
    toast.success("Image removed");
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(user?.referral_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Referral code copied!");
  };

  const updatePrivacy = async (key, value) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    try {
      await axios.put(`${API}/users/privacy`, updated);
    } catch { }
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Profile link copied!");
    });
  };

  const addSkill = (skill) => {
    if (!form.skills.includes(skill)) {
      setForm(f => ({ ...f, skills: [...f.skills, skill] }));
    }
  };

  const removeSkill = (skill) => {
    setForm(f => ({ ...f, skills: f.skills.filter(s => s !== skill) }));
  };

  const profilePhoto = user?.profile_photo || user?.logo;
  const profileCompletion = (() => {
    if (!user) return 0;
    const fields = ["name", "phone", "bio", "trade"];
    const filled = fields.filter(f => user[f]).length;
    const hasSkills = user.skills?.length > 0 ? 1 : 0;
    const hasPhoto = profilePhoto ? 1 : 0;
    return Math.round(((filled + hasSkills + hasPhoto) / 6) * 100);
  })();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Profile Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-6 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[#050A30] flex items-center justify-center mx-auto border-4 border-[#7EC8E3]">
                  {profilePhoto ? (
                    <img src={`${process.env.REACT_APP_BACKEND_URL}${profilePhoto}`} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-extrabold">{user?.name?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#0000FF] rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700"
                  data-testid="upload-photo-btn"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <h2 className="font-extrabold text-[#050A30] dark:text-white text-xl" style={{ fontFamily: "Manrope, sans-serif" }}>{user?.name}</h2>
              <p className="text-slate-500 text-sm capitalize">{user?.trade || user?.company_name || user?.role}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#050A30] text-white text-xs rounded-full font-bold capitalize">{user?.role}</span>

              <div className="flex items-center justify-center gap-1 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(user?.rating || 0) ? "text-amber-400 fill-current" : "text-slate-300"}`} />
                ))}
                <span className="text-sm text-slate-500 ml-1">({user?.rating_count || 0})</span>
              </div>

              <button onClick={shareProfile}
                className="mt-2 flex items-center gap-1.5 text-xs text-[#0000FF] font-semibold hover:underline"
                data-testid="share-profile-btn">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Share Profile"}
              </button>

              {/* Profile Completion */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Profile Completion</span>
                  <span className="font-semibold text-[#0000FF]">{profileCompletion}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-[#0000FF] h-2 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2">
                  <div className="text-xl font-extrabold text-[#0000FF]">{user?.jobs_completed || 0}</div>
                  <div className="text-xs text-slate-500">Jobs Done</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-2">
                  <div className="text-xl font-extrabold text-amber-500">{user?.points || 0}</div>
                  <div className="text-xs text-slate-500">Points</div>
                </div>
              </div>

              {user?.availability !== undefined && (
                <div className="mt-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <span className="text-sm font-semibold text-[#050A30] dark:text-white">Available</span>
                  <div
                    className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${user.availability ? "bg-emerald-500" : "bg-slate-300"}`}
                    onClick={async () => {
                      const newVal = !user.availability;
                      await axios.put(`${API}/users/profile`, { availability: newVal });
                      updateUser({ availability: newVal });
                    }}
                    data-testid="availability-toggle"
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${user.availability ? "translate-x-6" : ""}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Referral Card */}
            {referralInfo && (
              <div className="card p-4 bg-gradient-to-br from-[#050A30] to-[#000C66]">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-[#7EC8E3]" />
                  <h3 className="font-bold text-white text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Referral Program</h3>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between mb-2">
                  <span className="text-[#7EC8E3] font-mono font-bold">{user?.referral_code}</span>
                  <button onClick={copyReferral} className="text-white p-1" data-testid="copy-referral-btn">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-slate-300 text-xs">{referralInfo.total_referrals} referrals · {referralInfo.points} points</p>
              </div>
            )}
          </div>

          {/* Right - Edit Profile */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-[#050A30] dark:text-white text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>Profile Information</h3>
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-500">Cancel</button>
                    <button onClick={saveProfile} disabled={loading} className="px-3 py-1.5 bg-[#0000FF] text-white rounded-lg text-sm font-semibold flex items-center gap-1 hover:bg-blue-700" data-testid="save-profile-btn">
                      <Save className="w-4 h-4" /> {loading ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 border border-[#0000FF] text-[#0000FF] rounded-lg text-sm font-semibold hover:bg-blue-50" data-testid="edit-profile-btn">
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1">Full Name</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                        data-testid="profile-name-input" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1">Phone</label>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                        data-testid="profile-phone-input" />
                    </div>
                  </div>

                  {user?.role === "crew" && (
                    <div>
                      <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1">Primary Trade</label>
                      <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                        data-testid="profile-trade-select">
                        <option value="">Select trade</option>
                        {TRADES.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                      </select>
                    </div>
                  )}

                  {user?.role === "contractor" && (
                    <div>
                      <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1">Company Name</label>
                      <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1">Address</label>
                    <AddressAutocomplete
                      value={form.address || ""}
                      onChange={(v) => setForm(f => ({ ...f, address: v }))}
                      onSelect={({ address, lat, lng }) => setForm(f => ({ ...f, address, lat, lng }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1">Bio</label>
                    <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                      placeholder="Tell contractors about your experience..." data-testid="profile-bio-input" />
                  </div>

                  {user?.role === "crew" && (
                    <div>
                      <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-2">Skills</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.skills.map(skill => (
                          <span key={skill} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 text-[#0000FF] px-2 py-1 rounded-full text-xs font-semibold">
                            {skill}
                            <button onClick={() => removeSkill(skill)}><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ALL_SKILLS.filter(s => !form.skills.includes(s)).map(skill => (
                          <button key={skill} onClick={() => addSkill(skill)}
                            className="text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 hover:border-[#0000FF] hover:text-[#0000FF]">
                            + {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { icon: User, label: "Name", value: user?.name },
                    { icon: Phone, label: "Phone", value: user?.phone || "Not set" },
                    { icon: Briefcase, label: user?.role === "contractor" ? "Company" : "Trade", value: (user?.role === "contractor" ? user?.company_name : user?.trade) || "Not set" },
                    { icon: MapPin, label: "Address", value: user?.address || user?.location?.city || "Not set" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <item.icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500 w-20">{item.label}</span>
                      <span className="text-sm font-semibold text-[#050A30] dark:text-white capitalize">{item.value}</span>
                    </div>
                  ))}
                  {user?.bio && (
                    <div className="pt-2">
                      <p className="text-sm text-slate-500 mb-1">Bio</p>
                      <p className="text-sm text-[#050A30] dark:text-slate-300">{user.bio}</p>
                    </div>
                  )}
                  {user?.skills?.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm text-slate-500 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {user.skills.map(s => (
                          <span key={s} className="bg-blue-100 dark:bg-blue-900/50 text-[#0000FF] px-2 py-1 rounded-full text-xs font-semibold">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Portfolio Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#050A30] dark:text-white text-lg flex items-center gap-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                  <Image className="w-5 h-5 text-[#0000FF]" /> Portfolio
                  <span className="text-xs font-normal text-slate-400">({portfolio.length}/8)</span>
                </h3>
                {portfolio.length < 8 && (
                  <button onClick={() => portfolioRef.current?.click()}
                    disabled={portfolioUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0000FF] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                    data-testid="add-portfolio-btn">
                    {portfolioUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    {portfolioUploading ? "Uploading..." : "Add Photos"}
                  </button>
                )}
                <input ref={portfolioRef} type="file" multiple accept="image/*" className="hidden" onChange={handlePortfolioUpload} />
              </div>
              {portfolio.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                  <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No portfolio images yet</p>
                  <p className="text-slate-300 text-xs mt-1">Upload up to 8 images to showcase your work</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {portfolio.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={`${process.env.REACT_APP_BACKEND_URL}${url}`} alt={`Portfolio ${i+1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removePortfolioImage(url)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                        data-testid={`remove-portfolio-${i}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Controls */}
            <div className="card p-5">
              <h3 className="font-bold text-[#050A30] dark:text-white text-lg mb-3 flex items-center gap-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                <Shield className="w-5 h-5 text-[#0000FF]" /> Privacy Settings
              </h3>
              <div className="space-y-3">
                {[
                  { key: "hide_phone", label: "Hide Phone Number", desc: "Others can't see your phone" },
                  { key: "hide_email", label: "Hide Email Address", desc: "Others can't see your email" },
                  { key: "hide_location", label: "Hide Location", desc: "Others can't see your city/state" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#050A30] dark:text-white">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                    <button
                      onClick={() => updatePrivacy(key, !privacy[key])}
                      className={`w-11 h-6 rounded-full transition-colors relative ${privacy[key] ? "bg-[#0000FF]" : "bg-slate-200 dark:bg-slate-700"}`}
                      data-testid={`privacy-${key}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${privacy[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <MessagesPanel user={user} />

            {/* Recent Ratings */}
            {ratings.length > 0 && (
              <div className="card p-6">
                <h3 className="font-bold text-[#050A30] dark:text-white text-lg mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Recent Reviews</h3>
                <div className="space-y-3">
                  {ratings.slice(0, 5).map(r => (
                    <div key={r.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center gap-1 mb-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.stars ? "text-amber-400 fill-current" : "text-slate-300"}`} />)}
                      </div>
                      {r.review && <p className="text-sm text-slate-600 dark:text-slate-300">{r.review}</p>}
                      <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
