import React from 'react';
import { Mic2, ArrowRight, Mail, Globe, Shield, Award, Heart } from 'lucide-react';
import { ScreenType } from '../types';

interface FooterProps {
  onNavigate: (screen: ScreenType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer id="main-footer" className="bg-slate-950 text-slate-400 border-t border-slate-800">
      {/* Top Banner / Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Stay Ahead on Stage</span>
            <h3 className="text-xl sm:text-2xl font-black text-white">Join 50,000+ Stage Masters</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              Receive weekly MC script breakdowns, vocal warmup routines, and early bird tickets to masterclasses.
            </p>
          </div>
          <div className="lg:col-span-6">
            <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing to MSEEK Stage Digest!'); }} className="flex flex-col sm:flex-row gap-2 max-w-md ml-auto">
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Subscribe</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Link Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Mic2 className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">MSEEK</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            MSEEK is the premier global communication academy. We train future keynote speakers, event hosts, corporate moderators, and leaders to command any stage with poise and authority.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2">
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Certified Curriculum</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Global Accreditation</span>
            </div>
          </div>
        </div>

        {/* Masterclasses */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Masterclasses</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => onNavigate('courses')} className="hover:text-white transition-colors">MC & Event Hosting</button></li>
            <li><button onClick={() => onNavigate('courses')} className="hover:text-white transition-colors">Wedding & Gala Hosting</button></li>
            <li><button onClick={() => onNavigate('courses')} className="hover:text-white transition-colors">Executive Public Speaking</button></li>
            <li><button onClick={() => onNavigate('courses')} className="hover:text-white transition-colors">TEDx Coaching</button></li>
            <li><button onClick={() => onNavigate('courses')} className="hover:text-white transition-colors">Vocal Power & Diction</button></li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">Home Showcase</button></li>
            <li><button onClick={() => onNavigate('courses')} className="hover:text-white transition-colors">Course Catalog</button></li>
            <li><button onClick={() => onNavigate('course-detail')} className="hover:text-white transition-colors">Featured Wedding MC</button></li>
            <li><button onClick={() => onNavigate('login')} className="hover:text-white transition-colors">Sign In Portal</button></li>
            <li><button onClick={() => onNavigate('register')} className="hover:text-white transition-colors">Create Account</button></li>
          </ul>
        </div>

        {/* Legal & Help */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Support & Legal</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#help" onClick={(e) => {e.preventDefault(); alert('MSEEK 24/7 Student Support: support@mseek.edu');}} className="hover:text-white transition-colors">Help Center</a></li>
            <li><a href="#terms" onClick={(e) => {e.preventDefault(); alert('MSEEK Terms of Service: Validated 2026');}} className="hover:text-white transition-colors">Terms of Service</a></li>
            <li><a href="#privacy" onClick={(e) => {e.preventDefault(); alert('MSEEK Privacy Policy: Strictly protected data.');}} className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#refund" onClick={(e) => {e.preventDefault(); alert('30-day money-back guarantee active on all enrollments.');}} className="hover:text-white transition-colors">30-Day Guarantee</a></li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-slate-900 bg-slate-950/90 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} MSEEK Communication Academy Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              Crafted for speakers and event hosts worldwide <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
