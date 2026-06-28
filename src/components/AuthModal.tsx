"use client";

import React, { useState } from "react";
import { X, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, isMock } from "@/lib/firebase/config";
import { updateUserProfile } from "@/lib/firebase/services";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type View = "login" | "register" | "forgot" | "forgot-sent";

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  if (!isOpen) return null;

  const reset = () => {
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setResetEmail("");
  };

  const switchView = (v: View) => {
    setError("");
    setView(v);
  };

  // --- Login / Register ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isMock) {
        setTimeout(() => {
          setLoading(false);
          if (onSuccess) onSuccess();
          onClose();
        }, 1000);
        return;
      }

      if (view === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name) {
          setError("Name is required for registration.");
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateUserProfile(user.uid, {
          uid: user.uid,
          email: user.email || email,
          name,
          password,
          phone: "",
          address: "",
          city: "",
          pincode: "",
        });
      }

      reset();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      // Friendly error messages
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Incorrect email or password. Please try again.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Sign in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Forgot Password ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isMock) {
        setTimeout(() => {
          setLoading(false);
          switchView("forgot-sent");
        }, 1000);
        return;
      }
      await sendPasswordResetEmail(auth, resetEmail);
      switchView("forgot-sent");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else {
        setError(err.message || "Failed to send reset email. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
      <div className="bg-cream w-full max-w-md rounded-sm shadow-xl overflow-hidden relative animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={() => { reset(); switchView("login"); onClose(); }}
          className="absolute top-4 right-4 p-2 text-charcoal/50 hover:text-charcoal transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <>
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl text-charcoal mb-2">Welcome Back</h2>
                <p className="text-sm text-charcoal/60">Sign in to your Riii Jewels account</p>
              </div>

              {error && (
                <div className="bg-rose/10 text-rose text-sm p-3 rounded-sm mb-6 border border-rose/20 text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs uppercase tracking-wider text-charcoal/50">Password</label>
                    <button
                      type="button"
                      onClick={() => { setResetEmail(email); switchView("forgot"); }}
                      className="text-xs text-gold hover:text-gold-dark transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-charcoal text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-charcoal/60">
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => switchView("register")} className="text-gold font-medium hover:text-gold-dark transition-colors">
                    Register here
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── REGISTER VIEW ── */}
          {view === "register" && (
            <>
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl text-charcoal mb-2">Create Account</h2>
                <p className="text-sm text-charcoal/60">Join Riii Jewels for exclusive benefits</p>
              </div>

              {error && (
                <div className="bg-rose/10 text-rose text-sm p-3 rounded-sm mb-6 border border-rose/20 text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors"
                    placeholder="Your Name"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors"
                    placeholder="Min. 6 characters"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-charcoal text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account..." : "Register"}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-charcoal/60">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchView("login")} className="text-gold font-medium hover:text-gold-dark transition-colors">
                    Sign in here
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === "forgot" && (
            <>
              <button
                type="button"
                onClick={() => switchView("login")}
                className="flex items-center gap-1.5 text-xs text-charcoal/50 hover:text-charcoal transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>

              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-gold" />
                </div>
                <h2 className="font-serif text-3xl text-charcoal mb-2">Forgot Password?</h2>
                <p className="text-sm text-charcoal/60">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="bg-rose/10 text-rose text-sm p-3 rounded-sm mb-6 border border-rose/20 text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-white border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:border-charcoal outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-charcoal text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT SENT VIEW ── */}
          {view === "forgot-sent" && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-sage" />
              </div>
              <h2 className="font-serif text-2xl text-charcoal mb-3">Check Your Email</h2>
              <p className="text-sm text-charcoal/60 mb-2">
                We&apos;ve sent a password reset link to:
              </p>
              <p className="font-medium text-charcoal mb-6">{resetEmail}</p>
              <p className="text-xs text-charcoal/40 mb-8 leading-relaxed">
                Click the link in the email to reset your password. Check your spam folder if you don&apos;t see it within a few minutes.
              </p>
              <button
                onClick={() => { reset(); switchView("login"); }}
                className="w-full bg-charcoal text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-gold transition-colors duration-300"
              >
                Back to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
