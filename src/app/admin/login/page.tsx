"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth, isMock } from "@/lib/firebase/config";
import { Shield, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // If already logged in, redirect to admin dashboard
  useEffect(() => {
    if (isMock) {
      const mockLoggedIn = localStorage.getItem("mock_admin_logged_in");
      if (mockLoggedIn === "true") {
        router.push("/admin");
      }
    } else {
      const unsubscribe = adminAuth.onAuthStateChanged((user) => {
        if (user) {
          router.push("/admin");
        }
      });
      return () => unsubscribe();
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isMock) {
        // In mock mode, any non-empty credentials work
        if (!userId || !password) {
          throw new Error("Please enter both user ID and password.");
        }
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate api delay
        localStorage.setItem("mock_admin_logged_in", "true");
        router.push("/admin");
      } else {
        const formattedEmail = userId.includes("@") ? userId : `${userId}@admin.riii.com`;
        await signInWithEmailAndPassword(adminAuth, formattedEmail, password);
        router.push("/admin");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(err.message || "An error occurred during sign-in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gold-dark/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-charcoal-light/30 border border-charcoal-light/40 rounded-2xl shadow-2xl p-8 z-10 backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-white tracking-widest uppercase">RIII JEWELS</h1>
          <p className="text-sm text-cream/70 mt-2 font-serif italic">Admin Portal</p>
        </div>

        {/* Mock Mode Notice */}
        {isMock && (
          <div className="mb-6 p-4 bg-gold/10 border border-gold/20 rounded-lg text-gold text-xs">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <span>⚠️</span> Mock Mode Active
            </p>
            <p className="text-cream/90">
              Firebase keys are not configured. Enter any email and password to log in locally.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-rose/10 border border-rose/20 rounded-lg text-rose-light text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-cream/60 uppercase tracking-wider mb-2">
              User ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cream/40">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-3 bg-charcoal border border-charcoal-light/40 rounded-lg text-white placeholder-cream/30 focus:outline-none focus:border-gold/50 transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cream/60 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cream/40">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-charcoal border border-charcoal-light/40 rounded-lg text-white placeholder-cream/30 focus:outline-none focus:border-gold/50 transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-cream/40 hover:text-cream transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gold hover:bg-gold-dark text-charcoal hover:text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-8 cursor-pointer shadow-md shadow-gold/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center z-10">
        <a href="/" className="text-xs text-cream/50 hover:text-gold transition-colors">
          &larr; Back to storefront
        </a>
      </div>
    </div>
  );
}
