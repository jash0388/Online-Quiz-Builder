import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import SphnHeader from "@/components/SphnHeader";
import { useAuth } from "@/lib/useAuth";
import { useProfile, saveProfile } from "@/lib/useProfile";
import { signOut } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CompleteProfile() {
  const [, navigate] = useLocation();
  const { loading: authLoading, user, isAdmin } = useAuth();
  const { loading: profileLoading, profile, refresh } = useProfile();
  const [colleges, setColleges] = useState<string[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(true);

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [college, setCollege] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/");
      return;
    }
  }, [authLoading, user, navigate]);
  
  // Pre-fill from existing profile or Google account
  useEffect(() => {
    if (profileLoading) return;
    if (profile) {
      setName(profile.name);
      setRollNumber(profile.roll_number);
      setPhone(profile.phone);
      setFatherName(profile.father_name);
      setFatherPhone(profile.father_phone);
      setCollege(profile.college);
    } else if (user?.displayName) {
      setName(user.displayName);
    }
  }, [profileLoading, profile, user]);

  // Fetch unique colleges from admins table
  useEffect(() => {
    async function loadColleges() {
      const { data } = await supabase
        .from("admins")
        .select("college")
        .not("college", "is", null);
      if (data) {
        const unique = Array.from(new Set(data.map((r) => r.college as string))).sort();
        setColleges(unique);
      }
      setCollegesLoading(false);
    }
    loadColleges();
  }, []);

  function validatePhone(p: string): boolean {
    return /^\+?\d{7,15}$/.test(p.replace(/[\s-]/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      navigate("/");
      return;
    }
    if (!name.trim() || !rollNumber.trim() || !phone.trim() || !fatherName.trim() || !fatherPhone.trim() || !college.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!validatePhone(phone) || !validatePhone(fatherPhone)) {
      setError("Phone numbers must be 7–15 digits (you may include + and country code).");
      return;
    }

    setBusy(true);
    const { error: err } = await saveProfile({
      uid: user.uid,
      email: user.email ?? "",
      name: name.trim(),
      roll_number: rollNumber.trim(),
      phone: phone.trim(),
      father_name: fatherName.trim(),
      father_phone: fatherPhone.trim(),
      college: college.trim(),
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refresh();
    navigate("/exams");
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  const isFirstTime = !profile;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SphnHeader
        subtitle={isFirstTime ? "Complete Your Profile" : "Edit Your Profile"}
        rightSlot={
          isAdmin ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => navigate("/admin")}
            >
              Admin Panel
            </Button>
          ) : undefined
        }
      />

      <main className="flex-1 flex justify-center p-5 sm:p-8">
        <Card className="w-full max-w-2xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              {isFirstTime ? "Tell us a bit about yourself" : "Edit your details"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isFirstTime
                ? "We need a few details before you can start your tests. This is a one-time step — we'll remember it next time."
                : "Update any details that have changed."}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Signed in as <span className="font-medium text-slate-600">{user?.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" htmlFor="name" required>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="h-11"
                  data-testid="input-name"
                />
              </Field>
              <Field label="Roll number" htmlFor="roll" required>
                <Input
                  id="roll"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 22B81A0501"
                  className="h-11"
                  data-testid="input-roll"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your phone number" htmlFor="phone" required>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="h-11"
                  data-testid="input-phone"
                />
              </Field>
              <Field label="Father's / Guardian's phone" htmlFor="father-phone" required>
                <Input
                  id="father-phone"
                  type="tel"
                  inputMode="tel"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="h-11"
                  data-testid="input-father-phone"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Father's / Guardian's name" htmlFor="father-name" required>
                <Input
                  id="father-name"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Full name"
                  className="h-11"
                  data-testid="input-father-name"
                />
              </Field>
              <Field label="College" htmlFor="college" required>
                <Select value={college} onValueChange={setCollege}>
                  <SelectTrigger id="college" className="h-11">
                    <SelectValue placeholder={collegesLoading ? "Loading colleges…" : "Select your college"} />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    {colleges.length === 0 && !collegesLoading && (
                      <SelectItem value="Sphoorthy Engineering College" disabled>
                        Sphoorthy Engineering College
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="submit"
                disabled={busy}
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold h-11 px-6 flex-1"
                data-testid="button-save-profile"
              >
                {busy ? "Saving…" : isFirstTime ? "Save & continue to tests" : "Save changes"}
              </Button>
              {!isFirstTime && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => navigate("/exams")}
                >
                  Cancel
                </Button>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline w-full text-center pt-2"
            >
              Sign out
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
