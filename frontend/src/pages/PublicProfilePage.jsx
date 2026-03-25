import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import axios from "axios";
import { Star, MapPin, Briefcase, Copy, Check, ArrowLeft, Send, Shield } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/users/public/${userId}?viewer_id=${user?.id || ""}`);
        setProfile(res.data);
      } catch (e) {
        if (e?.response?.status === 404) toast.error("Profile not found");
      }
      setLoading(false);
    };
    load();
  }, [userId, user?.id]);

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Profile link copied!");
  };

  const sendOffer = async () => {
    if (!user || user.role !== "contractor") {
      navigate("/auth?mode=login");
      return;
    }
    navigate(`/contractor/dashboard?offer=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-4" />
          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617]">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-slate-600 dark:text-slate-400">Profile not found</h2>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-[#0000FF] font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  const isOwn = user?.id === userId;
  const displayName = profile.company_name || profile.name;
  const initials = displayName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const photoUrl = profile.profile_photo || profile.logo;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-[#0000FF] text-sm font-semibold mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header Card */}
        <div className="card p-6 mb-4">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#050A30] flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0">
              {photoUrl
                ? <img src={`${process.env.REACT_APP_BACKEND_URL}${photoUrl}`} alt={displayName} className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#050A30] dark:text-white" style={{ fontFamily: "Manrope, sans-serif" }}>
                    {displayName}
                  </h1>
                  <p className="text-[#0000FF] font-semibold capitalize text-sm">{profile.trade || profile.role}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 capitalize">{profile.role}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyProfileLink}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    data-testid="copy-profile-link">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Share"}
                  </button>
                  {!isOwn && user?.role === "contractor" && profile.role === "crew" && (
                    <button onClick={sendOffer}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#0000FF] text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                      data-testid="send-offer-profile-btn">
                      <Send className="w-4 h-4" /> Offer Job
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {profile.rating > 0 && (
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-4 h-4 fill-current" /> {profile.rating.toFixed(1)}
                    <span className="text-slate-400 font-normal">({profile.rating_count || 0})</span>
                  </span>
                )}
                <span className="flex items-center gap-1 text-slate-500">
                  <Briefcase className="w-4 h-4" /> {profile.jobs_completed || 0} jobs done
                </span>
                {profile.location?.city && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-4 h-4" /> {profile.location.city}, {profile.location.state}
                  </span>
                )}
                <span className={`font-semibold ${profile.availability ? "text-emerald-500" : "text-red-400"}`}>
                  {profile.availability ? "Available" : "Not Available"}
                </span>
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm border-t border-slate-100 dark:border-slate-700 pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Skills */}
        {profile.skills?.length > 0 && (
          <div className="card p-5 mb-4">
            <h3 className="font-bold text-[#050A30] dark:text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(s => (
                <span key={s} className="bg-blue-50 dark:bg-blue-950 text-[#0000FF] px-3 py-1 rounded-full text-xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profile.portfolio?.length > 0 && (
          <div className="card p-5 mb-4">
            <h3 className="font-bold text-[#050A30] dark:text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Portfolio ({profile.portfolio.length} photos)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {profile.portfolio.map((url, i) => (
                <a key={i} href={`${process.env.REACT_APP_BACKEND_URL}${url}`} target="_blank" rel="noreferrer"
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 hover:opacity-90 transition-opacity">
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${url}`} alt={`Work ${i + 1}`}
                    className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contact info (if not hidden) */}
        {(profile.phone || profile.email) && (
          <div className="card p-5">
            <h3 className="font-bold text-[#050A30] dark:text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>Contact</h3>
            <div className="space-y-2">
              {profile.phone && <p className="text-sm text-slate-600 dark:text-slate-300">Phone: <strong>{profile.phone}</strong></p>}
              {profile.email && <p className="text-sm text-slate-600 dark:text-slate-300">Email: <strong>{profile.email}</strong></p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
