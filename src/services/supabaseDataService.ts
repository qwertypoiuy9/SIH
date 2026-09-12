import {
  Registration,
  QualityCheckRecord,
  WeighingRecord,
  BaggingRecord,
  JFormRecord,
  PaymentRecord,
  NotificationItem,
  AuditLog,
  ProcurementStage,
  ProcurementStatus,
  UserProfile,
  Centre,
} from '../types';
import { supabase } from '../utils/supabaseAuth';

export const DEFAULT_SUPABASE_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
export const DEFAULT_SUPABASE_ANON_KEY = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_STORAGE_KEY = 'KisanQ_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        url: parsed.url || DEFAULT_SUPABASE_URL,
        anonKey: parsed.anonKey || DEFAULT_SUPABASE_ANON_KEY,
        connected: parsed.connected !== undefined ? parsed.connected : true,
      };
    }
  } catch { /* Ignore */ }
  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY, connected: true };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  try { localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config)); } catch { /* Ignore */ }
}

export function getSupabaseClient() { return supabase; }

// Helper to log activity events
async function logActivityEvent(event_type: string, entity_type: string, entity_id: string, details: any = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.from('activity_events').insert({
      user_id: session.user.id,
      event_type,
      entity_type,
      entity_id,
      details,
    });
  }
}

export const SupabaseDataService = {
  async getNextTokenNumber(centreId: string, preferredDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('registrations')
      .select('token_number')
      .eq('centre_id', centreId)
      .eq('preferred_date', preferredDate)
      .order('token_number', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      return Number(data[0].token_number) + 1;
    }
    return 1;
  },

  async createRegistration(
    params: Omit<Registration, 'id' | 'token_number' | 'queue_position' | 'current_stage' | 'procurement_status' | 'created_at'>
  ): Promise<Registration> {
    const token = await this.getNextTokenNumber(params.centre_id, params.preferred_date);

    // Calculate queue position
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('centre_id', params.centre_id)
      .eq('preferred_date', params.preferred_date)
      .neq('procurement_status', 'PROCUREMENT_COMPLETED')
      .neq('procurement_status', 'QUALITY_REJECTED');
      
    const waitingAhead = count || 0;

    const newReg: Registration = {
      ...params,
      id: `reg_${Date.now()}_${token}`,
      token_number: token,
      queue_position: waitingAhead + 1,
      current_stage: 'GATE_ENTRY',
      procurement_status: 'WAITING_FOR_GATE_ENTRY',
      estimated_processing_mins: 35 + (waitingAhead * 20),
      delay_minutes: 0,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('registrations').insert(newReg);
    if (error) throw error;

    await logActivityEvent('registration_created', 'registration', newReg.id, { token_number: token });

    await this.createNotification({
      user_id: newReg.farmer_id,
      title: 'Slot Confirmed & Token Assigned',
      message: `Token #${token} issued for ${newReg.crop} (${newReg.quantity_quintals} Qtl). Date: ${newReg.preferred_date} at ${newReg.centre_name || 'Procurement Centre'}.`,
      channel: 'SMS',
    });

    await this.createAuditLog({
      registration_id: newReg.id,
      stage: 'GATE_ENTRY',
      previous_status: 'NEW',
      new_status: 'WAITING_FOR_GATE_ENTRY',
      updated_by: newReg.farmer_name,
      remarks: 'Slot booked online by farmer.',
    });

    return newReg;
  },

  async getAllRegistrations(): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getRegistrationsForFarmer(farmerId: string): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getRegistrationsForCentre(centreId: string): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('centre_id', centreId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async updateProcurementStage(
    registrationId: string,
    newStage: ProcurementStage,
    newStatus: ProcurementStatus,
    operatorName: string,
    extraData?: {
      delayMinutes?: number;
      bottleneckRemarks?: string;
      qualityCheck?: Partial<QualityCheckRecord>;
      weighing?: Partial<WeighingRecord>;
      bagging?: Partial<BaggingRecord>;
      jForm?: Partial<JFormRecord>;
      payment?: Partial<PaymentRecord>;
    }
  ): Promise<boolean> {
    
    // Get existing reg
    const { data: existingRegs } = await supabase.from('registrations').select('*').eq('id', registrationId);
    if (!existingRegs || existingRegs.length === 0) return false;
    const prev = existingRegs[0];

    const updates: any = {
      current_stage: newStage,
      procurement_status: newStatus,
      delay_minutes: extraData?.delayMinutes !== undefined ? extraData.delayMinutes : prev.delay_minutes,
      bottleneck_remarks: extraData?.bottleneckRemarks || prev.bottleneck_remarks,
    };

    if (newStatus === 'PROCUREMENT_COMPLETED' || newStatus === 'QUALITY_REJECTED') {
      updates.queue_position = 0;
    }

    const { error } = await supabase.from('registrations').update(updates).eq('id', registrationId);
    if (error) return false;

    await logActivityEvent('registration_updated', 'registration', registrationId, { new_stage: newStage, new_status: newStatus });

    if (extraData?.qualityCheck) {
      await supabase.from('quality_checks').insert({
        id: `qc_${Date.now()}`,
        registration_id: registrationId,
        moisture_percentage: extraData.qualityCheck.moisture_percentage || 13.5,
        quality_result: extraData.qualityCheck.quality_result || 'FAQ (Fair Average Quality)',
        faq_compliant: extraData.qualityCheck.faq_compliant !== false,
        assayer_name: operatorName,
        assayer_remarks: extraData.qualityCheck.assayer_remarks || 'Quality within FAQ standards.',
        status: newStatus,
        created_at: new Date().toISOString(),
      });
    }

    if (extraData?.weighing) {
      await supabase.from('weighing_records').insert({
        id: `wb_${Date.now()}`,
        registration_id: registrationId,
        gross_weight: extraData.weighing.gross_weight || prev.quantity_quintals + 15,
        tare_weight: extraData.weighing.tare_weight || 15,
        net_weight: extraData.weighing.net_weight || prev.quantity_quintals,
        weighbridge_slip_number: extraData.weighing.weighbridge_slip_number || `WB-${Date.now().toString().slice(-6)}`,
        operator_name: operatorName,
        operator_remarks: extraData.weighing.operator_remarks || 'Electronic weighbridge verified.',
        status: newStatus,
        created_at: new Date().toISOString(),
      });
    }

    if (extraData?.bagging) {
      await supabase.from('bagging_records').insert({
        id: `bag_${Date.now()}`,
        registration_id: registrationId,
        number_of_bags: extraData.bagging.number_of_bags || Math.round(prev.quantity_quintals * 2),
        gunny_bag_type: extraData.bagging.gunny_bag_type || 'Standard 50kg Jute',
        labour_delay_reported: !!extraData.bagging.labour_delay_reported,
        delay_reason: extraData.bagging.delay_reason,
        operator_remarks: extraData.bagging.operator_remarks || 'Gunny bagging completed.',
        status: newStatus,
        created_at: new Date().toISOString(),
      });
    }

    if (extraData?.jForm || newStatus === 'J_FORM_GENERATED' || newStatus === 'PROCUREMENT_COMPLETED') {
      const msp = 1950;
      const total = prev.quantity_quintals * msp;
      await supabase.from('j_forms').insert({
        id: `jform_${Date.now()}`,
        registration_id: registrationId,
        j_form_number: `JF-2026-${prev.token_number}-${Date.now().toString().slice(-4)}`,
        quantity_procured: prev.quantity_quintals,
        msp_rate: msp,
        total_amount: total,
        issued_by: operatorName,
        issued_at: new Date().toISOString(),
        status: 'GENERATED',
      });

      await supabase.from('payments').insert({
        id: `pay_${Date.now()}`,
        registration_id: registrationId,
        farmer_id: prev.farmer_id,
        amount: total,
        msp_price: msp,
        quantity: prev.quantity_quintals,
        status: 'PROCESSING',
        transaction_id: `KF-DBT-${Date.now().toString().slice(-8)}`,
        payment_date: new Date().toISOString(),
        bank_account_masked: 'State Bank of India (Aadhaar Seeded) •••• 8842',
        ifsc_masked: 'SBIN0020142',
        created_at: new Date().toISOString(),
      });
    }

    await this.createAuditLog({
      registration_id: registrationId,
      stage: newStage,
      previous_status: prev.procurement_status,
      new_status: newStatus,
      updated_by: operatorName,
      remarks: extraData?.bottleneckRemarks || `Status updated to ${newStatus}`,
    });

    await this.createNotification({
      user_id: prev.farmer_id,
      title: `Procurement Update: ${newStage.replace('_', ' ')}`,
      message: `Token #${prev.token_number}: Status advanced to ${newStatus.replace(/_/g, ' ')}.`,
      channel: 'SMS',
    });

    return true;
  },

  async getPayments(farmerId?: string): Promise<PaymentRecord[]> {
    let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (farmerId) {
      query = query.eq('farmer_id', farmerId);
    }
    const { data } = await query;
    return data || [];
  },

  async updatePaymentStatus(paymentId: string, status: PaymentRecord['status']): Promise<boolean> {
    const { error } = await supabase.from('payments').update({ status }).eq('id', paymentId);
    return !error;
  },

  async getNotifications(userId: string): Promise<NotificationItem[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async createNotification(notif: Omit<NotificationItem, 'id' | 'created_at' | 'read'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif_${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    await supabase.from('notifications').insert(newNotif);
    return newNotif;
  },

  async getAuditLogs(registrationId?: string): Promise<AuditLog[]> {
    let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (registrationId) {
      query = query.eq('registration_id', registrationId);
    }
    const { data } = await query;
    return data || [];
  },

  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: AuditLog = {
      ...log,
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    await supabase.from('audit_logs').insert(newLog);
  },

  clearAllDatabase() {
    // Only used for UI reset - do not actually wipe production database.
  },

  async getCentres(): Promise<Centre[]> {
    const { data } = await supabase.from('procurement_centres').select('*');
    return data || [];
  },
};
