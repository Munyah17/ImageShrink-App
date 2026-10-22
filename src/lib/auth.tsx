import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';
import { PLANS, planOf, type Plan, type PlanId } from './plans';

export type AuthUser = {
  id: string;
  email: string;
  plan: PlanId;
};

export type UsageSnapshot = {
  compress: { used: number; limit: number };
  ai: { used: number; limit: number };
};

type AuthContextValue = {
  loading: boolean;
  user: AuthUser | null;
  plan: Plan;
  usage: UsageSnapshot | null;
  health: { aiConfigured: boolean; accountsConfigured: boolean; billingConfigured: boolean } | null;
  refresh: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  startCheckout: (plan: 'plus' | 'pro') => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plan, setPlan] = useState<Plan>(PLANS.free);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [health, setHealth] = useState<AuthContextValue['health']>(null);

  const refresh = useCallback(async () => {
    const healthPayload = await api<{
      ok: boolean;
      aiConfigured: boolean;
      accountsConfigured: boolean;
      billingConfigured: boolean;
    }>('/api/health').catch(() => null);
    setHealth(healthPayload);

    const me = await api<{ user: AuthUser | null; plan: Plan }>('/api/auth/me').catch(() => null);
    if (me) {
      setUser(me.user);
      setPlan(planOf(me.plan?.id ?? me.user?.plan));
    } else {
      setUser(null);
      setPlan(PLANS.free);
    }

    const usagePayload = await api<{ usage: UsageSnapshot; plan: Plan; user: AuthUser | null }>('/api/usage').catch(
      () => null,
    );
    if (usagePayload) {
      setUsage(usagePayload.usage);
      setPlan(planOf(usagePayload.plan.id));
      if (usagePayload.user) setUser(usagePayload.user);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signup = useCallback(async (email: string, password: string) => {
    const result = await api<{ user: AuthUser; plan: Plan }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
    setPlan(planOf(result.plan.id));
    await refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ user: AuthUser; plan: Plan }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
    setPlan(planOf(result.plan.id));
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setPlan(PLANS.free);
    await refresh();
  }, [refresh]);

  const startCheckout = useCallback(async (planId: 'plus' | 'pro') => {
    const result = await api<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: planId }),
    });
    window.location.assign(result.url);
  }, []);

  const value = useMemo(
    () => ({ loading, user, plan, usage, health, refresh, signup, login, logout, startCheckout }),
    [health, loading, login, logout, plan, refresh, signup, startCheckout, usage, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

export function formatAuthError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}
