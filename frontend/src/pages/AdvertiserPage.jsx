import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { Briefcase, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdvertiserPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", company_name: "",
    phone: "", website: "", ad_description: "",
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.company_name) {
      return toast.error("Please fill in all required fields");
    }
    setLoading(true);
    try {
      await axios.post(`${API}/advertisers/signup`, form);
      setDone(true);
      toast.success("Application submitted! Our team will review your request.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#020617] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#050A30] dark:text-white mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>Application Received!</h2>
          <p className="text-slate-500 mb-2">Thank you for your interest in advertising on <strong>TheDayLaborers</strong>.</p>
          <p className="text-slate-400 text-sm mb-6">Our team will review your application and reach out within 1–2 business days.</p>
          <Link to="/" className="inline-block bg-[#0000FF] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="bg-[#050A30] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 mr-auto">
            <div className="w-8 h-8 bg-[#0000FF] rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-extrabold text-base" style={{ fontFamily: "Manrope, sans-serif" }}>TheDayLaborers</span>
          </Link>
          <Link to="/" className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 text-[#0000FF] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Reach Blue Collar Professionals
          </div>
          <h1 className="text-3xl font-extrabold text-[#050A30] dark:text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Advertise With Us</h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            Connect your brand with thousands of active crew members and contractors in the blue collar workforce. Targeted, local, and effective.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            ["Targeted Reach", "Connect with active tradespeople"],
            ["Local Audience", "Geo-targeted placements"],
            ["Admin Approved", "Quality controlled ads"],
          ].map(([title, desc]) => (
            <div key={title} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="font-bold text-[#050A30] dark:text-white text-sm mb-1">{title}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-[#050A30] dark:text-white text-lg mb-5" style={{ fontFamily: "Manrope, sans-serif" }}>Apply to Advertise</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1.5">Your Name *</label>
                <input value={form.name} onChange={e => update("name", e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                  placeholder="John Smith" required data-testid="adv-name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1.5">Company Name *</label>
                <input value={form.company_name} onChange={e => update("company_name", e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                  placeholder="ACME Corp" required data-testid="adv-company" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1.5">Email Address *</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                placeholder="ads@company.com" required data-testid="adv-email" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white pr-10"
                  placeholder="Min 6 characters" required data-testid="adv-password" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                  placeholder="+1 (555) 000-0000" data-testid="adv-phone" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1.5">Website</label>
                <input type="url" value={form.website} onChange={e => update("website", e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white"
                  placeholder="https://company.com" data-testid="adv-website" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#050A30] dark:text-white mb-1.5">Tell us about your ad campaign</label>
              <textarea value={form.ad_description} onChange={e => update("ad_description", e.target.value)}
                rows={3}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0000FF] dark:bg-slate-800 dark:text-white resize-none"
                placeholder="What product or service would you like to advertise?" data-testid="adv-description" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#0000FF] text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              data-testid="adv-submit-btn">
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
