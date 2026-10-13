import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { AuthContext } from "./authContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, fetchProfile }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
