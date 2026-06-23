import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

type AuthContextValue = {
  session: Session | null;
  authUser: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function displayNameFromEmail(email?: string | null) {
  if (!email) return "Anton";
  return email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapProfile(row: {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}): Profile {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name || displayNameFromEmail(row.email),
    avatarUrl: row.avatar_url,
    createdAt: row.created_at ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function ensureProfile(user: SupabaseUser) {
    const email = user.email ?? "";
    const displayName = displayNameFromEmail(email);

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email,
          display_name: displayName,
        },
        { onConflict: "id" },
      )
      .select("id,email,display_name,avatar_url,created_at")
      .single();

    if (error) throw error;
    setProfile(mapProfile(data));
  }

  async function refreshProfile() {
    const currentUser = session?.user;
    if (!currentUser) {
      setProfile(null);
      return;
    }
    await ensureProfile(currentUser);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        try {
          await ensureProfile(data.session.user);
        } catch {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      ensureProfile(nextSession.user).finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser: session?.user ?? null,
      profile,
      loading,
      async signUp(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayNameFromEmail(email),
            },
          },
        });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user);
      },
      async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user);
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setProfile(null);
      },
      refreshProfile,
    }),
    [loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
