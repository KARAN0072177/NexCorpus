"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  X,
  Mail,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  Zap,
  Clock,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import UserAvatar from "./user-avatar";
import DeleteAccountModal from "./delete-account-modal";

export interface UserProfileData {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
  provider?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfileData;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user: initialUser,
}: UserProfileModalProps) {
  const [showEmail, setShowEmail] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfileData | null>(
    initialUser || null
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Sync with initialUser prop changes
  useEffect(() => {
    if (initialUser) {
      setProfileUser((prev) => ({ ...prev, ...initialUser }));
    }
  }, [initialUser]);

  // Fetch real user details from /api/auth/me if email or image is missing
  useEffect(() => {
    if (isOpen && (!profileUser?.email || !profileUser?.image)) {
      setIsLoadingProfile(true);
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setProfileUser((prev) => ({
              ...prev,
              ...data.user,
            }));
          }
        })
        .catch((err) => {
          console.error("Failed to load user profile:", err);
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    }
  }, [isOpen, profileUser?.email, profileUser?.image]);

  if (!isOpen) return null;

  const rawEmail = profileUser?.email || "user@nexcorpus.ai";

  function censorEmail(email: string) {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;

    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }

    const firstChar = name[0];
    const lastChar = name[name.length - 1];
    const maskedMiddle = "*".repeat(Math.min(name.length - 2, 4));

    return `${firstChar}${maskedMiddle}${lastChar}@${domain}`;
  }

  const displayedEmail = showEmail ? rawEmail : censorEmail(rawEmail);

  async function handleLogout() {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900 via-[#0d1322] to-[#0a0e17] p-6 text-white shadow-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close profile modal"
            className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* User Header */}
          <div className="flex flex-col items-center text-center pt-2 pb-6 border-b border-white/10">
            <div className="relative mb-3 flex items-center justify-center">
              <UserAvatar
                image={profileUser?.image}
                email={profileUser?.email}
                name={profileUser?.name}
                username={profileUser?.username}
                size="xl"
                className="border-2 border-sky-500/40 shadow-xl shadow-sky-500/10"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-slate-900 text-slate-950 shadow">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              {profileUser?.name || `@${profileUser?.username || "User"}`}
            </h3>
            {profileUser?.username && (
              <p className="text-xs text-sky-400 font-mono mt-0.5">
                @{profileUser.username}
              </p>
            )}
          </div>

          {/* Info List */}
          <div className="my-6 space-y-3">
            {/* Censored Email Box */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-sky-400" />
                  Email Address
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmail(!showEmail)}
                  className="flex items-center gap-1 font-semibold text-sky-400 hover:text-sky-300 transition"
                >
                  {showEmail ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Reveal</span>
                    </>
                  )}
                </button>
              </div>

              {isLoadingProfile && !profileUser?.email ? (
                <div className="flex items-center gap-2 py-1 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
                  <span>Loading email...</span>
                </div>
              ) : (
                <p className="font-mono text-sm text-slate-200 font-medium tracking-wide">
                  {displayedEmail}
                </p>
              )}
            </div>

            {/* Login Method Badge */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3.5 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Sign-In Method
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-semibold text-sky-300">
                <GoogleIcon className="h-3.5 w-3.5" />
                Google Auth
              </span>
            </div>

            {/* Security Policy Info */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span>7-Day Session Expiry</span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                <Zap className="h-4 w-4 text-sky-400 shrink-0" />
                <span>25 req/min Security</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{isLoggingOut ? "Ending Session..." : "Log Out"}</span>
            </button>

            {/* Danger Zone: Delete Account */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Account & Erase All Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account 2-Step Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        userEmail={profileUser?.email}
        username={profileUser?.username}
      />
    </>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}
