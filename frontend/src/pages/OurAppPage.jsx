import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Smartphone, Download, Star, Users, Briefcase, MapPin, Bell, Zap, ArrowRight, CheckCircle } from "lucide-react";

const FEATURES = [
  { icon: MapPin, title: "Find Work Near You", desc: "Browse live job listings on an interactive map. See opportunities the moment they're posted." },
  { icon: Bell, title: "Instant Alerts", desc: "Get push notifications the second a job matching your trade appears near you." },
  { icon: Star, title: "Build Your Reputation", desc: "Earn ratings after every job. Top-rated workers get priority placement in searches." },
  { icon: Zap, title: "Fast Payments", desc: "Track work completion, collect ratings, and view your full payment history in one place." },
];

const STEPS = [
  { step: "1", title: "Create Your Profile", desc: "Sign up free and complete your profile with skills, trade, and location." },
  { step: "2", title: "Browse Jobs or Post Work", desc: "Crew members find jobs nearby. Contractors post openings and see who's available." },
  { step: "3", title: "Connect & Get Paid", desc: "Accept offers, complete work, earn ratings, and grow your network." },
];

export default function OurAppPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#020617]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />

      {/* Hero */}
      <section className="bg-[#050A30] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#0000FF]/20 border border-[#0000FF]/40 rounded-full px-4 py-1.5 mb-6">
            <Smartphone className="w-4 h-4 text-[#7EC8E3]" />
            <span className="text-[#7EC8E3] text-sm font-medium">Works on all devices — no download required</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>
            TheDayLaborers App.<br /><span className="text-[#7EC8E3]">Work Smarter.</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            The on-demand blue collar workforce platform. Find skilled crew instantly or pick up work near you — directly, no agency fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=register&role=crew"
              data-testid="our-app-crew-cta"
              className="inline-flex items-center justify-center gap-2 bg-[#0000FF] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-900/50">
              <Briefcase className="w-5 h-5" /> I Want to Work
            </Link>
            <Link to="/auth?mode=register&role=contractor"
              data-testid="our-app-contractor-cta"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#050A30] px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all hover:scale-105 shadow-lg">
              <Users className="w-5 h-5" /> I Need Crew
            </Link>
          </div>
        </div>
      </section>

      {/* Add to Home Screen */}
      <section className="bg-gradient-to-r from-[#0000FF] to-[#050A30] py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white text-center sm:text-left">
            <p className="font-extrabold text-xl" style={{ fontFamily: "Manrope, sans-serif" }}>Install as a Home Screen App</p>
            <p className="text-blue-200 text-sm">Add TheDayLaborers to your home screen — works like a native app, even offline!</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="bg-white/10 rounded-lg p-3 text-center min-w-[120px]">
              <Download className="w-5 h-5 text-white mx-auto mb-1" />
              <p className="text-white text-xs font-semibold">iOS: Share → Add to Home Screen</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center min-w-[120px]">
              <Download className="w-5 h-5 text-white mx-auto mb-1" />
              <p className="text-white text-xs font-semibold">Android: Menu → Install App</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white dark:bg-[#020617]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#050A30] dark:text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Everything You Need, In One Place
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Built specifically for the blue collar workforce — contractors and crew.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6 flex gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-6 h-6 text-[#0000FF]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#050A30] dark:text-white mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>{f.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-[#0F172A]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-[#050A30] dark:text-white mb-10" style={{ fontFamily: "Manrope, sans-serif" }}>
            How TheDayLaborers Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {STEPS.map(s => (
              <div key={s.step} className="card p-5">
                <div className="w-10 h-10 bg-[#0000FF] rounded-xl flex items-center justify-center text-white font-extrabold text-lg mb-3">{s.step}</div>
                <h3 className="font-bold text-[#050A30] dark:text-white mb-1.5" style={{ fontFamily: "Manrope, sans-serif" }}>{s.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Contractors CTA */}
      <section className="py-14 px-4 bg-white dark:bg-[#020617]">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="w-12 h-12 text-[#0000FF] mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-[#050A30] dark:text-white mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
            Find Verified Contractors
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Browse our directory of verified professionals — property owners, apartments, and homeowners can hire with confidence.
          </p>
          <Link to="/verified-contractors"
            className="inline-flex items-center gap-2 bg-[#050A30] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0000FF] transition-colors"
            data-testid="our-app-verified-btn">
            Browse Verified Contractors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-[#050A30] text-center">
        <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Start Today. Free 30-Day Trial.</h2>
        <p className="text-[#7EC8E3] mb-8 text-lg">No credit card required. Cancel anytime.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/auth?mode=register&role=crew"
            className="inline-flex items-center gap-2 bg-[#0000FF] text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all"
            data-testid="our-app-crew-btn">
            <Briefcase className="w-5 h-5" /> Join as Crew
          </Link>
          <Link to="/auth?mode=register&role=contractor"
            className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-[#050A30] transition-all"
            data-testid="our-app-contractor-btn">
            <Users className="w-5 h-5" /> Hire Crew
          </Link>
        </div>
      </section>
    </div>
  );
}
