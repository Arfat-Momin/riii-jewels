"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { adminAuth } from "@/lib/firebase/config";
import { Shield, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // If already logged in (valid session cookie), redirect to dashboard
  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => { if (r.ok) router.push("/admin"); })
      .catch(() => { /* not logged in */ });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ── Step 1: Authenticate with Firebase (client SDK handles email + password)
      const credential = await signInWithEmailAndPassword(adminAuth, email.trim(), password);

      // ── Step 2: Get a short-lived ID token (contains the user's UID as a claim)
      const idToken = await credential.user.getIdToken();

      // ── Step 3: Send ONLY the ID token to the server.
      // The server will extract the UID from the token and check it against
      // ADMIN_UID (a server-only env var that never reaches the browser).
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Sign out of Firebase client-side since server rejected the session
        await adminAuth.signOut().catch(() => { });
        setError(data.error ?? "Access denied. You are not authorized as admin.");
        return;
      }

      // ── Step 4: Server set an HttpOnly cookie — just redirect
      router.push("/admin");

    } catch (err: any) {
      // Firebase client-side auth errors (wrong email/password)
      const code = err?.code ?? "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-email"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Sign-in failed. Please check your credentials and try again.");
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-rose/10 border border-rose/20 rounded-lg text-rose-light text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold text-cream/60 uppercase tracking-wider mb-2">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cream/40">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
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
                autoComplete="current-password"
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
                Verifying...
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
