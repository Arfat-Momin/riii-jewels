"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, Tags, LogOut, Loader2, ShoppingCart, Users, MessageSquare, Settings } from "lucide-react";
import { adminAuth, isMock } from "@/lib/firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    if (isMock) {
      const mockLoggedIn = localStorage.getItem("mock_admin_logged_in");
      if (mockLoggedIn === "true") {
        setIsAuthenticated(true);
        setLoading(false);
      } else {
        setIsAuthenticated(false);
        setLoading(false);
        router.push("/admin/login");
      }
    } else {
      const unsubscribe = onAuthStateChanged(adminAuth, (user) => {
        // Only allow users with admin emails to access the admin panel
        if (user && user.email && user.email.endsWith("@admin.riii.com")) {
          setIsAuthenticated(true);
          setLoading(false);
        } else {
          if (user) {
            signOut(adminAuth).catch(console.error);
          }
          setIsAuthenticated(false);
          setLoading(false);
          router.push("/admin/login");
        }
      });
      return () => unsubscribe();
    }
  }, [isLoginPage, router]);

  const handleSignOut = async () => {
    try {
      if (isMock) {
        localStorage.removeItem("mock_admin_logged_in");
      } else {
        await signOut(adminAuth);
      }
      setIsAuthenticated(false);
      setShowSignOutConfirm(false);
      router.push("/admin/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-950">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium animate-pulse">Verifying admin credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Prevents flashing content while redirecting
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Feedbacks", href: "/admin/feedbacks", icon: MessageSquare },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-cream flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-charcoal border-r border-charcoal/20 flex flex-col fixed inset-y-0 z-10 text-cream">
        <div className="h-16 flex items-center px-6 border-b border-charcoal-light/20 bg-charcoal-light/10">
          <span className="font-serif text-2xl font-bold text-gold tracking-widest">RIII JEWELS</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-charcoal-light text-gold shadow-sm border-l-2 border-gold pl-3"
                  : "text-cream/70 hover:bg-charcoal-light/50 hover:text-cream"
                  }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-gold" : "text-cream/55"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-charcoal-light/20">
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-rose hover:bg-rose/10 w-full transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen bg-cream">
        {children}
      </main>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm border border-charcoal/10 text-center animate-scale-in">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="font-serif text-2xl text-charcoal mb-2">Sign Out?</h2>
            <p className="text-sm text-charcoal/60 mb-6 leading-relaxed">
              Are you sure you want to sign out of the admin panel?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 border border-charcoal/15 text-charcoal/60 px-4 py-3 text-xs uppercase tracking-wider rounded-sm hover:border-charcoal/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 text-xs uppercase tracking-wider rounded-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

