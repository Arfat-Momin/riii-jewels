"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, Upload, Save, CheckCircle, Loader2, Trash2, RefreshCw } from "lucide-react";
import { getStoreSettings, updateStoreSettings, uploadImage, StoreSettings } from "@/lib/firebase/services";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  // QR preview state
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UPI fields
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const s = await getStoreSettings();
    setSettings(s);
    setUpiId(s.upiId || "");
    setUpiName(s.upiName || "");
    setQrPreview(s.upiQrUrl || null);
    setLoading(false);
  };

  const handleQrFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG or JPG).");
      return;
    }
    setQrFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setQrPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleQrFile(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let upiQrUrl = settings.upiQrUrl || "";

      // Upload new QR if selected
      if (qrFile) {
        setUploading(true);
        upiQrUrl = await uploadImage(qrFile);
        setUploading(false);
        setQrFile(null);
      }

      await updateStoreSettings({ upiQrUrl, upiId, upiName });
      setSettings(prev => ({ ...prev, upiQrUrl, upiId, upiName }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save settings:", e);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleRemoveQr = async () => {
    if (!confirm("Remove the UPI QR code?")) return;
    setQrPreview(null);
    setQrFile(null);
    await updateStoreSettings({ upiQrUrl: "" });
    setSettings(prev => ({ ...prev, upiQrUrl: "" }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-3xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-serif text-charcoal font-semibold mb-1">Store Settings</h1>
        <p className="text-xs md:text-sm text-charcoal/50">Manage your UPI payment details displayed to customers at checkout.</p>
      </div>

      {/* UPI Details Card */}
      <div className="bg-white rounded-xl border border-charcoal/10 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-charcoal/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-gold" />
          </div>
          <h2 className="font-medium text-charcoal">UPI Payment Details</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* UPI ID & Name */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2 font-medium">
                UPI ID / Phone Number
              </label>
              <input
                type="text"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="e.g. 7020059293 or name@bank"
                className="w-full border border-charcoal/15 rounded-lg px-4 py-3 text-sm text-charcoal bg-cream/60 focus:border-gold focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-2 font-medium">
                Account Holder Name
              </label>
              <input
                type="text"
                value={upiName}
                onChange={e => setUpiName(e.target.value)}
                placeholder="e.g. Areesha"
                className="w-full border border-charcoal/15 rounded-lg px-4 py-3 text-sm text-charcoal bg-cream/60 focus:border-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* QR Code Upload */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal/50 mb-3 font-medium">
              UPI QR Code Image
            </label>

            {qrPreview ? (
              /* Existing / Preview */
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-cream/50 rounded-xl border border-charcoal/10">
                <div className="relative">
                  <img
                    src={qrPreview}
                    alt="UPI QR Code"
                    className="w-40 h-40 object-contain rounded-lg border border-charcoal/10 bg-white p-2 shadow-sm"
                  />
                  {qrFile && (
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] uppercase tracking-wider rounded-full px-2 py-0.5 font-bold">
                      New
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-charcoal/70 leading-relaxed">
                    {qrFile ? "New QR code ready to save." : "Current UPI QR code is displayed at checkout."}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border border-charcoal/20 rounded-lg text-xs uppercase tracking-wider text-charcoal/70 hover:border-charcoal/40 hover:text-charcoal transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replace
                    </button>
                    <button
                      onClick={handleRemoveQr}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-xs uppercase tracking-wider text-red-400 hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Upload Drop Zone */
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${isDragging ? "border-gold bg-gold/5" : "border-charcoal/15 hover:border-gold/50 hover:bg-cream/50"
                  }`}
              >
                <div className="w-14 h-14 rounded-xl bg-charcoal/5 flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-7 h-7 text-charcoal/30" />
                </div>
                <p className="text-sm text-charcoal/60 mb-1">
                  Drag & drop your QR code here or{" "}
                  <span className="text-gold font-medium">browse files</span>
                </p>
                <p className="text-xs text-charcoal/35">PNG, JPG supported · Recommended: 512×512px</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleQrFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* Info note */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-lg px-4 py-3 flex gap-3 items-start">
            <QrCode className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              The QR code image will be shown to customers on the payment step of checkout.
              Make sure the QR code is clear and scannable. Customers will scan it with their UPI app (GPay, PhonePe, etc.).
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2.5 bg-charcoal hover:bg-gold text-white px-8 py-3.5 text-xs uppercase tracking-[0.15em] font-medium transition-colors duration-300 rounded-sm disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploading ? "Uploading QR..." : "Saving..."}
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
        {saved && (
          <p className="text-sm text-green-600 font-medium animate-fade-in">
            ✓ Settings saved successfully
          </p>
        )}
      </div>
    </div>
  );
}
