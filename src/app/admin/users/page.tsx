"use client";

import { useState, useEffect } from "react";
import { getAllUsers, deleteUserByUid, UserProfile } from "@/lib/firebase/services";
import { Users, Mail, Phone, MapPin, RefreshCw, Eye, EyeOff, Lock, Trash2, AlertTriangle } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedUids, setRevealedUids] = useState<Set<string>>(new Set());
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleReveal = (uid: string) => {
    setRevealedUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleDelete = async (uid: string) => {
    setDeletingUid(uid);
    setConfirmDeleteUid(null);
    try {
      await deleteUserByUid(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (e) {
      console.error(e);
      alert("Failed to delete user. Please try again.");
    } finally {
      setDeletingUid(null);
    }
  };

  const userToDelete = users.find(u => u.uid === confirmDeleteUid);

  return (
    <div className="p-6 lg:p-8 bg-cream min-h-screen">

      {/* Confirm Delete Modal */}
      {confirmDeleteUid && userToDelete && (
        <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 bg-rose/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-rose" />
            </div>
            <h3 className="font-serif text-xl text-charcoal mb-2">Delete User?</h3>
            <p className="text-sm text-charcoal/60 mb-1">
              You are about to permanently delete:
            </p>
            <p className="font-semibold text-charcoal mb-1">{userToDelete.name || "—"}</p>
            <p className="text-sm text-charcoal/50 mb-6">{userToDelete.email}</p>
            <p className="text-xs text-charcoal/40 bg-cream px-4 py-3 rounded-sm mb-6 leading-relaxed">
              This will delete their profile and all associated orders from Firestore.
              They will be able to register again with the same email.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteUid(null)}
                className="flex-1 border border-charcoal/15 text-charcoal/70 py-3 text-xs uppercase tracking-wider hover:border-charcoal/30 transition-colors rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteUid)}
                className="flex-1 bg-rose text-white py-3 text-xs uppercase tracking-wider hover:bg-rose/80 transition-colors rounded-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-charcoal tracking-wide">Registered Users</h1>
          <p className="text-charcoal/40 text-sm mt-1">{users.length} total users</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-charcoal/60 hover:text-charcoal transition-colors border border-charcoal/15 px-4 py-2 rounded-sm hover:border-charcoal/30"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-charcoal/40 text-sm uppercase tracking-wider">Loading users...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-24 bg-ivory rounded-xl border border-cream-dark">
          <Users className="w-12 h-12 text-charcoal/15 mx-auto mb-4" />
          <p className="text-charcoal/40 font-serif text-xl">No registered users yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {users.map((user) => {
            const revealed = revealedUids.has(user.uid);
            const isDeleting = deletingUid === user.uid;
            return (
              <div key={user.uid} className={`bg-ivory rounded-xl border border-cream-dark shadow-sm p-5 transition-all ${isDeleting ? "opacity-40 pointer-events-none" : "hover:shadow-md"}`}>
                {/* Header row: avatar + delete button */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold font-serif text-xl border border-gold/15 flex-shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">{user.name || "—"}</p>
                      <p className="text-xs text-charcoal/40">Customer</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteUid(user.uid)}
                    className="p-2 text-charcoal/25 hover:text-rose hover:bg-rose/8 rounded-lg transition-all"
                    title="Delete user"
                  >
                    {isDeleting
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="space-y-2.5 border-t border-charcoal/5 pt-4">
                  {user.email && (
                    <div className="flex items-center gap-2.5 text-sm text-charcoal/60">
                      <Mail className="w-4 h-4 text-charcoal/30 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}

                  {/* Password row */}
                  <div className="flex items-center gap-2.5 text-sm text-charcoal/60">
                    <Lock className="w-4 h-4 text-charcoal/30 flex-shrink-0" />
                    {user.password ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono tracking-widest flex-1">
                          {revealed ? user.password : "•".repeat(Math.min(user.password.length, 12))}
                        </span>
                        <button
                          onClick={() => toggleReveal(user.uid)}
                          className="text-charcoal/30 hover:text-charcoal transition-colors flex-shrink-0"
                          title={revealed ? "Hide password" : "Show password"}
                        >
                          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-charcoal/30 italic text-xs">Password not saved</span>
                    )}
                  </div>

                  {user.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-charcoal/60">
                      <Phone className="w-4 h-4 text-charcoal/30 flex-shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {(user.address || user.city) && (
                    <div className="flex items-start gap-2.5 text-sm text-charcoal/60">
                      <MapPin className="w-4 h-4 text-charcoal/30 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        {[user.address, user.city, user.pincode].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {!user.phone && !user.address && (
                    <p className="text-xs text-charcoal/30 italic">No address saved yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
