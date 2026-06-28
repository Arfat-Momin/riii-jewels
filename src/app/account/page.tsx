"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, User, Loader2, MapPin, Phone, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/lib/firebase/services";
import { usePopup } from "@/lib/popup-context";

export default function AccountPage() {
  const { user, profile, setProfile, loading } = useAuth();
  const { showAlert } = usePopup();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setCity(profile.city || "");
      setPincode(profile.pincode || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { name, phone, address, city, pincode });
      if (setProfile && profile) {
        setProfile({ ...profile, name, phone, address, city, pincode });
      }
      showAlert("Your profile has been successfully updated.", "success", "Profile Updated");
    } catch (error) {
      console.error(error);
      showAlert("Failed to update profile. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
        <p className="text-charcoal/50 text-sm font-medium animate-pulse">Loading account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <User className="w-16 h-16 text-charcoal/20 mb-4" />
        <h2 className="font-serif text-3xl text-charcoal mb-3">Please Sign In</h2>
        <p className="text-charcoal/60 mb-6 text-center max-w-sm">
          You need to be signed in to view and edit your account details.
        </p>
        <Link href="/" className="bg-charcoal text-white px-8 py-3 rounded-sm uppercase tracking-widest text-xs hover:bg-gold transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-charcoal text-cream py-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
          <Link href="/" className="hover:text-gold transition-colors p-2 -ml-2 rounded-full hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-serif text-2xl tracking-wider">My Account</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 lg:py-12">
        <div className="bg-ivory rounded-xl border border-cream-dark p-6 sm:p-8 shadow-sm">
          <div className="mb-8 border-b border-charcoal/10 pb-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center text-gold">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-charcoal">{profile?.name || "Welcome!"}</h2>
              <p className="text-charcoal/60 text-sm mt-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                {user.email || "No email available"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal/60 mb-2 font-semibold">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-charcoal/15 rounded-lg pl-11 pr-4 py-3 text-sm text-charcoal focus:outline-none focus:border-gold transition-colors shadow-sm"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal/60 mb-2 font-semibold">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-charcoal/15 rounded-lg pl-11 pr-4 py-3 text-sm text-charcoal focus:outline-none focus:border-gold transition-colors shadow-sm"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-charcoal/60 mb-2 font-semibold">
                  Shipping Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-4 h-4 text-charcoal/30" />
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-charcoal/15 rounded-lg pl-11 pr-4 py-3 text-sm text-charcoal focus:outline-none focus:border-gold transition-colors shadow-sm resize-none"
                    placeholder="Enter your full street address"
                  />
                </div>
                <p className="text-[10px] text-charcoal/40 mt-2 ml-1">
                  This address will be automatically filled when you check out.
                </p>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal/60 mb-2 font-semibold">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white border border-charcoal/15 rounded-lg px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-gold transition-colors shadow-sm"
                  placeholder="E.g., Mumbai"
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal/60 mb-2 font-semibold">
                  Pincode
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-white border border-charcoal/15 rounded-lg px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-gold transition-colors shadow-sm"
                  placeholder="E.g., 400001"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-charcoal/10 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-charcoal hover:bg-gold text-white px-8 py-3.5 rounded-sm uppercase tracking-widest text-xs font-semibold transition-all duration-300 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
