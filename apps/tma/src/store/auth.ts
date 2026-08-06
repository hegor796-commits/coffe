import { create } from 'zustand';
import { Role } from '@coffee/shared';

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  branding: { primaryColor?: string; logoUrl?: string | null };
  paymentMode: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
  locationId: string | null;
  tenant: TenantInfo | null;
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    role: Role;
    locationId?: string;
    tenant: TenantInfo;
  }) => void;
  clear: () => void;
}

const STORAGE_KEY = 'coffee_auth';

function persisted(): Partial<AuthState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: persisted().accessToken ?? null,
  refreshToken: persisted().refreshToken ?? null,
  role: (persisted().role as Role) ?? null,
  locationId: persisted().locationId ?? null,
  tenant: (persisted().tenant as TenantInfo) ?? null,
  setAuth: (data) => {
    const next = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      role: data.role,
      locationId: data.locationId ?? null,
      tenant: data.tenant,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set(next);
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, role: null, locationId: null, tenant: null });
  },
}));
