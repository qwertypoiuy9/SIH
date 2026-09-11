import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
import { INITIAL_CENTRES } from '../data/mockData';

export const DEFAULT_SUPABASE_URL = 'https://pqconvvuhpvoqutgtmac.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxY29udnZ1aHB2b3F1dGd0bWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTIzNTYsImV4cCI6MjEwNDYyODM1Nn0.da1NkE72812nRPTbjzgyRc7v5nc1fmfFoAPTFKWU-Cs';

const SUPABASE_STORAGE_KEY = 'kisanflow_supabase_config';
const LOCAL_DB_STORAGE_PREFIX = 'kisanflow_db_';

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
  } catch {
    // Ignore
  }
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    connected: true,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  try {
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore
  }
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const active = config || getStoredSupabaseConfig();
  if (!active.url || !active.anonKey) return null;

  if (cachedClient && lastUrl === active.url && lastKey === active.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(active.url, active.anonKey);
    lastUrl = active.url;
    lastKey = active.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

// ==============================================================================
// HYBRID DATABASE STORE (SUPABASE WITH SEAMLESS LOCAL REST-MIRROR FALLBACK)
// ==============================================================================
function getLocalTable<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(LOCAL_DB_STORAGE_PREFIX + table);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalTable<T>(table: string, data: T[]) {
  try {
    localStorage.setItem(LOCAL_DB_STORAGE_PREFIX + table, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

export const SupabaseDataService = {
  // 1. GET NEXT TOKEN NUMBER SAFELY STARTING FROM 1
  async getNextTokenNumber(centreId: string, preferredDate: string): Promise<number> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('registrations')
          .select('token_number')
          .eq('centre_id', centreId)
          .eq('preferred_date', preferredDate)
          .order('token_number', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          return Number(data[0].token_number) + 1;
        }
      } catch {
        // Fallback to local
      }
    }

    // Local DB lookup
    const localRegs = getLocalTable<Registration>('registrations');
    const matching = localRegs.filter(
      r => r.centre_id === centreId && r.preferred_date === preferredDate
    );
    if (matching.length === 0) return 1;
    const maxToken = Math.max(...matching.map(r => r.token_number || 0));
    return maxToken + 1;
  },

  // 2. CREATE REGISTRATION & TOKEN
  async createRegistration(
    params: Omit<Registration, 'id' | 'token_number' | 'queue_position' | 'current_stage' | 'procurement_status' | 'created_at'>
  ): Promise<Registration> {
    const token = await this.getNextTokenNumber(params.centre_id, params.preferred_date);

    // Calculate queue position among waiting registrations for this centre and date
    const allForCentre = await this.getRegistrationsForCentre(params.centre_id);
    const waitingAhead = allForCentre.filter(
      r => r.preferred_date === params.preferred_date && r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
    ).length;

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

    // Try Supabase insert
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('registrations').insert(newReg);
        if (error) {
          console.warn('Supabase remote insert fallback to local persistence:', error.message);
        }
      } catch (err) {
        console.warn('Supabase insert network error, saving locally:', err);
      }
    }

    // Always mirror to local DB
    const local = getLocalTable<Registration>('registrations');
    local.push(newReg);
    setLocalTable('registrations', local);

    // Create Initial Notification
    await this.createNotification({
      user_id: newReg.farmer_id,
      title: 'Slot Confirmed & Token Assigned',
      message: `Token #${token} issued for ${newReg.crop} (${newReg.quantity_quintals} Qtl). Date: ${newReg.preferred_date} at ${newReg.centre_name || 'Procurement Centre'}.`,
      channel: 'SMS',
    });

    // Create audit log
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

  // 3. GET ALL REGISTRATIONS (GOVERNMENT / AUDIT)
  async getAllRegistrations(): Promise<Registration[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('registrations')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch {
        // Fallback
      }
    }
    return getLocalTable<Registration>('registrations').sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  // 4. GET REGISTRATIONS FOR SPECIFIC FARMER
  async getRegistrationsForFarmer(farmerId: string): Promise<Registration[]> {
    const all = await this.getAllRegistrations();
    return all.filter(r => r.farmer_id === farmerId || r.phone === farmerId);
  },

  // 5. GET REGISTRATIONS FOR SPECIFIC CENTRE
  async getRegistrationsForCentre(centreId: string): Promise<Registration[]> {
    const all = await this.getAllRegistrations();
    return all.filter(r => r.centre_id === centreId);
  },

  // 6. UPDATE PROCUREMENT STAGE & STATUS (MANDI OPERATOR)
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
    const all = await this.getAllRegistrations();
    const index = all.findIndex(r => r.id === registrationId);
    if (index === -1) return false;

    const prev = all[index];
    const updated: Registration = {
      ...prev,
      current_stage: newStage,
      procurement_status: newStatus,
      delay_minutes: extraData?.delayMinutes !== undefined ? extraData.delayMinutes : prev.delay_minutes,
      bottleneck_remarks: extraData?.bottleneckRemarks || prev.bottleneck_remarks,
    };

    // If completed or rejected, queue position is 0
    if (newStatus === 'PROCUREMENT_COMPLETED' || newStatus === 'QUALITY_REJECTED') {
      updated.queue_position = 0;
    }

    all[index] = updated;
    setLocalTable('registrations', all);

    // Try Supabase update
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('registrations')
          .update({
            current_stage: newStage,
            procurement_status: newStatus,
            delay_minutes: updated.delay_minutes,
            bottleneck_remarks: updated.bottleneck_remarks,
            queue_position: updated.queue_position,
          })
          .eq('id', registrationId);
      } catch {
        // Continue
      }
    }

    // Save sub-records if provided
    if (extraData?.qualityCheck) {
      const qRecord: QualityCheckRecord = {
        id: `qc_${Date.now()}`,
        registration_id: registrationId,
        moisture_percentage: extraData.qualityCheck.moisture_percentage || 13.5,
        quality_result: extraData.qualityCheck.quality_result || 'FAQ (Fair Average Quality)',
        faq_compliant: extraData.qualityCheck.faq_compliant !== false,
        assayer_name: operatorName,
        assayer_remarks: extraData.qualityCheck.assayer_remarks || 'Quality within FAQ standards.',
        status: newStatus,
        created_at: new Date().toISOString(),
      };
      const qcs = getLocalTable<QualityCheckRecord>('quality_checks');
      qcs.push(qRecord);
      setLocalTable('quality_checks', qcs);
    }

    if (extraData?.weighing) {
      const wRecord: WeighingRecord = {
        id: `wb_${Date.now()}`,
        registration_id: registrationId,
        gross_weight: extraData.weighing.gross_weight || updated.quantity_quintals + 15,
        tare_weight: extraData.weighing.tare_weight || 15,
        net_weight: extraData.weighing.net_weight || updated.quantity_quintals,
        weighbridge_slip_number: extraData.weighing.weighbridge_slip_number || `WB-${Date.now().toString().slice(-6)}`,
        operator_name: operatorName,
        operator_remarks: extraData.weighing.operator_remarks || 'Electronic weighbridge verified.',
        status: newStatus,
        created_at: new Date().toISOString(),
      };
      const wbs = getLocalTable<WeighingRecord>('weighing_records');
      wbs.push(wRecord);
      setLocalTable('weighing_records', wbs);
    }

    if (extraData?.bagging) {
      const bRecord: BaggingRecord = {
        id: `bag_${Date.now()}`,
        registration_id: registrationId,
        number_of_bags: extraData.bagging.number_of_bags || Math.round(updated.quantity_quintals * 2),
        gunny_bag_type: extraData.bagging.gunny_bag_type || 'Standard 50kg Jute',
        labour_delay_reported: !!extraData.bagging.labour_delay_reported,
        delay_reason: extraData.bagging.delay_reason,
        operator_remarks: extraData.bagging.operator_remarks || 'Gunny bagging completed.',
        status: newStatus,
        created_at: new Date().toISOString(),
      };
      const bags = getLocalTable<BaggingRecord>('bagging_records');
      bags.push(bRecord);
      setLocalTable('bagging_records', bags);
    }

    if (extraData?.jForm || newStatus === 'J_FORM_GENERATED' || newStatus === 'PROCUREMENT_COMPLETED') {
      const msp = 1950;
      const total = updated.quantity_quintals * msp;
      const jRecord: JFormRecord = {
        id: `jform_${Date.now()}`,
        registration_id: registrationId,
        j_form_number: `JF-2026-${updated.token_number}-${Date.now().toString().slice(-4)}`,
        quantity_procured: updated.quantity_quintals,
        msp_rate: msp,
        total_amount: total,
        issued_by: operatorName,
        issued_at: new Date().toISOString(),
        status: 'GENERATED',
      };
      const jforms = getLocalTable<JFormRecord>('j_forms');
      jforms.push(jRecord);
      setLocalTable('j_forms', jforms);

      // Auto-create Payment Record
      const payRecord: PaymentRecord = {
        id: `pay_${Date.now()}`,
        registration_id: registrationId,
        farmer_id: updated.farmer_id,
        amount: total,
        msp_price: msp,
        quantity: updated.quantity_quintals,
        status: 'PROCESSING',
        transaction_id: `KF-DBT-${Date.now().toString().slice(-8)}`,
        payment_date: new Date().toISOString(),
        bank_account_masked: 'State Bank of India (Aadhaar Seeded) •••• 8842',
        ifsc_masked: 'SBIN0020142',
        created_at: new Date().toISOString(),
      };
      const pays = getLocalTable<PaymentRecord>('payments');
      pays.push(payRecord);
      setLocalTable('payments', pays);
    }

    // Create Audit Log
    await this.createAuditLog({
      registration_id: registrationId,
      stage: newStage,
      previous_status: prev.procurement_status,
      new_status: newStatus,
      updated_by: operatorName,
      remarks: extraData?.bottleneckRemarks || `Status updated to ${newStatus}`,
    });

    // Send Farmer Notification
    await this.createNotification({
      user_id: updated.farmer_id,
      title: `Procurement Update: ${newStage.replace('_', ' ')}`,
      message: `Token #${updated.token_number}: Status advanced to ${newStatus.replace(/_/g, ' ')}.`,
      channel: 'SMS',
    });

    return true;
  },

  // 7. GET PAYMENTS
  async getPayments(farmerId?: string): Promise<PaymentRecord[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client.from('payments').select('*').order('created_at', { ascending: false });
        if (farmerId) {
          query = query.eq('farmer_id', farmerId);
        }
        const { data, error } = await query;
        if (!error && data) return data;
      } catch {
        // Fallback
      }
    }
    const all = getLocalTable<PaymentRecord>('payments');
    if (farmerId) {
      return all.filter(p => p.farmer_id === farmerId);
    }
    return all;
  },

  // 8. UPDATE PAYMENT STATUS
  async updatePaymentStatus(paymentId: string, status: PaymentRecord['status']): Promise<boolean> {
    const all = getLocalTable<PaymentRecord>('payments');
    const index = all.findIndex(p => p.id === paymentId);
    if (index === -1) return false;
    all[index].status = status;
    setLocalTable('payments', all);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('payments').update({ status }).eq('id', paymentId);
      } catch {
        // Ignore
      }
    }
    return true;
  },

  // 9. GET NOTIFICATIONS
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch {
        // Fallback
      }
    }
    const all = getLocalTable<NotificationItem>('notifications');
    return all.filter(n => n.user_id === userId);
  },

  // 10. CREATE NOTIFICATION
  async createNotification(notif: Omit<NotificationItem, 'id' | 'created_at' | 'read'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif_${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').insert(newNotif);
      } catch {
        // Ignore
      }
    }
    const all = getLocalTable<NotificationItem>('notifications');
    all.unshift(newNotif);
    setLocalTable('notifications', all);
    return newNotif;
  },

  // 11. GET AUDIT LOGS
  async getAuditLogs(registrationId?: string): Promise<AuditLog[]> {
    const all = getLocalTable<AuditLog>('audit_logs');
    if (registrationId) {
      return all.filter(a => a.registration_id === registrationId);
    }
    return all;
  },

  // 12. CREATE AUDIT LOG
  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: AuditLog = {
      ...log,
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('audit_logs').insert(newLog);
      } catch {
        // Ignore
      }
    }
    const all = getLocalTable<AuditLog>('audit_logs');
    all.unshift(newLog);
    setLocalTable('audit_logs', all);
  },

  // 13. CLEAR ALL LOCAL DB FOR FRESH START
  clearAllDatabase() {
    ['registrations', 'quality_checks', 'weighing_records', 'bagging_records', 'j_forms', 'payments', 'notifications', 'audit_logs'].forEach(table => {
      localStorage.removeItem(LOCAL_DB_STORAGE_PREFIX + table);
    });
  },

  // 14. GET CENTRES
  async getCentres(): Promise<Centre[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('procurement_centres').select('*');
        if (!error && data && data.length > 0) return data;
      } catch {
        // Fallback
      }
    }
    return INITIAL_CENTRES;
  },
};
