import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthError, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, getSupabaseConfigError } from "../lib/supabase";
import type { Profile, UserRole } from "../types";

type AuthContextValue = {
  session: Session | null;
  authUser: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (username: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function cleanUsername(value?: string | null) {
  const clean = (value || "citrus")
    .trim()
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 24);
  return clean.length >= 3 ? clean : `user_${clean}`;
}

function usernameWithSuffix(base: string, suffix: string) {
  return `${base.slice(0, Math.max(3, 24 - suffix.length))}${suffix}`;
}

function displayNameFromEmail(email?: string | null) {
  if (!email) return "Citrus";
  return email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapProfile(row: {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  status?: "active" | "banned" | null;
  is_banned?: boolean | null;
  has_seen_conduct_notice: boolean | null;
  deletion_requested_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
}): Profile {
  return {
    id: row.id,
    email: row.email ?? "",
    username: row.username ?? cleanUsername(row.email?.split("@")[0]),
    displayName: row.display_name || row.username || displayNameFromEmail(row.email),
    avatarUrl: row.avatar_url,
    role: row.role ?? "user",
    status: row.status ?? (row.is_banned ? "banned" : "active"),
    isBanned: Boolean(row.is_banned) || row.status === "banned",
    hasSeenConductNotice: Boolean(row.has_seen_conduct_notice),
    deletionRequestedAt: row.deletion_requested_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
  };
}

function explainAuthError(error: AuthError | Error) {
  console.error("[Citrus] Auth error:", error);
  return error.message || "Auth-Fehler ohne Detailmeldung.";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function friendlyAuthError(error: AuthError | Error) {
  const message = explainAuthError(error).toLowerCase();
  if (message.includes("invalid login credentials")) return "Passwort stimmt nicht.";
  if (message.includes("email not confirmed")) return "Bitte bestätige zuerst deine E-Mail.";
  return error.message || "Auth-Vorgang fehlgeschlagen.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function ensureProfile(user: SupabaseUser, preferredUsername?: string): Promise<Profile> {
    if (!isSupabaseConfigured) throw new Error(getSupabaseConfigError());

    const selectColumns =
      "id,email,username,display_name,avatar_url,role,status,is_banned,has_seen_conduct_notice,deletion_requested_at,deleted_at,created_at";

    const existing = await supabase
      .from("profiles")
      .select(selectColumns)
      .eq("id", user.id)
      .maybeSingle();

    if (existing.error) {
      console.error("[Citrus] Profile lookup failed:", existing.error);
      throw new Error(`Profil konnte nicht geladen werden: ${existing.error.message}`);
    }

    if (existing.data) {
      const mapped = mapProfile(existing.data);
      if (mapped.isBanned || mapped.deletedAt) {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        throw new Error("Dieser Account wurde gesperrt.");
      }
      setProfile(mapped);
      return mapped;
    }

    const email = normalizeEmail(user.email ?? "");
    const baseUsername = cleanUsername(preferredUsername || user.user_metadata?.username || email.split("@")[0]);
    const displayName = user.user_metadata?.display_name || baseUsername || displayNameFromEmail(email);
    const suffix = user.id.replace(/-/g, "").slice(0, 4);
    const attempts = [baseUsername, usernameWithSuffix(baseUsername, suffix), `user_${suffix}`];

    let lastError: unknown;
    for (const username of attempts) {
      const inserted = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email,
          username,
          display_name: displayName,
          role: "user",
          status: "active",
          is_banned: false,
          has_seen_conduct_notice: false,
        })
        .select(selectColumns)
        .single();

      if (!inserted.error && inserted.data) {
        const mapped = mapProfile(inserted.data);
        setProfile(mapped);
        return mapped;
      }

      lastError = inserted.error;
      console.error("[Citrus] Profile insert attempt failed:", inserted.error);
      if (inserted.error?.code !== "23505") break;
    }

    throw new Error(
      lastError instanceof Error
        ? `Profil konnte nicht erstellt werden: ${lastError.message}`
        : "Profil konnte nicht erstellt werden.",
    );
  }

  async function refreshProfile() {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[Citrus] Session lookup failed:", error);
      throw error;
    }
    const currentUser = data.session?.user;
    if (!currentUser) {
      setProfile(null);
      return;
    }
    await ensureProfile(currentUser);
  }

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("[Citrus] Initial session failed:", error);
      setSession(data.session);
      if (data.session?.user) {
        try {
          await ensureProfile(data.session.user);
        } catch (profileError) {
          console.error("[Citrus] Initial ensureProfile failed:", profileError);
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
      window.setTimeout(() => {
        ensureProfile(nextSession.user)
          .catch((profileError) => {
            console.error("[Citrus] Auth state ensureProfile failed:", profileError);
            setProfile(null);
          })
          .finally(() => setLoading(false));
      }, 0);
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
      async signUp(username: string, email: string, password: string) {
        if (!isSupabaseConfigured) throw new Error(getSupabaseConfigError());
        const clean = cleanUsername(username);
        const normalizedEmail = normalizeEmail(email);
        const existsCheck = await supabase.rpc("profile_identifier_exists", {
          email_input: normalizedEmail,
          username_input: clean,
        });
        const exists = existsCheck.error ? null : existsCheck.data as { email_exists?: boolean; username_exists?: boolean } | null;
        if (exists?.username_exists) throw new Error("Dieser Benutzername ist bereits vergeben.");
        if (exists?.email_exists) throw new Error("Diese E-Mail ist bereits registriert.");
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              username: clean,
              display_name: clean,
            },
          },
        });
        if (error) throw new Error(friendlyAuthError(error));
        if (!data.user) throw new Error("Registrierung hat keinen Supabase-User zurückgegeben.");
        if (!data.session) {
          console.info("[Citrus] Signup created user but no session. Email confirmation is likely enabled.");
          return { needsConfirmation: true };
        }
        await ensureProfile(data.user, clean);
        return { needsConfirmation: false };
      },
      async signIn(identifier: string, password: string) {
        if (!isSupabaseConfigured) throw new Error(getSupabaseConfigError());
        const normalizedIdentifier = identifier.trim();
        let email = isEmail(normalizedIdentifier) ? normalizeEmail(normalizedIdentifier) : "";
        if (!email) {
          const { data: profileMatch, error: lookupError } = await supabase.rpc("resolve_login_identifier", {
            identifier: normalizedIdentifier,
          });
          const resolved = Array.isArray(profileMatch) ? profileMatch[0] : profileMatch;
          if (lookupError || !resolved?.email) throw new Error("Benutzername oder E-Mail nicht gefunden.");
          if (resolved.is_banned || resolved.status === "banned" || resolved.deleted_at) {
            throw new Error("Dieser Account wurde gesperrt.");
          }
          email = normalizeEmail(resolved.email);
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(friendlyAuthError(error));
        if (!data.user) throw new Error("Login hat keinen Supabase-User zurückgegeben.");
        await ensureProfile(data.user);
      },
      async signOut() {
        if (!isSupabaseConfigured) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(explainAuthError(error));
        setProfile(null);
      },
      async signOutEverywhere() {
        if (!isSupabaseConfigured) return;
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) throw new Error(explainAuthError(error));
        setProfile(null);
      },
      async updateEmail(email: string) {
        if (!isSupabaseConfigured) throw new Error(getSupabaseConfigError());
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw new Error(explainAuthError(error));
      },
      async updatePassword(password: string) {
        if (!isSupabaseConfigured) throw new Error(getSupabaseConfigError());
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(explainAuthError(error));
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
