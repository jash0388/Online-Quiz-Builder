import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

export interface StudentProfile {
  uid: string;
  email: string;
  name: string;
  roll_number: string;
  phone: string;
  father_name: string;
  father_phone: string;
  college: string;
  is_approved: boolean;
  completed_at?: string;
  updated_at?: string;
}

export interface ProfileState {
  loading: boolean;
  profile: StudentProfile | null;
  refresh: () => Promise<void>;
}

export function useProfile(): ProfileState {
  const { loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("uid", user.uid)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("profile lookup failed:", error.message);
      setProfile(null);
    } else {
      setProfile((data as StudentProfile) ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return { loading: authLoading || loading, profile, refresh };
}

export async function saveProfile(p: StudentProfile) {
  return supabase.from("student_profiles").upsert(
    {
      ...p,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "uid" },
  );
}
