import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Briefcase, ChevronRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAGE_MAP = {
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
  guidelines: "Community Guidelines",
};

export default function LegalPage() {
  const [params] = useSearchParams();
  const page = params.get("page") || "terms";
  const [content, setContent] = useState("");
  const [title, setTitle] = useState(PAGE_MAP[page] || "Legal");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    setLoading(true);
    // Public CMS endpoint (no auth needed for legal pages)
    axios.get(`${API}/public/cms/${page}`)
      .then(res => {
        setContent(res.data.content || "");
        setTitle(res.data.title || PAGE_MAP[page]);
        setLastUpdated(res.data.updated_at || "");
      })
      .catch(() => {
        setContent("This content is being updated. Please check back soon.");
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="bg-[#050A30] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 bg-[#0000FF] rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-extrabold text-base" style={{ fontFamily: "Manrope, sans-serif" }}>TheDayLaborers</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <span className="text-[#7EC8E3] font-semibold text-sm">{title}</span>
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-6 flex gap-0">
          {Object.entries(PAGE_MAP).map(([key, label]) => (
            <Link
              key={key}
              to={`/legal?page=${key}`}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${page === key ? "border-[#0000FF] text-[#0000FF]" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-[#050A30] dark:text-white mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>{title}</h1>
        {lastUpdated && (
          <p className="text-sm text-slate-400 mb-8">Last updated: {new Date(lastUpdated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />)}
          </div>
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
            {content}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 py-6 mt-10">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link to="/legal?page=terms" className="hover:text-[#0000FF]">Terms & Conditions</Link>
          <Link to="/legal?page=privacy" className="hover:text-[#0000FF]">Privacy Policy</Link>
          <Link to="/legal?page=guidelines" className="hover:text-[#0000FF]">Community Guidelines</Link>
          <Link to="/" className="hover:text-[#0000FF]">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
