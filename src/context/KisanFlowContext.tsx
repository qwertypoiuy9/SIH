import React, { createContext, useContext, useState, useEffect } from 'react';
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
  UserProfile,
} from '../types';
import { INITIAL_CENTRES, INITIAL_CROPS } from '../data/mockData';
import {
  SupabaseConfig,
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  SupabaseDataService,
} from '../services/supabaseDataService';
import { soundController } from '../utils/audio';

interface KisanFlowContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  activePortal: ActivePortalView;
  setActivePortal: (portal: ActivePortalView) => void;

  // Sidebar views
  farmerView: FarmerSidebarView;
  setFarmerView: (v: FarmerSidebarView) => void;
  operatorView: OperatorSidebarView;
  setOperatorView: (v: OperatorSidebarView) => void;
  govtView: GovernmentSidebarView;
  setGovtView: (v: GovernmentSidebarView) => void;

  // Authentication
  authSession: AuthSession;
  loginUser: (profile: UserProfile) => void;
  logoutUser: () => void;

  // Database
  supabaseConfig: SupabaseConfig;
  saveSupabaseSettings: (cfg: SupabaseConfig) => void;
  clearDatabase: () => void;

  // Master Data
  centres: Centre[];
  crops: Crop[];

  // Database-driven Data
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
const SESSION_STORAGE_KEY = 'kisanflow_session_v2';

export const KisanFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('te');
  const [activePortal, setActivePortal] = useState<ActivePortalView>('login');

  // Sidebar views
  const [farmerView, setFarmerView] = useState<FarmerSidebarView>('dashboard');
  const [operatorView, setOperatorView] = useState<OperatorSidebarView>('dashboard');
  const [govtView, setGovtView] = useState<GovernmentSidebarView>('overview');

  // Supabase config
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());

  // Auth session
  const [authSession, setAuthSession] = useState<AuthSession>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {
      isAuthenticated: false,
      user: null,
      role: null,
    };
  });

  // Master Data
  const [centres, setCentres] = useState<Centre[]>(INITIAL_CENTRES);
  const [crops] = useState<Crop[]>(INITIAL_CROPS);

  // Dynamic Live Database Data
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modals
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const refreshRegistrations = async () => {
    const regs = await SupabaseDataService.getAllRegistrations();
    setRegistrations(regs);
  };

  const refreshPayments = async () => {
    const pays = await SupabaseDataService.getPayments();
    setPayments(pays);
  };

  const refreshNotifications = async () => {
    if (authSession.user) {
      const notifs = await SupabaseDataService.getNotifications(authSession.user.id);
      setNotifications(notifs);
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    refreshRegistrations();
    refreshPayments();
  }, []);

  useEffect(() => {
    if (authSession.isAuthenticated && authSession.user) {
      refreshNotifications();
      if (authSession.role === 'farmer') setActivePortal('farmer');
      else if (authSession.role === 'operator') setActivePortal('operator');
      else if (authSession.role === 'government') setActivePortal('government');
    }
  }, [authSession.isAuthenticated, authSession.user?.id]);

  const loginUser = (profile: UserProfile) => {
    const session: AuthSession = {
      isAuthenticated: true,
      user: profile,
      role: profile.role,
    };
    setAuthSession(session);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore
    }

    if (profile.role === 'farmer') {
      setActivePortal('farmer');
      setFarmerView('dashboard');
    } else if (profile.role === 'operator') {
      setActivePortal('operator');
      setOperatorView('dashboard');
    } else if (profile.role === 'government') {
      setActivePortal('government');
      setGovtView('overview');
    }
    soundController.playTurnChime();
  };

  const logoutUser = () => {
    setAuthSession({
      isAuthenticated: false,
      user: null,
      role: null,
    });
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setActivePortal('login');
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

  const bookFarmerSlot = async (data: {
    crop: string;
    quantity: number;
    centreId: string;
    vehicleNumber?: string;
    preferredDate?: string;
    preferredTime?: string;
  }): Promise<Registration> => {
    if (!authSession.user) throw new Error('User not logged in');

    const centre = centres.find(c => c.id === data.centreId);
    const preferredDate = data.preferredDate || new Date().toISOString().split('T')[0];
    const preferredTime = data.preferredTime || '10:00 AM';

    const newReg = await SupabaseDataService.createRegistration({
      farmer_id: authSession.user.id,
      farmer_name: authSession.user.name,
      phone: authSession.user.phone,
      farmer_reg_id: authSession.user.aadhaar_masked || 'FRM-' + authSession.user.phone.slice(-4),
      village: authSession.user.village || 'Lakshmipur',
      district: authSession.user.district || 'Warangal',
      crop: data.crop,
      quantity_quintals: data.quantity,
      vehicle_number: data.vehicleNumber || 'TS-03-TR-' + Math.floor(1000 + Math.random() * 9000),
      centre_id: data.centreId,
      centre_name: centre?.name || 'Lakshmipur Procurement Centre',
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      delay_minutes: 0,
    });

    await refreshRegistrations();
    await refreshNotifications();
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
      registrationId,
      stage,
      status,
      operatorName,
      extra
    );

    if (success) {
      await refreshRegistrations();
      await refreshPayments();
      await refreshNotifications();
      soundController.playTurnChime();
    }
    return success;
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <KisanFlowContext.Provider
      value={{
        language,
        setLanguage,
        activePortal,
        setActivePortal,
        farmerView,
        setFarmerView,
        operatorView,
        setOperatorView,
        govtView,
        setGovtView,
        authSession,
        loginUser,
        logoutUser,
        supabaseConfig,
        saveSupabaseSettings,
        clearDatabase,
        centres,
        crops,
        registrations,
        refreshRegistrations,
        payments,
        refreshPayments,
        notifications,
        refreshNotifications,
        bookFarmerSlot,
        updateRegistrationStage,
        markNotificationRead,
        isVoiceAssistantOpen,
        setIsVoiceAssistantOpen,
        isPhoneModalOpen,
        setIsPhoneModalOpen,
      }}
    >
      {children}
    </KisanFlowContext.Provider>
  );
};

export const useKisanFlow = () => {
  const context = useContext(KisanFlowContext);
  if (!context) {
    throw new Error('useKisanFlow must be used within a KisanFlowProvider');
  }
  return context;
};
