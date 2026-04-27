import { useEffect, useState } from "react";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

export interface AdminInfo {
  email: string;
  is_super: boolean;
}

export interface AuthState {
  loading: boolean;
  user: User | null;
  admin: AdminInfo | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setAdmin(null);
        setAdminChecked(true);
        setLoading(false);
      } else {
        setAdminChecked(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user?.email) {
        setAdmin(null);
        setAdminChecked(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const email = user.email.toLowerCase();
      const { data, error } = await supabase
        .from("admins")
        .select("email, is_super")
        .eq("email", email)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // Table may not exist yet — treat as non-admin but don't crash
        // eslint-disable-next-line no-console
        console.warn("admin lookup failed:", error.message);
        setAdmin(null);
      } else if (data) {
        setAdmin({ email: data.email as string, is_super: !!data.is_super });
      } else {
        setAdmin(null);
      }
      setAdminChecked(true);
      setLoading(false);
    }
    if (!adminChecked) check();
    return () => {
      cancelled = true;
    };
  }, [user, adminChecked]);

  return {
    loading,
    user,
    admin,
    isAdmin: !!admin,
    isSuperAdmin: !!admin?.is_super,
  };
}
