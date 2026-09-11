# KisanFlow Complete Website Rebuild & Supabase Schema Architecture

## Goal
Completely rebuild KisanFlow into a clean, database-driven, role-based Smart Mandi Procurement Management System according to user specifications.
Remove all dummy/mock records, fake statistics, placeholder farmers, fake tokens, and static dashboard numbers. Start as a fresh application backed by Supabase with clean empty states.

---

## 1. Supabase Schema Script (`supabase/schema.sql`)
We will create a comprehensive SQL migration file with:
- `profiles` (id references auth.users or text primary key, role, name, phone, village, district, state, aadhaar_masked, employee_id, centre_id, designation)
- `procurement_centres` (id, name, district, state, capacity_per_day, active_counters, open_hours)
- `crops` (id, name, category, msp_per_quintal, icon)
- `registrations` (id, farmer_id, farmer_name, phone, village, crop, quantity_quintals, vehicle_number, centre_id, preferred_date, token_number, queue_position, stage, status, estimated_processing_time, delay_minutes, created_at)
- `quality_checks` (id, registration_id, moisture_percentage, quality_result, faq_result, assayer_remarks, status, created_at)
- `weighing_records` (id, registration_id, gross_weight, tare_weight, net_weight, weighbridge_slip, operator_remarks, status, created_at)
- `bagging_records` (id, registration_id, number_of_bags, labour_delay, operator_remarks, status, created_at)
- `j_forms` (id, registration_id, jform_number, quantity_procured, msp_rate, total_amount, pdf_generated_at, status, created_at)
- `payments` (id, registration_id, farmer_id, amount, msp_price, quantity, status, transaction_id, payment_date, bank_account_masked, created_at)
- `notifications` (id, user_id, title, message, channel, read, created_at)
- `audit_logs` (id, registration_id, stage, previous_status, new_status, updated_by, remarks, timestamp)
- RLS Policies for secure access by role
- Automatic token sequencing function (`get_next_token_number(centre_id, procurement_date)`)

## 2. Dynamic Supabase Data Service (`src/services/supabaseDataService.ts`)
Create a dedicated client service that queries Supabase when connected and falls back gracefully to clean local database persistence if remote tables are not yet initialized (handling 404 / PGRST205 seamlessly):
- `registerFarmerSlot(registrationData)` -> assigns safe incremental token starting at 1
- `getQueueForCentre(centreId)` -> calculates real-time position, waiting time, farmers ahead
- `updateFarmerStage(registrationId, stage, stageData, operatorName)` -> updates Gate, Quality, Weighing, Bagging, J-Form, Final Completed
- `getFarmerRegistrations(farmerId)`
- `getOperatorQueue(centreId)`
- `getGovernmentOverview()`
- `getPayments(farmerId or all)`
- `getNotifications(userId)`
- Real-time subscription listeners via Supabase channel

## 3. Remove ALL Dummy / Mock Records
- Clear out `INITIAL_FARMERS`, `INITIAL_BOOKING`, `INITIAL_QUEUE`, `INITIAL_PROCUREMENT`, `INITIAL_PAYMENT`, `INITIAL_NOTIFICATIONS`, `INITIAL_TICKETS` from mockData.ts or replace with empty defaults.
- Clean empty states: "No registrations found.", "No farmers are currently waiting.", "No payment information available yet.", "You're all caught up."
- Real calculated stats only: count actual records in database.

## 4. Dedicated Responsive Sidebars & Navigation
- **Farmer Sidebar**:
  - 🏠 Dashboard
  - 📝 Slot Booking
  - 🎫 My Token
  - 🚜 Live Queue
  - 📊 Procurement Status
  - 💰 Payments
  - 📋 My Registrations
  - 🔔 Notifications
  - 🎙️ Voice Assistant
  - 👤 Profile
  - 🚪 Logout
- **Mandi Operator Sidebar**:
  - 🏠 Dashboard
  - 👨‍🌾 Farmer Registrations
  - 🎫 Token Management
  - 🚜 Live Queue
  - ⚙️ Procurement Processing (5 Stages: Gate, Quality, Weighing, Bagging, J-Form)
  - 📋 All Bookings
  - 💧 Quality & Moisture
  - ⚖️ Weighing
  - 👜 Bagging
  - 📄 J-Forms / Receipts
  - 💰 Payments
  - 📊 Reports
  - 🔔 Notifications
  - 🎙️ Voice Assistant
  - 👤 Profile
  - 🚪 Logout
- **Government Officer Sidebar**:
  - 🏠 Overview
  - 👨‍🌾 Farmers
  - 👷 Mandi Operators
  - 🚜 Live Queue
  - 📋 All Registrations
  - ⚙️ Procurement Monitoring
  - 💰 Payments
  - 📊 Reports & Analytics
  - 🚨 Bottlenecks / Alerts
  - 🔔 Notifications
  - 🎙️ Voice Assistant
  - 👤 Profile
  - 🚪 Logout
- Remove unnecessary footer completely.

## 5. 5-Stage Procurement Workflow Implementation
- Stage 1: Gate Entry (`WAITING_FOR_GATE_ENTRY` -> `GATE_ENTRY_VERIFIED`)
- Stage 2: Quality & Moisture (`QUALITY_CHECK_PENDING` -> `QUALITY_CHECK_COMPLETED` / `REJECTED`)
- Stage 3: Weighing & Unloading (`WAITING_FOR_WEIGHING` -> `WEIGHING_IN_PROGRESS` -> `WEIGHING_COMPLETED`)
- Stage 4: Bagging (`BAGGING_PENDING` -> `BAGGING_IN_PROGRESS` -> `BAGGING_COMPLETED`)
- Stage 5: J-Form / Receipt (`J_FORM_PENDING` -> `J_FORM_GENERATED` -> `PROCUREMENT_COMPLETED`)
- Real-world processing time calculation based on ground realities (Gate 1-3h, Quality 2-4h, Weighing 4-6h, Bagging 1-2 days bottleneck, J-Form 2-5h).

## 6. Voice Assistant Integration with Real Database Data
- Multi-lingual STT -> Indic NLP / Gemini API -> Live database query -> TTS in Telugu, Hindi, English, Kannada, Tamil, Bengali.
- Answers dynamically using actual registrations, active token, real queue position, real quality status, real payment details.
