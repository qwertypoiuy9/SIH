import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import {
  ActivePortalView,
  AuthSession,
  Centre,
  Crop,
  FarmerSidebarView,
  GovernmentSidebarView,
  LanguageCode,
  NotificationItem,
  OperatorSidebarView,
  PaymentRecord,
  ProcurementStage,
  ProcurementStatus,
  Registration,
  SupportSidebarView,
  UserProfile,
} from '../types';
import {
  supabase,
  signOut,
  fetchProfile,
  upsertProfile,
} from '../utils/supabaseAuth';
import {
  SupabaseConfig,
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  SupabaseDataService,
} from '../services/supabaseDataService';
import { soundController } from '../utils/audio';
import { fetchCropsForLocation } from '../services/cropService';
import { fetchCentresFromDB } from '../services/centreService';

// ── Fallback static data for offline/no-auth scenarios ──────────────────────
const FALLBACK_CENTRES: Centre[] = [
  { id: 'ctr_wgl_lakshmipur', name: 'Lakshmipur Government Procurement Centre', district: 'Warangal', state: 'Telangana', latitude: 17.9784, longitude: 79.5941, capacity_per_day: 150, current_queue: 0, status: 'OPTIMAL', distance_km: 0, avg_processing_mins: 45, open_hours: '08:30 AM - 05:30 PM', counters_active: 3 },
  { id: 'ctr_wgl_ramapuram', name: 'Ramapuram APMC Procurement Centre', district: 'Warangal', state: 'Telangana', latitude: 18.0023, longitude: 79.5702, capacity_per_day: 180, current_queue: 0, status: 'OPTIMAL', distance_km: 0, avg_processing_mins: 40, open_hours: '08:00 AM - 06:00 PM', counters_active: 4 },
  { id: 'ctr_wgl_kothuru', name: 'Kothuru Primary Processing Centre', district: 'Warangal', state: 'Telangana', latitude: 17.9345, longitude: 79.6112, capacity_per_day: 120, current_queue: 0, status: 'OPTIMAL', distance_km: 0, avg_processing_mins: 50, open_hours: '09:00 AM - 05:00 PM', counters_active: 2 },
];

interface KisanFlowContextType {
  // Language
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;

  // Portal / navigation (kept for backward compat with existing dashboards)
  activePortal: ActivePortalView;
  setActivePortal: (portal: ActivePortalView) => void;

  // Sidebar views
  farmerView: FarmerSidebarView;
  setFarmerView: (v: FarmerSidebarView) => void;
  operatorView: OperatorSidebarView;
  setOperatorView: (v: OperatorSidebarView) => void;
  govtView: GovernmentSidebarView;
  setGovtView: (v: GovernmentSidebarView) => void;
  supportView: SupportSidebarView;
  setSupportView: (v: SupportSidebarView) => void;

  // Authentication — real Supabase Auth
  authSession: AuthSession;
  supabaseSession: Session | null;
  authLoading: boolean;
  loginUser: (profile: UserProfile) => void; // kept for legacy operator/govt tabs
  logoutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Database config
  supabaseConfig: SupabaseConfig;
  saveSupabaseSettings: (cfg: SupabaseConfig) => void;
  clearDatabase: () => void;

  // Master Data — dynamic
  centres: Centre[];
  crops: Crop[];
  refreshCentres: () => Promise<void>;
  refreshCrops: () => Promise<void>;

  // Live Database Data
  registrations: Registration[];
  refreshRegistrations: () => Promise<void>;
  payments: PaymentRecord[];
  refreshPayments: () => Promise<void>;
  notifications: NotificationItem[];
  refreshNotifications: () => Promise<void>;

  // Actions
  bookFarmerSlot: (data: {
    crop: string;
    quantity: number;
    centreId: string;
    vehicleNumber?: string;
    preferredDate?: string;
    preferredTime?: string;
  }) => Promise<Registration>;

  updateRegistrationStage: (
    registrationId: string,
    stage: ProcurementStage,
    status: ProcurementStatus,
    extra?: {
      delayMinutes?: number;
      bottleneckRemarks?: string;
      qualityCheck?: { moisture_percentage?: number; quality_result?: string; remarks?: string };
      weighing?: { gross_weight?: number; tare_weight?: number; net_weight?: number; remarks?: string };
      bagging?: { number_of_bags?: number; labour_delay_reported?: boolean; delay_reason?: string };
    }
  ) => Promise<boolean>;

  markNotificationRead: (id: string) => void;

  // Modals
  isVoiceAssistantOpen: boolean;
  setIsVoiceAssistantOpen: (open: boolean) => void;
  isPhoneModalOpen: boolean;
  setIsPhoneModalOpen: (open: boolean) => void;
}

const KisanFlowContext = createContext<KisanFlowContextType | undefined>(undefined);

export const KisanFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('te');
  const [activePortal, setActivePortal] = useState<ActivePortalView>('login');
  const [farmerView, setFarmerView] = useState<FarmerSidebarView>('dashboard');
  const [operatorView, setOperatorView] = useState<OperatorSidebarView>('dashboard');
  const [govtView, setGovtView] = useState<GovernmentSidebarView>('overview');
  const [supportView, setSupportView] = useState<SupportSidebarView>('dashboard');
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());

  // ── Auth state (real Supabase) ──────────────────────────────────────────
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSession, setAuthSession] = useState<AuthSession>({
    isAuthenticated: false,
    user: null,
    role: null,
  });

  // ── Master data ──────────────────────────────────────────────────────────
  const [centres, setCentres] = useState<Centre[]>(FALLBACK_CENTRES);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  // ── Navigate to the correct portal after auth ─────────────────────────
  const navigateByRole = useCallback((role: string | null, portal?: ActivePortalView) => {
    if (portal) { setActivePortal(portal); return; }
    if (role === 'farmer') { setActivePortal('farmer'); setFarmerView('dashboard'); }
    else if (role === 'operator') { setActivePortal('operator'); setOperatorView('dashboard'); }
    else if (role === 'government') { setActivePortal('government'); setGovtView('overview'); }
    else if (role === 'support') { setActivePortal('support'); setSupportView('dashboard'); }
    else setActivePortal('login');
  }, []);

  // ── Load profile from Supabase and update auth state ─────────────────
  const loadProfileAndSetAuth = useCallback(async (session: Session) => {
    let profile = await fetchProfile(session.user.id);

    if (!profile) {
      // New user — create a minimal profile from auth metadata
      const meta = session.user.user_metadata || {};
      profile = {
        id: session.user.id,
        role: (meta.role as UserProfile['role']) || 'farmer',
        name: meta.name || session.user.email?.split('@')[0] || 'User',
        phone: meta.phone || '',
        email: session.user.email,
        preferred_language: (meta.preferred_language as LanguageCode) || 'te',
      };
      await upsertProfile(profile);
    }

    setAuthSession({
      isAuthenticated: true,
      user: profile,
      role: profile.role,
    });

    if (profile.preferred_language) setLanguage(profile.preferred_language);
    navigateByRole(profile.role);

    // Refresh data for the logged-in user
    refreshRegistrationsImpl();
    refreshPaymentsImpl();
    if (profile) {
      refreshNotificationsImpl(session.user.id);
    }

    // Load dynamic crops based on farmer district
    if (profile.district) {
      fetchCropsForLocation(profile.district, profile.state).then(setCrops);
    } else {
      fetchCropsForLocation().then(setCrops);
    }

    // Load centres dynamically
    fetchCentresFromDB(profile.latitude, profile.longitude).then(c => {
      if (c.length > 0) setCentres(c);
    });
  }, [navigateByRole]);

  // ── Listen to Supabase Auth changes ──────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSupabaseSession(session);
      if (session) {
        loadProfileAndSetAuth(session).finally(() => {
          if (mounted) setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
        setActivePortal('login');
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSupabaseSession(session);
      if (session) {
        setAuthLoading(true);
        loadProfileAndSetAuth(session).finally(() => {
          if (mounted) setAuthLoading(false);
        });
      } else {
        setAuthSession({ isAuthenticated: false, user: null, role: null });
        setActivePortal('login');
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileAndSetAuth]);

  // ── Legacy loginUser — for operator/govt/support tabs that skip Supabase Auth ──
  const loginUser = useCallback((profile: UserProfile) => {
    setAuthSession({ isAuthenticated: true, user: profile, role: profile.role });
    navigateByRole(profile.role);
    soundController.playTurnChime();
    // Refresh data
    refreshRegistrationsImpl();
    refreshPaymentsImpl();
  }, [navigateByRole]);

  const logoutUser = useCallback(async () => {
    await signOut();
    setAuthSession({ isAuthenticated: false, user: null, role: null });
    setSupabaseSession(null);
    setActivePortal('login');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabaseSession) return;
    await loadProfileAndSetAuth(supabaseSession);
  }, [supabaseSession, loadProfileAndSetAuth]);

  // ── Data refresh functions ─────────────────────────────────────────────
  const refreshRegistrationsImpl = async () => {
    const regs = await SupabaseDataService.getAllRegistrations();
    setRegistrations(regs);
  };

  const refreshPaymentsImpl = async () => {
    const pays = await SupabaseDataService.getPayments();
    setPayments(pays);
  };

  const refreshNotificationsImpl = async (userId?: string) => {
    const uid = userId || supabaseSession?.user?.id || authSession.user?.id;
    if (uid) {
      const notifs = await SupabaseDataService.getNotifications(uid);
      setNotifications(notifs);
    }
  };

  const refreshRegistrations = async () => refreshRegistrationsImpl();
  const refreshPayments = async () => refreshPaymentsImpl();
  const refreshNotifications = async () => refreshNotificationsImpl();

  const refreshCentres = async () => {
    const profile = authSession.user;
    const c = await fetchCentresFromDB(profile?.latitude, profile?.longitude);
    if (c.length > 0) setCentres(c);
  };

  const refreshCrops = async () => {
    const profile = authSession.user;
    const c = await fetchCropsForLocation(profile?.district, profile?.state);
    setCrops(c);
  };

  // Initial load
  useEffect(() => {
    refreshRegistrationsImpl();
    refreshPaymentsImpl();
    fetchCropsForLocation().then(setCrops);
  }, []);

  // ── Book farmer slot ──────────────────────────────────────────────────
  const bookFarmerSlot = async (data: {
    crop: string;
    quantity: number;
    centreId: string;
    vehicleNumber?: string;
    preferredDate?: string;
    preferredTime?: string;
  }): Promise<Registration> => {
    const user = authSession.user;
    if (!user) throw new Error('User not logged in');
    const centre = centres.find(c => c.id === data.centreId);
    const preferredDate = data.preferredDate || new Date().toISOString().split('T')[0];
    const preferredTime = data.preferredTime || '10:00 AM';

    const newReg = await SupabaseDataService.createRegistration({
      farmer_id: user.id,
      farmer_name: user.name,
      phone: user.phone,
      farmer_reg_id: user.aadhaar_masked || 'FRM-' + user.phone.slice(-4),
      village: user.village || '',
      district: user.district || '',
      crop: data.crop,
      quantity_quintals: data.quantity,
      vehicle_number: data.vehicleNumber || 'TS-03-TR-' + Math.floor(1000 + Math.random() * 9000),
      centre_id: data.centreId,
      centre_name: centre?.name || 'Procurement Centre',
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      delay_minutes: 0,
      estimated_processing_mins: 35,
    });

    await refreshRegistrationsImpl();
    await refreshNotificationsImpl();
    soundController.playSuccessChime();
    return newReg;
  };

  const updateRegistrationStage = async (
    registrationId: string,
    stage: ProcurementStage,
    status: ProcurementStatus,
    extra?: {
      delayMinutes?: number;
      bottleneckRemarks?: string;
      qualityCheck?: { moisture_percentage?: number; quality_result?: string; remarks?: string };
      weighing?: { gross_weight?: number; tare_weight?: number; net_weight?: number; remarks?: string };
      bagging?: { number_of_bags?: number; labour_delay_reported?: boolean; delay_reason?: string };
    }
  ): Promise<boolean> => {
    const operatorName = authSession.user?.name || 'Mandi Operator';
    const success = await SupabaseDataService.updateProcurementStage(
      registrationId, stage, status, operatorName, extra
    );
    if (success) {
      await refreshRegistrationsImpl();
      await refreshPaymentsImpl();
      await refreshNotificationsImpl();
      soundController.playTurnChime();
    }
    return success;
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const saveSupabaseSettings = (cfg: SupabaseConfig) => {
    setSupabaseConfig(cfg);
    saveSupabaseConfig(cfg);
  };

  const clearDatabase = () => {
    SupabaseDataService.clearAllDatabase();
    setRegistrations([]);
    setPayments([]);
    setNotifications([]);
  };

  return (
    <KisanFlowContext.Provider value={{
      language, setLanguage,
      activePortal, setActivePortal,
      farmerView, setFarmerView,
      operatorView, setOperatorView,
      govtView, setGovtView,
      supportView, setSupportView,
      authSession, supabaseSession, authLoading,
      loginUser, logoutUser, refreshProfile,
      supabaseConfig, saveSupabaseSettings, clearDatabase,
      centres, crops, refreshCentres, refreshCrops,
      registrations, refreshRegistrations,
      payments, refreshPayments,
      notifications, refreshNotifications,
      bookFarmerSlot, updateRegistrationStage,
      markNotificationRead,
      isVoiceAssistantOpen, setIsVoiceAssistantOpen,
      isPhoneModalOpen, setIsPhoneModalOpen,
    }}>
      {children}
    </KisanFlowContext.Provider>
  );
};

export const useKisanFlow = (): KisanFlowContextType => {
  const ctx = useContext(KisanFlowContext);
  if (!ctx) throw new Error('useKisanFlow must be used within KisanFlowProvider');
  return ctx;
};
