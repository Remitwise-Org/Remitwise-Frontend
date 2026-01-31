"use client";

import Link from "next/link";
import { ArrowLeft, Star, Activity, Settings } from "lucide-react";


const DashboardHeader = () => {
  return (
    <header className="w-full bg-brand-dark/50 backdrop-blur-md border-b border-white/5 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Back Button */}
          <Link 
            href="/" 
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>

    
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                Financial Dashboard
              </h1>
              
          
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-brand-red/20 to-brand-red/10 border border-brand-red/20">
                <Star className="w-3 h-3 text-brand-red fill-current" />
                <span className="text-[10px] font-bold text-brand-red tracking-wider">PRO</span>
              </div>
            </div>
            
            <p className="hidden sm:block text-sm text-gray-400 mt-0.5 font-light">
              Real-time financial overview
            </p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-4">
          
          <Link
            href="/insights"
            className="hidden sm:flex group relative items-center gap-2 px-4 py-2 shadow-lg shadow-red-600/50 rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(215,35,35,0.3)]"
          >
            
            <div className="absolute inset-0 bg-brand-red/10 border border-brand-red/20 rounded-full group-hover:bg-brand-red/20 transition-all " />
            
            <Activity className="w-4 h-4 text-brand-red relative z-10" />
            <span className="text-sm font-medium text-brand-red relative z-10 ">Insights</span>
          </Link>

          {/* Settings Button */}
          <Link
            href="/settings"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-gray-300 hover:text-white"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </Link>

          {/* User Avatar */}
          <button className="relative flex items-center shadow-xl shadow-red-600/50 justify-center w-10 h-10 rounded-xl bg-brand-red hover:bg-brand-red/90 transition-colors shadow-lg shadow-brand-red/20 ">
            <span className="text-sm font-bold text-white">JD</span>
        
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-dark border-2 border-brand-dark rounded-full">
               <span className="absolute inset-0 bg-brand-red rounded-full animate-pulse" />
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};

export default DashboardHeader;
