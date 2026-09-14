export type LanguageCode = 'en' | 'te' | 'hi' | 'kn' | 'ta' | 'bn';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export type UserRole = 'farmer' | 'operator' | 'government' | 'support';

// Extended UserProfile with full address fields
export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email?: string;
  maskedPhone?: string;
  is_approved?: boolean;
  // Full address
  address?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
  pincode?: string;
  // Geocoded coordinates from address
  latitude?: number;
  longitude?: number;
  // Farmer-specific
  aadhaar_masked?: string;
  land_holding_acres?: number;
  preferred_language?: LanguageCode;
  // Operator/Govt specific
  employee_id?: string;
  centre_id?: string;
  designation?: string;
  rejection_reason?: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: UserProfile | null;
  role: UserRole | null;
}

export interface Centre {
  id: string;
  name: string;
  address?: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  capacity_per_day: number;
  current_queue: number;
  status: 'OPTIMAL' | 'MODERATE' | 'OVERLOADED';
  distance_km: number;
  avg_processing_mins: number;
  open_hours: string;
  counters_active: number;
  accepted_crops?: string[];
  contact?: string;
  is_open?: boolean;
}

export interface Crop {
  id: string;
  name: string;
  local_name?: string;       // regional language name
  scientific_name?: string;
  category: string;
  msp_per_quintal: number;
  icon: string;
  // Location relevance
  primary_states?: string[];
  primary_districts?: string[];
  season?: string;
}

export interface CropRegion {
  crop_id: string;
  state: string;
  district: string;
  season?: string;
  relevance: 'primary' | 'secondary';
}

// Weather types
export interface WeatherCurrent {
  temp_c: number;
  feels_like_c: number;
  humidity: number;
  wind_kph: number;
  condition: string;
  condition_icon: string;
  rain_mm?: number;
  rain_probability?: number;
  uv_index?: number;
  visibility_km?: number;
  location: string;
  dt: number;
}

export interface WeatherForecastDay {
  date: string;
  max_temp_c: number;
  min_temp_c: number;
  condition: string;
  condition_icon: string;
  rain_probability: number;
  rain_mm: number;
  wind_kph: number;
  humidity: number;
}

export interface WeatherAlert {
  event: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  start: number;
  end: number;
}

export interface WeatherData {
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
  alerts: WeatherAlert[];
  farmer_advisory: string;
  source: 'openweather' | 'fallback';
}

export type ProcurementStage =
  | 'GATE_ENTRY'
  | 'QUALITY_CHECK'
  | 'WEIGHING'
  | 'BAGGING'
  | 'J_FORM'
  | 'COMPLETED'
  | 'REJECTED';

export type ProcurementStatus =
  | 'WAITING_FOR_GATE_ENTRY'
  | 'GATE_ENTRY_VERIFIED'
  | 'QUALITY_CHECK_PENDING'
  | 'QUALITY_CHECK_IN_PROGRESS'
  | 'QUALITY_CHECK_COMPLETED'
  | 'QUALITY_REJECTED'
  | 'WAITING_FOR_WEIGHING'
  | 'WEIGHING_IN_PROGRESS'
  | 'WEIGHING_COMPLETED'
  | 'BAGGING_PENDING'
  | 'BAGGING_IN_PROGRESS'
  | 'BAGGING_COMPLETED'
  | 'BAGGING_DELAYED'
  | 'J_FORM_PENDING'
  | 'J_FORM_PROCESSING'
  | 'J_FORM_GENERATED'
  | 'PROCUREMENT_COMPLETED';

export interface Registration {
  id: string;
  farmer_id: string;
  farmer_name: string;
  phone: string;
  farmer_reg_id?: string;
  village: string;
  district: string;
  crop: string;
  quantity_quintals: number;
  vehicle_number?: string;
  centre_id: string;
  centre_name?: string;
  preferred_date: string;
  preferred_time: string;
  token_number: number;
  queue_position: number;
  current_stage: ProcurementStage;
  procurement_status: ProcurementStatus;
  estimated_processing_mins: number;
  delay_minutes: number;
  bottleneck_remarks?: string;
  created_at: string;
}

export interface QualityCheckRecord {
  id: string;
  registration_id: string;
  moisture_percentage: number;
  quality_result: string;
  faq_compliant: boolean;
  assayer_name: string;
  assayer_remarks: string;
  status: string;
  created_at: string;
}

export interface WeighingRecord {
  id: string;
  registration_id: string;
  gross_weight: number;
  tare_weight: number;
  net_weight: number;
  weighbridge_slip_number: string;
  operator_name: string;
  operator_remarks: string;
  status: string;
  created_at: string;
}

export interface BaggingRecord {
  id: string;
  registration_id: string;
  number_of_bags: number;
  gunny_bag_type: string;
  labour_delay_reported: boolean;
  delay_reason?: string;
  operator_remarks?: string;
  status: string;
  created_at: string;
}

export interface JFormRecord {
  id: string;
  registration_id: string;
  j_form_number: string;
  quantity_procured: number;
  msp_rate: number;
  total_amount: number;
  issued_by: string;
  issued_at: string;
  status: string;
}

export interface PaymentRecord {
  id: string;
  registration_id: string;
  farmer_id: string;
  amount: number;
  msp_price: number;
  quantity: number;
  status: 'PENDING' | 'INITIATED' | 'PROCESSING' | 'CREDITED' | 'FAILED';
  transaction_id?: string;
  payment_date?: string;
  bank_account_masked?: string;
  ifsc_masked?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  channel: 'SMS' | 'APP' | 'VOICE';
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  registration_id: string;
  stage: string;
  previous_status?: string;
  new_status: string;
  updated_by: string;
  remarks?: string;
  timestamp: string;
}

export type FarmerSidebarView =
  | 'dashboard'
  | 'book_slot'
  | 'my_token'
  | 'live_queue'
  | 'procurement_status'
  | 'payments'
  | 'my_registrations'
  | 'procurement_centers'
  | 'crops_prices'
  | 'weather'
  | 'notifications'
  | 'phone_call'
  | 'voice_assistant'
  | 'profile';

export type OperatorSidebarView =
  | 'dashboard'
  | 'farmer_registrations'
  | 'token_management'
  | 'live_queue'
  | 'procurement_processing'
  | 'all_bookings'
  | 'quality_moisture'
  | 'weighing'
  | 'bagging'
  | 'j_forms'
  | 'payments'
  | 'reports'
  | 'notifications'
  | 'voice_assistant'
  | 'profile';

export type GovernmentSidebarView =
  | 'overview'
  | 'farmers'
  | 'operators'
  | 'operator_approvals'
  | 'live_queue'
  | 'all_registrations'
  | 'procurement_monitoring'
  | 'payments'
  | 'reports_analytics'
  | 'bottlenecks'
  | 'notifications'
  | 'voice_assistant'
  | 'profile';

export type SupportSidebarView =
  | 'dashboard'
  | 'farmer_lookup'
  | 'grievances'
  | 'ai_analysis'
  | 'notifications'
  | 'voice_assistant'
  | 'profile';

export type ActivePortalView = 'landing' | 'login' | 'register' | 'farmer' | 'operator' | 'government' | 'support';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}
