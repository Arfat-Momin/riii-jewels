"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";

type PopupType = "info" | "warning" | "success" | "error";

interface PopupContextType {
  showAlert: (message: string, type?: PopupType, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, type?: PopupType) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
}

interface PopupState {
  isOpen: boolean;
  isConfirm: boolean;
  message: string;
  title: string;
  type: PopupType;
  onConfirm?: () => void;
}

export function PopupProvider({ children }: { children: ReactNode }) {
  const [popup, setPopup] = useState<PopupState>({
    isOpen: false,
    isConfirm: false,
    message: "",
    title: "",
    type: "info",
  });

  const showAlert = (message: string, type: PopupType = "info", title = "") => {
    setPopup({
      isOpen: true,
      isConfirm: false,
      message,
      title: title || (type === "error" ? "Error" : type === "warning" ? "Warning" : type === "success" ? "Success" : "Information"),
      type,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = "Confirm", type: PopupType = "warning") => {
    setPopup({
      isOpen: true,
      isConfirm: true,
      message,
      title,
      type,
      onConfirm,
    });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (popup.onConfirm) popup.onConfirm();
    closePopup();
  };

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Popup UI */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-[99999] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 text-center relative animate-scale-in border border-charcoal/10">
            {/* Close Button */}
            <button onClick={closePopup} className="absolute top-4 right-4 text-charcoal/30 hover:text-charcoal transition-colors">
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
              popup.type === "error" || popup.type === "warning" ? "bg-rose/10 text-rose" :
              popup.type === "success" ? "bg-sage/10 text-sage" :
              "bg-gold/10 text-gold"
            }`}>
              {popup.type === "error" || popup.type === "warning" ? (
                <AlertTriangle className="w-8 h-8" />
              ) : popup.type === "success" ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <Info className="w-8 h-8" />
              )}
            </div>

            {/* Content */}
            <h3 className="font-serif text-2xl text-charcoal mb-2">{popup.title}</h3>
            <p className="text-sm text-charcoal/60 mb-8 leading-relaxed">
              {popup.message}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              {popup.isConfirm && (
                <button
                  onClick={closePopup}
                  className="flex-1 border border-charcoal/15 text-charcoal/70 py-3 text-xs uppercase tracking-wider hover:border-charcoal/30 transition-colors rounded-sm"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={popup.isConfirm ? handleConfirm : closePopup}
                className={`flex-1 py-3 text-xs uppercase tracking-wider transition-colors rounded-sm font-semibold text-white ${
                  popup.type === "error" || popup.type === "warning" ? "bg-rose hover:bg-rose/80" : "bg-charcoal hover:bg-charcoal/90"
                }`}
              >
                {popup.isConfirm ? "Confirm" : "Okay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}
