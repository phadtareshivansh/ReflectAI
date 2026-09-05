import React from "react";
import { UserProfile } from "../types";
import { LogOut, PlusCircle, BookOpen } from "lucide-react";

interface NavbarProps {
  user: UserProfile;
  onSignOut: () => void;
  onNewReflection: () => void;
  onToggleHistory?: () => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewReflection,
  onToggleHistory,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#262626] bg-[#0D0D0D]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-6 h-6 border-2 border-[#C5A059] rotate-45 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 bg-[#C5A059]"></div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm sm:text-base tracking-[0.25em] uppercase font-light text-[#E5E5E5]">
                Aether <span className="font-bold text-[#C5A059]">Reflect</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[#448844] font-mono border border-[#448844]/30 px-2 py-0.5 rounded-sm bg-[#448844]/10">
                <span className="w-1.5 h-1.5 bg-[#448844] rounded-full animate-pulse"></span>
                Firestore Protected
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-[#555555] hidden sm:block">
              Private AI reflections powered by Gemini 3.6 Flash
            </p>
          </div>
        </div>

        {/* Action Controls & User Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            id="nav-new-entry-btn"
            onClick={onNewReflection}
            className="inline-flex items-center gap-1.5 border border-[#C5A059] text-[#C5A059] bg-transparent py-2 px-3 sm:px-4 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#C5A059] hover:text-black transition-all rounded-sm cursor-pointer shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Reflection</span>
          </button>

          {onToggleHistory && (
            <button
              id="nav-history-btn"
              onClick={onToggleHistory}
              className="inline-flex items-center gap-1.5 border border-[#262626] bg-[#141414] px-2.5 sm:px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-medium text-[#888888] hover:text-[#CCC] hover:border-[#333] transition-all rounded-sm cursor-pointer"
              title="View History"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#C5A059]" />
              <span className="hidden sm:inline">Archive</span>
              <span className="border border-[#262626] bg-[#1A1A1A] px-1.5 py-0.2 text-[9px] font-mono text-[#C5A059] rounded-sm">
                {historyCount}
              </span>
            </button>
          )}

          {/* User Profile avatar & Sign out */}
          <div className="flex items-center gap-2.5 border-l border-[#262626] pl-2.5 sm:pl-4">
            <div className="hidden md:block text-right">
              <div className="text-xs font-semibold text-[#D1D1D1] truncate max-w-[130px]">
                {user.displayName || user.email?.split("@")[0] || "User"}
              </div>
              <div className="text-[9px] text-[#555555] uppercase tracking-widest font-mono">
                Private Archive
              </div>
            </div>

            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-[#C5A059]/50 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-xs font-bold text-[#C5A059]">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}

            <button
              id="nav-sign-out-btn"
              onClick={onSignOut}
              className="rounded-sm p-1.5 text-[#555555] hover:text-[#C5A059] hover:bg-[#161616] border border-transparent hover:border-[#262626] transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
