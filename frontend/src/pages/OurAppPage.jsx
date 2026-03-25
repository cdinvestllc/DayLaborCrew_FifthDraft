import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Smartphone, Download, Star, Users, Briefcase, MapPin, Bell, Zap, ArrowRight, ExternalLink } from "lucide-react";

const FEATURES = [
  { icon: MapPin, title: "Find Work Near You", desc: "Browse live job listings on an interactive map. See opportunities the moment they're posted." },
  { icon: Bell, title: "Instant Alerts", desc: "Get notified instantly when new jobs matching your trade appear near you." },
  { icon: Star, title: "Build Your Reputation", desc: "Earn ratings after every job. Top-rated workers get priority placement in searches." },
  { icon: Zap, title: "Fast Payments", desc: "Confirm work completion, get rated, and access your payment history all in one place." },
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
            <span className="text-[#7EC8E3] text-sm font-medium">Available on all devices</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>
            Download Our App.<br /><span className="text-[#7EC8E3]">Work Smarter.</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            TheDayLaborers is your on-demand blue collar workforce app. Find work or hire crew instantly from your phone — anywhere, anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://www.peopleready.com/jobstack/"
              target="_blank"
              rel="noreferrer"
              data-testid="jobstack-link"
              className="inline-flex items-center justify-center gap-2 bg-[#0000FF] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-900/50">
              <Smartphone className="w-5 h-5" /> Explore JobStack App
              <ExternalLink className="w-4 h-4 opacity-70" />
            </a>
            <Link
              to="/auth?mode=register"
              data-testid="our-app-signup-btn"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-[#050A30] transition-all">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* PWA Install Banner */}
      <section className="bg-gradient-to-r from-[#0000FF] to-[#050A30] py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white text-center sm:text-left">
            <p className="font-extrabold text-xl" style={{ fontFamily: "Manrope, sans-serif" }}>Install as a Home Screen App</p>
            <p className="text-blue-200 text-sm">Add TheDayLaborers to your home screen for instant access — works like a native app!</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Download className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-white text-xs font-semibold">iOS: Share → Add to Home</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Download className="w-6 h-6 text-white mx-auto mb-1" />
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
              Everything You Need, In Your Pocket
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Inspired by top workforce apps like <a href="https://www.peopleready.com/jobstack/" target="_blank" rel="noreferrer" className="text-[#0000FF] font-semibold hover:underline">PeopleReady's JobStack</a>, built for the blue collar workforce.</p>
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

      {/* JobStack Reference */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-[#0F172A]">
        <div className="max-w-3xl mx-auto text-center">
          <Users className="w-12 h-12 text-[#0000FF] mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-[#050A30] dark:text-white mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
            Already use PeopleReady's JobStack?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            "Download our top-rated JobStack app to get started!" — PeopleReady JobStack is a similar platform that connects workers with staffing opportunities. TheDayLaborers is purpose-built for direct contractor-to-crew connections without agency fees.
          </p>
          <a href="https://www.peopleready.com/jobstack/" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-[#0000FF] font-bold hover:underline"
            data-testid="jobstack-external-link">
            Visit PeopleReady JobStack <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#050A30] text-center">
        <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Start Working Today</h2>
        <p className="text-[#7EC8E3] mb-8">Free 30-day trial. No credit card required.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/auth?mode=register&role=crew"
            className="inline-flex items-center gap-2 bg-[#0000FF] text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all"
            data-testid="our-app-crew-btn">
            <Briefcase className="w-5 h-5" /> I Want to Work
          </Link>
          <Link to="/auth?mode=register&role=contractor"
            className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-[#050A30] transition-all"
            data-testid="our-app-contractor-btn">
            <Users className="w-5 h-5" /> I Need Crew
          </Link>
        </div>
      </section>
    </div>
  );
}
