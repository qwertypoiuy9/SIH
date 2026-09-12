import { GoogleGenAI } from '@google/genai';
import {
  Centre,
  Crop,
  LanguageCode,
  PaymentRecord,
  Registration,
  UserProfile,
} from '../types';

// ============================================================
// TYPES
// ============================================================
export interface AssistantContext {
  farmer?: UserProfile;
  activeRegistration?: Registration;
  centres: Centre[];
  crops: Crop[];
  payment?: PaymentRecord;
  queueDepth: number;
  language: LanguageCode;
}

export interface AssistantResponse {
  replyText: string;
  speakText: string;
  source: 'gemini' | 'indic_nlp' | 'online_translation';
  detectedIntent?: string;
}

export interface QualityAdvisorResult {
  decision: 'APPROVE' | 'REJECT' | 'BORDERLINE';
  confidence: number; // 0-100
  suggestedRemark: string;
  reasoning: string;
  source: 'gemini' | 'rule_engine';
}

export interface BottleneckPrediction {
  stage: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  prediction: string;
  recommendation: string;
  estimatedDelayMins: number;
  source: 'gemini' | 'rule_engine';
}

export interface SlotRecommendation {
  recommendedCentreId: string;
  recommendedCentreName: string;
  reasoning: string;
  timeSavedMins: number;
  source: 'gemini' | 'rule_engine';
}

export interface OperatorCopilotSummary {
  dailySummary: string;
  urgentFlags: string[];
  nextFarmerSuggestion: string;
  capacityWarning: string | null;
  source: 'gemini' | 'rule_engine';
}

export interface JFormIntelligence {
  receiptSummary: string;
  anomalies: string[];
  farmerMessage: string;
  source: 'gemini' | 'rule_engine';
}

// ============================================================
// LANGUAGE METADATA
// ============================================================
const LANG_METADATA: Record<LanguageCode, { name: string; nativeName: string; greeting: string }> = {
  te: { name: 'Telugu', nativeName: 'తెలుగు', greeting: 'నమస్తే' },
  hi: { name: 'Hindi', nativeName: 'हिंदी', greeting: 'नमस्ते' },
  en: { name: 'English', nativeName: 'English', greeting: 'Hello' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', greeting: 'ನಮಸ್ಕಾರ' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', greeting: 'வணக்கம்' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', greeting: 'নমস্কার' },
};

// ============================================================
// GEMINI KEY HELPER
// ============================================================
function getGeminiKey(): string {
  return (
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') ||
    localStorage.getItem('kisanflow_gemini_api_key') ||
    ''
  );
}

function getGeminiClient(): GoogleGenAI | null {
  const key = getGeminiKey();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch {
    return null;
  }
}

// ============================================================
// TRANSLATION FALLBACK
// ============================================================
export async function translateTextToTarget(text: string, targetLang: LanguageCode): Promise<string> {
  if (targetLang === 'en') return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) return data.responseData.translatedText;
    }
  } catch {
    // Return original if network fails
  }
  return text;
}

// ============================================================
// 1. MAIN VOICE ASSISTANT RESPONSE
// ============================================================
export async function getAIAssistantResponse(
  query: string,
  context: AssistantContext
): Promise<AssistantResponse> {
  const cleanQuery = query.trim();
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = buildGeminiPrompt(cleanQuery, context);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      if (response.text) {
        const text = response.text.trim();
        const speakable = text.replace(/[*#_`>]/g, '').trim();
        return { replyText: text, speakText: speakable, source: 'gemini' };
      }
    } catch (err) {
      console.warn('Gemini API notice:', err);
    }
  }

  return generateIndicNLPResponse(cleanQuery, context);
}

function buildGeminiPrompt(query: string, ctx: AssistantContext): string {
  const langMeta = LANG_METADATA[ctx.language] || LANG_METADATA.te;
  const token = ctx.activeRegistration ? `#${ctx.activeRegistration.token_number}` : 'None';
  const stage = ctx.activeRegistration ? ctx.activeRegistration.current_stage : 'No active registration';

  // Location context
  const farmerLat = ctx.farmer?.latitude;
  const farmerLng = ctx.farmer?.longitude;
  const locationStr = farmerLat && farmerLng
    ? `${ctx.farmer?.village || ''}, ${ctx.farmer?.district || ''} (GPS: ${farmerLat.toFixed(4)}, ${farmerLng.toFixed(4)})`
    : `${ctx.farmer?.village || ''}, ${ctx.farmer?.district || 'Unknown'}`;

  // Nearest centres with full detail
  const nearestCentres = ctx.centres
    .filter(c => c.distance_km < 999)
    .slice(0, 5)
    .map((c, i) =>
      `${i + 1}. ${c.name} | ${c.district}, ${c.state} | ${c.distance_km} km away | Status: ${c.status} | Queue: ${c.current_queue} | Crops: ${(c.accepted_crops || []).join(', ') || 'All'} | Hours: ${c.open_hours} | ${c.is_open ? 'OPEN NOW' : 'CLOSED'}`
    ).join('\n') || 'No nearby centres loaded yet.';

  // Crops with MSP prices (sorted by relevance)
  const cropLines = ctx.crops
    .filter(c => c.msp_per_quintal > 0)
    .slice(0, 15)
    .map(c => `${c.name} (${c.local_name?.split('/')[0]?.trim() || ''}): ₹${c.msp_per_quintal}/Qtl — ${c.category}, ${c.season} season`)
    .join('\n') || 'MSP data loading...';

  // Payment details
  const paymentInfo = ctx.payment
    ? `Status: ${ctx.payment.status} | Amount: ₹${ctx.payment.amount?.toLocaleString('en-IN')} | Crop: ${ctx.payment.quantity} Qtl @ ₹${ctx.payment.msp_price}/Qtl`
    : 'No payment recorded yet';

  return `You are KisanFlow AI, a knowledgeable and empathetic agricultural assistant for Indian farmers under the MSP government procurement scheme.

CRITICAL INSTRUCTION: Respond ENTIRELY in ${langMeta.name} (${langMeta.nativeName}). Never answer in English unless the farmer explicitly asks in English.
Be concise: keep responses under 5 sentences. Use simple farmer-friendly language. Include specific data from the records below.

═══ FARMER PROFILE ═══
Name: ${ctx.farmer?.name || 'Farmer'}
Location: ${locationStr}
Preferred Language: ${langMeta.nativeName}
Land: ${ctx.farmer?.land_holding_acres || 'N/A'} acres

═══ ACTIVE REGISTRATION ═══
Token: ${token}
Allocated Centre: ${ctx.activeRegistration?.centre_name || ctx.centres[0]?.name || 'Not assigned'}
Crop: ${ctx.activeRegistration?.crop || 'N/A'} — ${ctx.activeRegistration?.quantity_quintals || 0} Quintals
Current Stage: ${stage}
Farmers ahead in queue: ${ctx.queueDepth}

═══ PAYMENT ═══
${paymentInfo}

═══ NEAREST PROCUREMENT CENTRES (sorted by distance) ═══
${nearestCentres}

═══ MSP RATES 2026-27 (Government Official) ═══
${cropLines}

═══ KEY RULES & SCHEMES ═══
Quality Standard: Max moisture 17% for paddy, 14% for wheat (FAQ). Free from foreign matter.
J-Form: Official procurement receipt. Required for DBT payment to Aadhaar-linked bank account.
PM-KISAN: Eligible if land < 2 hectares (5 acres). ₹6,000/year in 3 instalments of ₹2,000.
PM Fasal Bima Yojana: Crop insurance for natural disasters.
Kisan Credit Card: Low-interest farm credit up to ₹3 lakh at 7% p.a.
Toll-Free Helpline: 1800-425-4747 (24x7)

═══ FARMER QUERY ═══
Language: ${langMeta.name}
Query: "${query}"

Respond helpfully in ${langMeta.nativeName}. If asked about nearest centre, use the distance data above. If asked about price, use the MSP data above. Always cite the specific centre name or price figure.`;
}

// ============================================================
// 2. AI QUALITY CHECK ADVISOR
// ============================================================
export async function getQualityCheckAdvice(params: {
  cropName: string;
  moisturePercent: number;
  grade: string;
  quantity: number;
  farmerName: string;
}): Promise<QualityAdvisorResult> {
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `You are a Mandi Quality Inspector AI for India's MSP procurement system.
Analyze this quality check and respond in JSON format only.

Crop: ${params.cropName}
Moisture: ${params.moisturePercent}%
Declared Grade: ${params.grade}
Quantity: ${params.quantity} Quintals
Farmer: ${params.farmerName}

Rules:
- FAQ standard: moisture ≤ 17% for paddy, ≤ 14% for wheat
- Borderline: 16-17% moisture needs careful check
- Grade A Premium requires moisture ≤ 13%

Return ONLY this JSON (no markdown):
{
  "decision": "APPROVE" or "REJECT" or "BORDERLINE",
  "confidence": 0-100,
  "suggestedRemark": "One professional remark sentence",
  "reasoning": "Brief one sentence reasoning"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        const rawText = response.text.trim().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(rawText);
        return {
          decision: parsed.decision || 'APPROVE',
          confidence: parsed.confidence || 85,
          suggestedRemark: parsed.suggestedRemark || 'Quality within FAQ standards.',
          reasoning: parsed.reasoning || 'Moisture levels acceptable.',
          source: 'gemini',
        };
      }
    } catch (err) {
      console.warn('Quality advisor Gemini error:', err);
    }
  }

  // Rule-based fallback
  return getQualityCheckAdviceRules(params);
}

function getQualityCheckAdviceRules(params: {
  cropName: string;
  moisturePercent: number;
  grade: string;
  quantity: number;
  farmerName: string;
}): QualityAdvisorResult {
  const { moisturePercent, cropName } = params;
  const cropLower = cropName.toLowerCase();
  const maxMoisture = cropLower.includes('wheat') ? 14 : 17;
  const premiumMax = cropLower.includes('wheat') ? 11 : 13;

  if (moisturePercent > maxMoisture) {
    return {
      decision: 'REJECT',
      confidence: 95,
      suggestedRemark: `Moisture ${moisturePercent}% exceeds FAQ limit of ${maxMoisture}% for ${cropName}. Farmer advised to sun-dry produce and resubmit.`,
      reasoning: `Moisture level (${moisturePercent}%) exceeds the government FAQ procurement standard of ${maxMoisture}%.`,
      source: 'rule_engine',
    };
  }
  if (moisturePercent >= maxMoisture - 1) {
    return {
      decision: 'BORDERLINE',
      confidence: 70,
      suggestedRemark: `Borderline moisture at ${moisturePercent}%. Secondary assayer verification recommended before final approval.`,
      reasoning: `Moisture ${moisturePercent}% is within 1% of the FAQ limit — secondary check recommended.`,
      source: 'rule_engine',
    };
  }
  if (moisturePercent <= premiumMax) {
    return {
      decision: 'APPROVE',
      confidence: 98,
      suggestedRemark: `Excellent Grade A quality. Moisture ${moisturePercent}% is well within premium standards. Approved for MSP procurement.`,
      reasoning: `Moisture ${moisturePercent}% qualifies for Grade A Premium — well below the ${maxMoisture}% FAQ limit.`,
      source: 'rule_engine',
    };
  }
  return {
    decision: 'APPROVE',
    confidence: 90,
    suggestedRemark: `FAQ compliant. Moisture ${moisturePercent}% is within acceptable range. Cleared for standard MSP procurement.`,
    reasoning: `Moisture level ${moisturePercent}% is acceptable under the FAQ standard of ${maxMoisture}%.`,
    source: 'rule_engine',
  };
}

// ============================================================
// 3. BOTTLENECK PREDICTION (GOVERNMENT)
// ============================================================
export async function getBottleneckPredictions(params: {
  registrations: Registration[];
  centres: Centre[];
}): Promise<BottleneckPrediction[]> {
  const { registrations } = params;

  const gateEntryCount = registrations.filter(r => r.current_stage === 'GATE_ENTRY').length;
  const qualityCount = registrations.filter(r => r.current_stage === 'QUALITY_CHECK').length;
  const weighingCount = registrations.filter(r => r.current_stage === 'WEIGHING').length;
  const baggingCount = registrations.filter(r => r.current_stage === 'BAGGING').length;
  const avgDelay = registrations.length > 0
    ? registrations.reduce((s, r) => s + (r.delay_minutes || 0), 0) / registrations.length
    : 0;
  const totalActive = registrations.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;

  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `You are a Mandi Operations AI for India's state procurement system.
Analyze the current centre data and predict bottlenecks. Respond ONLY in JSON.

Current Stage Counts:
- Gate Entry: ${gateEntryCount} farmers
- Quality Check: ${qualityCount} farmers
- Weighing: ${weighingCount} farmers
- Bagging: ${baggingCount} farmers
- Total Active: ${totalActive}
- Average Delay: ${avgDelay.toFixed(0)} minutes

Return a JSON array of 4 bottleneck predictions (one per stage):
[
  {
    "stage": "GATE_ENTRY",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "prediction": "One sentence about what will happen",
    "recommendation": "One specific actionable recommendation",
    "estimatedDelayMins": number
  },
  ...same for QUALITY_CHECK, WEIGHING, BAGGING
]
Only JSON, no markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        const rawText = response.text.trim().replace(/```json|```/g, '').trim();
        const parsed: BottleneckPrediction[] = JSON.parse(rawText);
        return parsed.map(p => ({ ...p, source: 'gemini' as const }));
      }
    } catch (err) {
      console.warn('Bottleneck prediction Gemini error:', err);
    }
  }

  // Rule-based fallback
  return getBottleneckPredictionsRules({ gateEntryCount, qualityCount, weighingCount, baggingCount, avgDelay });
}

function getBottleneckPredictionsRules(counts: {
  gateEntryCount: number;
  qualityCount: number;
  weighingCount: number;
  baggingCount: number;
  avgDelay: number;
}): BottleneckPrediction[] {
  const { gateEntryCount, qualityCount, weighingCount, baggingCount } = counts;

  const getSeverity = (count: number, low = 5, medium = 10, high = 20): BottleneckPrediction['severity'] => {
    if (count >= high) return 'CRITICAL';
    if (count >= medium) return 'HIGH';
    if (count >= low) return 'MEDIUM';
    return 'LOW';
  };

  return [
    {
      stage: 'GATE_ENTRY',
      severity: getSeverity(gateEntryCount),
      prediction: gateEntryCount >= 10
        ? `${gateEntryCount} farmers waiting at gate — vehicle congestion likely within 30 minutes.`
        : `Gate entry flowing smoothly with ${gateEntryCount} farmers in queue.`,
      recommendation: gateEntryCount >= 10
        ? 'Open a second gate entry counter and assign additional verification staff.'
        : 'Current staffing is adequate for gate entry operations.',
      estimatedDelayMins: gateEntryCount * 8,
      source: 'rule_engine',
    },
    {
      stage: 'QUALITY_CHECK',
      severity: getSeverity(qualityCount, 3, 6, 12),
      prediction: qualityCount >= 6
        ? `Quality check backlog of ${qualityCount} farmers detected — assayer shortage imminent.`
        : `Quality check station processing normally with ${qualityCount} pending.`,
      recommendation: qualityCount >= 6
        ? 'Deploy second certified assayer. Pre-stage moisture meters at waiting area.'
        : 'Single assayer is sufficient for current quality check load.',
      estimatedDelayMins: qualityCount * 25,
      source: 'rule_engine',
    },
    {
      stage: 'WEIGHING',
      severity: getSeverity(weighingCount, 4, 8, 15),
      prediction: weighingCount >= 8
        ? `Weighbridge queue of ${weighingCount} farmers — congestion peak expected in next 2 hours.`
        : `Weighbridge operating normally. ${weighingCount} farmers pending.`,
      recommendation: weighingCount >= 8
        ? 'Activate auxiliary weighing platform. Stagger truck arrivals in 30-minute batches.'
        : 'Single weighbridge is handling current throughput adequately.',
      estimatedDelayMins: weighingCount * 20,
      source: 'rule_engine',
    },
    {
      stage: 'BAGGING',
      severity: getSeverity(baggingCount, 5, 10, 20),
      prediction: baggingCount >= 10
        ? `Bardana (gunny bag) shortage risk — ${baggingCount} farmers at bagging stage. 1–2 day delay possible.`
        : `Bagging operations normal. ${baggingCount} farmers in bagging queue.`,
      recommendation: baggingCount >= 10
        ? 'Dispatch emergency jute bale consignment from state warehouse. Authorize plastic bag substitute if available.'
        : 'Gunny bag stock appears sufficient for current bagging demand.',
      estimatedDelayMins: baggingCount * 15,
      source: 'rule_engine',
    },
  ];
}

// ============================================================
// 4. SLOT RECOMMENDATION
// ============================================================
export async function getSlotRecommendation(params: {
  centres: Centre[];
  registrations: Registration[];
  cropName: string;
  quantity: number;
  farmerDistrict: string;
}): Promise<SlotRecommendation> {
  const { centres, registrations, cropName, quantity } = params;

  // Build load data per centre
  const centreLoads = centres.map(c => {
    const queueSize = registrations.filter(
      r => r.centre_id === c.id && r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
    ).length;
    const loadPercent = Math.min(100, Math.round((queueSize / c.capacity_per_day) * 100));
    return { ...c, queueSize, loadPercent };
  });

  const ai = getGeminiClient();

  if (ai) {
    try {
      const centreInfo = centreLoads.map(c =>
        `${c.name} (${c.id}): Queue=${c.queueSize}, Load=${c.loadPercent}%, Distance=${c.distance_km}km, AvgProcessing=${c.avg_processing_mins}min, Counters=${c.counters_active}, Capacity=${c.capacity_per_day}/day`
      ).join('\n');

      const prompt = `You are a smart slot allocation AI for Indian mandi procurement.
Recommend the best centre for a farmer. Respond ONLY in JSON.

Farmer Crop: ${cropName} (${quantity} Quintals)

Available Centres:
${centreInfo}

Pick the optimal centre balancing: distance, current queue load, processing speed, and available counters.

Return ONLY this JSON (no markdown):
{
  "recommendedCentreId": "exact centre id string",
  "recommendedCentreName": "exact centre name",
  "reasoning": "Two sentences explaining why this is optimal",
  "timeSavedMins": number
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        const rawText = response.text.trim().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(rawText);
        return { ...parsed, source: 'gemini' as const };
      }
    } catch (err) {
      console.warn('Slot recommendation Gemini error:', err);
    }
  }

  // Rule-based fallback — score each centre
  const scored = centreLoads.map(c => {
    const loadScore = (100 - c.loadPercent) * 0.4; // lower load = higher score
    const distanceScore = (1 / (c.distance_km + 1)) * 20; // closer = higher score
    const speedScore = (1 / (c.avg_processing_mins + 1)) * 20; // faster = higher score
    const counterScore = c.counters_active * 5;
    return { ...c, score: loadScore + distanceScore + speedScore + counterScore };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const defaultCentre = centreLoads.find(c => c.distance_km < 5) || centreLoads[0];
  const timeSaved = Math.max(0, (defaultCentre.queueSize - best.queueSize) * 20);

  return {
    recommendedCentreId: best.id,
    recommendedCentreName: best.name,
    reasoning: `${best.name} currently has the lowest queue load (${best.loadPercent}%) among available centres. With ${best.counters_active} active counters and average processing of ${best.avg_processing_mins} minutes, it offers the fastest procurement turnaround today.`,
    timeSavedMins: timeSaved,
    source: 'rule_engine',
  };
}

// ============================================================
// 5. OPERATOR AI COPILOT
// ============================================================
export async function getOperatorCopilotSummary(params: {
  centreRegistrations: Registration[];
  centreName: string;
  operatorName: string;
  capacity: number;
}): Promise<OperatorCopilotSummary> {
  const { centreRegistrations, centreName, capacity } = params;

  const waiting = centreRegistrations.filter(r => r.current_stage === 'GATE_ENTRY').length;
  const inProcess = centreRegistrations.filter(
    r => r.current_stage !== 'GATE_ENTRY' && r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;
  const completed = centreRegistrations.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length;
  const rejected = centreRegistrations.filter(r => r.procurement_status === 'QUALITY_REJECTED').length;
  const longWait = centreRegistrations.filter(r => (r.delay_minutes || 0) > 60);
  const loadPercent = Math.min(100, Math.round(((waiting + inProcess) / capacity) * 100));
  const nextFarmer = centreRegistrations.find(r => r.procurement_status === 'WAITING_FOR_GATE_ENTRY');

  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `You are an AI Copilot for a Mandi (agricultural market) operator in India.
Generate an operational summary in English. Respond ONLY in JSON.

Centre: ${centreName}
Today's Stats:
- Waiting at gate: ${waiting}
- In processing: ${inProcess}
- Completed: ${completed}
- Rejected (quality): ${rejected}
- Long-wait farmers (>60 min): ${longWait.length}
- Centre load: ${loadPercent}%
- Capacity: ${capacity}/day

Return ONLY this JSON (no markdown):
{
  "dailySummary": "2-3 sentence overview of today's operations",
  "urgentFlags": ["flag1", "flag2"] (max 3 strings, empty array if none),
  "nextFarmerSuggestion": "One sentence about who to call next",
  "capacityWarning": "Warning string if load > 80%, else null"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        const rawText = response.text.trim().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(rawText);
        return { ...parsed, source: 'gemini' as const };
      }
    } catch (err) {
      console.warn('Operator copilot Gemini error:', err);
    }
  }

  // Rule-based fallback
  const flags: string[] = [];
  if (longWait.length > 0) flags.push(`${longWait.length} farmer(s) waiting over 60 minutes — immediate attention needed`);
  if (rejected > 2) flags.push(`${rejected} quality rejections today — check assayer calibration`);
  if (loadPercent >= 80) flags.push(`Centre at ${loadPercent}% capacity — consider diverting new arrivals`);

  return {
    dailySummary: `${centreName} has processed ${completed} farmers today with ${waiting + inProcess} currently active. ${inProcess} farmers are in various processing stages and ${waiting} are waiting at the gate. Overall centre load is ${loadPercent}% of daily capacity.`,
    urgentFlags: flags,
    nextFarmerSuggestion: nextFarmer
      ? `Call Token #${nextFarmer.token_number} — ${nextFarmer.farmer_name} (${nextFarmer.crop}, ${nextFarmer.quantity_quintals} Qtl) is next at the gate.`
      : 'No farmers currently waiting at gate entry.',
    capacityWarning: loadPercent >= 80
      ? `⚠️ Centre is at ${loadPercent}% capacity. Consider redirecting new arrivals to nearby centres.`
      : null,
    source: 'rule_engine',
  };
}

// ============================================================
// 6. INTELLIGENT NOTIFICATION TEXT GENERATION
// ============================================================
export async function generateSmartNotification(params: {
  eventType: string;
  farmerName: string;
  tokenNumber: number;
  crop: string;
  quantity: number;
  centreName: string;
  stage?: string;
  paymentAmount?: number;
  language: LanguageCode;
}): Promise<string> {
  const langMeta = LANG_METADATA[params.language] || LANG_METADATA.te;
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `Generate a warm, friendly SMS notification for an Indian farmer in ${langMeta.name} (${langMeta.nativeName}).

Event: ${params.eventType}
Farmer: ${params.farmerName}
Token: #${params.tokenNumber}
Crop: ${params.crop} (${params.quantity} Quintals)
Centre: ${params.centreName}
Stage: ${params.stage || 'N/A'}
Payment Amount: ${params.paymentAmount ? '₹' + params.paymentAmount : 'N/A'}

Write ONE short, warm SMS message in ${langMeta.nativeName} (max 2 sentences). Be conversational and reassuring. Do not use markdown. Just the message text.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) return response.text.trim();
    } catch (err) {
      console.warn('Smart notification Gemini error:', err);
    }
  }

  // Multilingual rule-based fallbacks
  const templates: Record<string, Record<LanguageCode, string>> = {
    SLOT_CONFIRMED: {
      te: `${params.farmerName} గారు, మీ స్లాట్ నిర్ధారించబడింది! టోకెన్ #${params.tokenNumber} — ${params.crop} (${params.quantity} క్వింటాళ్లు) ${params.centreName} వద్ద. కిసాన్ ఫ్లో — 1800-425-4747`,
      hi: `${params.farmerName} जी, आपका स्लॉट पुष्टि हो गया! टोकन #${params.tokenNumber} — ${params.crop} (${params.quantity} क्विंटल) ${params.centreName} पर। किसानफ्लो — 1800-425-4747`,
      en: `Dear ${params.farmerName}, your slot is confirmed! Token #${params.tokenNumber} for ${params.crop} (${params.quantity} Qtl) at ${params.centreName}. KisanFlow — 1800-425-4747`,
      kn: `${params.farmerName} ಅವರೇ, ನಿಮ್ಮ ಸ್ಲಾಟ್ ದೃಢಪಟ್ಟಿದೆ! ಟೋಕನ್ #${params.tokenNumber} — ${params.crop} ${params.centreName}. 1800-425-4747`,
      ta: `${params.farmerName} அவர்களே, உங்கள் ஸ்லாட் உறுதிப்படுத்தப்பட்டது! டோக்கன் #${params.tokenNumber} — ${params.crop} ${params.centreName}. 1800-425-4747`,
      bn: `${params.farmerName}, আপনার স্লট নিশ্চিত! টোকেন #${params.tokenNumber} — ${params.crop} (${params.quantity} কুইন্টাল) ${params.centreName}. 1800-425-4747`,
    },
    PAYMENT_INITIATED: {
      te: `${params.farmerName} గారు, మీ ₹${params.paymentAmount} DBT చెల్లింపు మీ ఆధార్-లింక్డ్ బ్యాంక్ ఖాతాకు పంపబడింది! PFMS ద్వారా 2–3 రోజుల్లో క్రెడిట్ అవుతుంది.`,
      hi: `${params.farmerName} जी, आपका ₹${params.paymentAmount} DBT भुगतान आपके बैंक खाते में भेज दिया गया है! 2-3 दिनों में क्रेडिट होगा।`,
      en: `Dear ${params.farmerName}, your MSP payment of ₹${params.paymentAmount} has been initiated via PFMS to your Aadhaar-linked account! Credit expected in 2–3 days.`,
      kn: `${params.farmerName} ಅವರೇ, ₹${params.paymentAmount} DBT ಪಾವತಿ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಕಳಿಸಲಾಗಿದೆ!`,
      ta: `${params.farmerName}, ₹${params.paymentAmount} DBT கட்டணம் உங்கள் வங்கிக் கணக்கிற்கு அனுப்பப்பட்டது!`,
      bn: `${params.farmerName}, আপনার ₹${params.paymentAmount} DBT পেমেন্ট আপনার ব্যাংক অ্যাকাউন্টে পাঠানো হয়েছে!`,
    },
  };

  const msgMap = templates[params.eventType];
  if (msgMap) return msgMap[params.language] || msgMap.en;
  return `KisanFlow: ${params.eventType} for Token #${params.tokenNumber} — ${params.farmerName}. Call 1800-425-4747 for details.`;
}

// ============================================================
// 7. J-FORM DOCUMENT INTELLIGENCE
// ============================================================
export async function analyzeJForm(params: {
  farmerName: string;
  crop: string;
  quantityQuintals: number;
  mspRate: number;
  totalAmount: number;
  weighingQuantity?: number;
  jFormNumber: string;
  centreName: string;
  language: LanguageCode;
}): Promise<JFormIntelligence> {
  const ai = getGeminiClient();
  const anomalies: string[] = [];

  // Detect anomalies
  const expectedAmount = params.quantityQuintals * params.mspRate;
  if (Math.abs(expectedAmount - params.totalAmount) > 10) {
    anomalies.push(`Amount mismatch: Expected ₹${expectedAmount} (${params.quantityQuintals} Qtl × ₹${params.mspRate}) but J-Form shows ₹${params.totalAmount}`);
  }
  if (params.weighingQuantity && Math.abs(params.weighingQuantity - params.quantityQuintals) > 2) {
    anomalies.push(`Quantity discrepancy: Weighbridge recorded ${params.weighingQuantity} Qtl but J-Form shows ${params.quantityQuintals} Qtl`);
  }
  if (params.mspRate < 1800 || params.mspRate > 10000) {
    anomalies.push(`MSP rate ₹${params.mspRate}/Qtl appears unusual — verify against official government MSP notification`);
  }

  const langMeta = LANG_METADATA[params.language] || LANG_METADATA.te;

  if (ai) {
    try {
      const prompt = `You are a J-Form audit AI for India's MSP procurement.
Generate a readable summary and farmer-friendly message. Respond ONLY in JSON.

J-Form: ${params.jFormNumber}
Farmer: ${params.farmerName}
Crop: ${params.crop}
Quantity: ${params.quantityQuintals} Quintals
MSP Rate: ₹${params.mspRate}/Qtl
Total Amount: ₹${params.totalAmount}
Centre: ${params.centreName}
Anomalies Detected: ${anomalies.length > 0 ? anomalies.join('; ') : 'None'}

Return ONLY this JSON (no markdown):
{
  "receiptSummary": "2 sentence professional summary of the J-Form",
  "farmerMessage": "1 warm sentence in ${langMeta.name} (${langMeta.nativeName}) congratulating the farmer and telling them about payment"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        const rawText = response.text.trim().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(rawText);
        return {
          receiptSummary: parsed.receiptSummary,
          anomalies,
          farmerMessage: parsed.farmerMessage,
          source: 'gemini',
        };
      }
    } catch (err) {
      console.warn('J-Form intelligence Gemini error:', err);
    }
  }

  // Fallback
  const farmerMessages: Record<LanguageCode, string> = {
    te: `${params.farmerName} గారు, మీ ${params.crop} (${params.quantityQuintals} క్వింటాళ్లు) సేకరణ పూర్తయింది! ₹${params.totalAmount} మీ ఖాతాలో 2–3 రోజుల్లో జమ అవుతుంది.`,
    hi: `${params.farmerName} जी, आपकी ${params.crop} (${params.quantityQuintals} क्विंटल) की खरीद पूरी! ₹${params.totalAmount} 2-3 दिनों में बैंक खाते में आ जाएगा।`,
    en: `Dear ${params.farmerName}, your ${params.crop} procurement of ${params.quantityQuintals} Qtl is complete! ₹${params.totalAmount} will be credited to your bank account within 2–3 working days.`,
    kn: `${params.farmerName} ಅವರೇ, ₹${params.totalAmount} 2-3 ದಿನಗಳಲ್ಲಿ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮಾ ಆಗುತ್ತದೆ!`,
    ta: `${params.farmerName}, ₹${params.totalAmount} 2-3 நாட்களில் உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும்!`,
    bn: `${params.farmerName}, ₹${params.totalAmount} ২-৩ দিনের মধ্যে আপনার ব্যাংক অ্যাকাউন্টে জমা হবে!`,
  };

  return {
    receiptSummary: `J-Form ${params.jFormNumber} issued at ${params.centreName} for ${params.farmerName}. ${params.quantityQuintals} quintals of ${params.crop} procured at MSP rate ₹${params.mspRate}/Qtl — total payable ₹${params.totalAmount} via Direct Benefit Transfer.`,
    anomalies,
    farmerMessage: farmerMessages[params.language] || farmerMessages.en,
    source: 'rule_engine',
  };
}

// ============================================================
// 8. SUPPORT AGENT AI — ISSUE ANALYSIS & RESOLUTION
// ============================================================
export interface SupportAIAnalysis {
  issueSummary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedResolution: string[];
  draftSmsResponse: string;
  escalationNeeded: boolean;
  source: 'gemini' | 'rule_engine';
}

export async function analyzeSupportIssue(params: {
  issueType: string;
  grievanceText: string;
  farmerName: string;
  tokenNumber?: number;
  paymentStatus?: string;
  paymentAmount?: number;
  currentStage?: string;
  language: LanguageCode;
}): Promise<SupportAIAnalysis> {
  const ai = getGeminiClient();
  const langMeta = LANG_METADATA[params.language] || LANG_METADATA.te;

  if (ai) {
    try {
      const prompt = `You are an AI assistant for a government agricultural helpline support agent.
Analyze this farmer grievance and suggest resolution steps. Respond ONLY in JSON.

Issue Type: ${params.issueType}
Farmer: ${params.farmerName}
Token: ${params.tokenNumber ? '#' + params.tokenNumber : 'N/A'}
Current Stage: ${params.currentStage || 'N/A'}
Payment Status: ${params.paymentStatus || 'N/A'}
Payment Amount: ${params.paymentAmount ? '₹' + params.paymentAmount : 'N/A'}
Farmer's Complaint: "${params.grievanceText}"

Return ONLY this JSON (no markdown):
{
  "issueSummary": "1 sentence professional summary of the issue",
  "severity": "LOW or MEDIUM or HIGH",
  "suggestedResolution": ["Step 1", "Step 2", "Step 3"],
  "draftSmsResponse": "A short, warm SMS draft in ${langMeta.name} (${langMeta.nativeName}) to send to the farmer",
  "escalationNeeded": true or false
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        const rawText = response.text.trim().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(rawText);
        return { ...parsed, source: 'gemini' as const };
      }
    } catch (err) {
      console.warn('Support AI Gemini error:', err);
    }
  }

  // Rule-based fallback
  const isPaymentIssue = params.issueType.toLowerCase().includes('payment');
  const isQualityIssue = params.issueType.toLowerCase().includes('quality') || params.issueType.toLowerCase().includes('moisture');
  const isQueueIssue = params.issueType.toLowerCase().includes('queue') || params.issueType.toLowerCase().includes('slot');

  const smsDrafts: Record<LanguageCode, string> = {
    te: `${params.farmerName} గారు, మీ ఫిర్యాదు నమోదైంది. మా బృందం 24 గంటల్లో మీకు సంప్రదిస్తుంది. టోల్-ఫ్రీ: 1800-425-4747`,
    hi: `${params.farmerName} जी, आपकी शिकायत दर्ज हो गई। हमारी टीम 24 घंटे में संपर्क करेगी। 1800-425-4747`,
    en: `Dear ${params.farmerName}, your grievance has been registered. Our team will contact you within 24 hours. Helpline: 1800-425-4747`,
    kn: `${params.farmerName} ಅವರೇ, ನಿಮ್ಮ ದೂರು ದಾಖಲಾಗಿದೆ. 24 ಗಂಟೆಗಳಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತೇವೆ. 1800-425-4747`,
    ta: `${params.farmerName}, உங்கள் புகார் பதிவு செய்யப்பட்டது. 24 மணி நேரத்தில் தொடர்பு கொள்வோம். 1800-425-4747`,
    bn: `${params.farmerName}, আপনার অভিযোগ নথিভুক্ত করা হয়েছে। ২৪ ঘণ্টার মধ্যে যোগাযোগ করা হবে। 1800-425-4747`,
  };

  return {
    issueSummary: `${params.farmerName} raised a grievance regarding ${params.issueType}${params.tokenNumber ? ` (Token #${params.tokenNumber})` : ''}.`,
    severity: isPaymentIssue ? 'HIGH' : isQualityIssue ? 'MEDIUM' : 'LOW',
    suggestedResolution: isPaymentIssue
      ? [
          'Verify payment status on PFMS portal using transaction ID',
          'Check if Aadhaar-bank seeding is active for the farmer',
          'Escalate to district PFMS nodal officer if not credited within 5 working days',
        ]
      : isQualityIssue
      ? [
          'Request secondary moisture test by a different certified assayer',
          'Verify assayer calibration certificate is current',
          'Escalate to Mandi Supervisor if re-test result differs by >1%',
        ]
      : isQueueIssue
      ? [
          'Check farmer token status in real-time queue system',
          'If slot missed, reschedule to next available slot at any centre',
          'Send SMS with new token and centre details',
        ]
      : [
          'Record farmer details and issue type in the grievance log',
          'Forward to relevant department (Mandi/PFMS/Quality) for resolution',
          'Provide reference ticket number to farmer via SMS',
        ],
    draftSmsResponse: smsDrafts[params.language] || smsDrafts.en,
    escalationNeeded: isPaymentIssue || params.grievanceText.length > 100,
    source: 'rule_engine',
  };
}

// ============================================================
// INDIC NLP RULE ENGINE (unchanged + extended intents)
// ============================================================
function generateIndicNLPResponse(query: string, ctx: AssistantContext): AssistantResponse {
  const q = query.toLowerCase();
  const lang = ctx.language;
  const token = ctx.activeRegistration?.token_number;
  const stage = ctx.activeRegistration?.current_stage || 'GATE_ENTRY';
  const ahead = ctx.queueDepth;
  const mandi = ctx.activeRegistration?.centre_name || ctx.centres[0]?.name || 'Lakshmipur Mandi';

  // 1. Slot booking
  if (
    q.includes('బుక్') || q.includes('స్లాట్') || q.includes('book') || q.includes('slot') ||
    q.includes('स्लॉट') || q.includes('धान') || q.includes('ಬುಕ್') || q.includes('பதிவு') ||
    q.includes('paddy') || q.includes('వరి')
  ) {
    const responses: Record<LanguageCode, string> = {
      te: `మీరు వరి లేదా ఇతర పంట కోసం స్లాట్ బుక్ చేయవచ్చు. స్లాట్ బుకింగ్ విభాగంలో లేదా టోల్-ఫ్రీ 1800-425-4747 కాల్ ద్వారా తక్షణమే #1 నుండి ప్రారంభమయ్యే టోకెన్ పొందవచ్చు.`,
      hi: `आप धान या अन्य फसल के लिए स्लॉट बुक कर सकते हैं। 1800-425-4747 पर कॉल करके टोकन प्राप्त करें।`,
      en: `You can book a slot for Paddy or other crops. Visit the Slot Booking tab or call Toll-Free 1800-425-4747 to generate your token starting from #1.`,
      kn: `ಭತ್ತ ಅಥವಾ ಇತರ ಬೆಳೆಗಳಿಗೆ ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಲು ಸ್ಲಾಟ್ ಬುಕಿಂಗ್ ಪುಟಕ್ಕೆ ಹೋಗಿ ಅಥವಾ 1800-425-4747 ಗೆ ಕರೆ ಮಾಡಿ.`,
      ta: `நெல் அல்லது பிற பயிர்களுக்கு ஸ்லாட் பதிவு செய்ய ஸ்லாட் பதிவு பகுதிக்கு செல்லுங்கள் அல்லது 1800-425-4747 அழைக்கவும்.`,
      bn: `ধান বা অন্যান্য ফসলের জন্য স্লট বুক করতে স্লট বুকিং বিভাগে যান বা 1800-425-4747 নম্বরে কল করুন।`,
    };
    const text = responses[lang] || responses.en;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'book_slot' };
  }

  // 2. Token
  if (q.includes('టోకెన్') || q.includes('token') || q.includes('टोकन') || q.includes('ಟೋಕನ್') || q.includes('டோக்கன்') || q.includes('টোকেন')) {
    if (token) {
      const responses: Record<LanguageCode, string> = {
        te: `మీ టోకెన్ నంబర్ #${token}. ఇది ${mandi} వద్ద కేటాయించబడింది. ప్రస్తుత దశ: ${stage.replace(/_/g, ' ')}.`,
        hi: `आपका टोकन नंबर #${token} है। वर्तमान चरण: ${stage.replace(/_/g, ' ')}।`,
        en: `Your active token number is #${token} at ${mandi}. Current stage: ${stage.replace(/_/g, ' ')}.`,
        kn: `ನಿಮ್ಮ ಟೋಕನ್ ಸಂಖ್ಯೆ #${token}. ಪ್ರಸ್ತುತ ಹಂತ: ${stage.replace(/_/g, ' ')}.`,
        ta: `உங்கள் டோக்கன் எண் #${token}. தற்போதைய நிலை: ${stage.replace(/_/g, ' ')}.`,
        bn: `আপনার টোকেন নম্বর #${token}। বর্তমান ধাপ: ${stage.replace(/_/g, ' ')}।`,
      };
      const text = responses[lang] || responses.en;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'token_lookup' };
    } else {
      const responses: Record<LanguageCode, string> = {
        te: `ప్రస్తుతం మీకు క్రియాశీల టోకెన్ లేదు. దయచేసి స్లాట్ బుకింగ్ విభాగంలో పంట వివరాలను నమోదు చేసి టోకెన్ పొందండి.`,
        hi: `वर्तमान में आपके पास कोई सक्रिय टोकन नहीं है। कृपया स्लॉट बुक करें।`,
        en: `You currently have no active token. Please book a slot first to receive your token starting from #1.`,
        kn: `ಪ್ರಸ್ತುತ ನಿಮ್ಮಲ್ಲಿ ಸಕ್ರಿಯ ಟೋಕನ್ ಇಲ್ಲ. ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಿ.`,
        ta: `தற்போது உங்களிடம் செயலில் உள்ள டோக்கன் இல்லை. முதலில் ஒரு ஸ்லாட் பதிவு செய்யவும்.`,
        bn: `বর্তমানে আপনার কোনো সক্রিয় টোকেন নেই। অনুগ্রহ করে প্রথমে একটি স্লট বুক করুন।`,
      };
      const text = responses[lang] || responses.en;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'no_token' };
    }
  }

  // 3. Queue / Wait time
  if (
    q.includes('క్యూ') || q.includes('ఎంత మంది') || q.includes('ముందు') || q.includes('సమయం') ||
    q.includes('queue') || q.includes('wait') || q.includes('कतार') || q.includes('ಕಾಯುವ') || q.includes('வரிசை')
  ) {
    const responses: Record<LanguageCode, string> = {
      te: `ప్రస్తుతం క్యూలో మీ ముందు ${ahead} మంది రైతులు ఉన్నారు. అంచనా వేచి ఉండే సమయం సుమారు ${ahead * 35 + 15} నిమిషాలు.`,
      hi: `वर्तमान में कतार में आपके आगे ${ahead} किसान हैं। अनुमानित प्रतीक्षा समय लगभग ${ahead * 35 + 15} मिनट है।`,
      en: `There are currently ${ahead} farmers ahead of you in the queue. Estimated wait is ~${ahead * 35 + 15} minutes.`,
      kn: `ಪ್ರಸ್ತುತ ನಿಮ್ಮ ಮುಂದೆ ${ahead} ರೈತರಿದ್ದಾರೆ. ಅಂದಾಜು ಕಾಯುವ ಸಮಯ ~${ahead * 35 + 15} ನಿಮಿಷಗಳು.`,
      ta: `வரிசையில் உங்கள் முன்னால் ${ahead} விவசாயிகள் உள்ளனர். மதிப்பிடப்பட்ட காத்திருப்பு நேரம் ~${ahead * 35 + 15} நிமிடங்கள்.`,
      bn: `বর্তমানে আপনার সামনে ${ahead} জন কৃষক আছেন। আনুমানিক অপেক্ষার সময় ~${ahead * 35 + 15} মিনিট।`,
    };
    const text = responses[lang] || responses.en;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'queue_status' };
  }

  // 4. Quality & Moisture
  if (q.includes('క్వాలిటీ') || q.includes('తేమ') || q.includes('quality') || q.includes('moisture') || q.includes('नमी') || q.includes(' తేమ')) {
    const responses: Record<LanguageCode, string> = {
      te: `ప్రభుత్వ FAQ ప్రమాణాల ప్రకారం గరిష్ట తేమ శాతం 17% అనుమతించబడుతుంది. వరికి గ్రేడ్ A కోసం తేమ 13% లోపు ఉండాలి.`,
      hi: `सरकारी FAQ मानकों के अनुसार अधिकतम नमी 17% तक मान्य है। ग्रेड A के लिए 13% से कम होना चाहिए।`,
      en: `As per government FAQ standards, moisture up to 17% is acceptable. For Grade A Premium, moisture should be below 13%.`,
      kn: `ಸರ್ಕಾರಿ ನಿಯಮಾವಳಿಗಳ ಪ್ರಕಾರ ತೇವಾಂಶ 17% ಕ್ಕಿಂತ ಕಡಿಮೆ ಇರಬೇಕು.`,
      ta: `அரசு விதிகளின்படி ஈரப்பதம் 17% வரை அனுமதிக்கப்படுகிறது.`,
      bn: `সরকারি নিয়ম অনুযায়ী সর্বোচ্চ আর্দ্রতা ১৭% গ্রহণযোগ্য।`,
    };
    const text = responses[lang] || responses.en;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'quality_faq' };
  }

  // 5. Payment
  if (q.includes('పేమెంట్') || q.includes('డబ్బులు') || q.includes('payment') || q.includes('भुगतान') || q.includes('పైసలు') || q.includes('ಹಣ') || q.includes('பணம்') || q.includes('টাকা')) {
    if (ctx.payment) {
      const responses: Record<LanguageCode, string> = {
        te: `మీ చెల్లింపు స్థితి: ${ctx.payment.status}. మొత్తం: ₹${ctx.payment.amount}. లావాదేవీ ID: ${ctx.payment.transaction_id}.`,
        hi: `आपकी भुगतान स्थिति: ${ctx.payment.status}। कुल राशि: ₹${ctx.payment.amount}।`,
        en: `Your payment status is ${ctx.payment.status} for ₹${ctx.payment.amount}. TxID: ${ctx.payment.transaction_id}.`,
        kn: `ನಿಮ್ಮ ಪಾವತಿ ಸ್ಥಿತಿ: ${ctx.payment.status}. ಮೊತ್ತ: ₹${ctx.payment.amount}.`,
        ta: `உங்கள் கட்டண நிலை: ${ctx.payment.status}. தொகை: ₹${ctx.payment.amount}.`,
        bn: `আপনার পেমেন্ট স্থিতি: ${ctx.payment.status}। পরিমাণ: ₹${ctx.payment.amount}।`,
      };
      const text = responses[lang] || responses.en;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'payment_status' };
    } else {
      const responses: Record<LanguageCode, string> = {
        te: `ఇంకా చెల్లింపు సమాచారం నమోదు కాలేదు. తూకం మరియు J-ఫారం జారీ పూర్తయిన వెంటనే మీ ఆధార్-లింక్డ్ బ్యాంక్ ఖాతాకు DBT ప్రారంభమవుతుంది.`,
        hi: `अभी कोई भुगतान जानकारी उपलब्ध नहीं है। तौल और जे-फॉर्म के बाद बैंक खाते में डीबीटी शुरू होगा।`,
        en: `No payment information is available yet. DBT will initiate upon weighment completion and J-Form issuance.`,
        kn: `ಇನ್ನೂ ಪಾವತಿ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ. ತೂಕ ಮತ್ತು ಜೆ-ಫಾರ್ಮ್ ನಂತರ ಡಿಬಿಟಿ ಆರಂಭವಾಗುತ್ತದೆ.`,
        ta: `இன்னும் கட்டண விவரங்கள் கிடைக்கவில்லை.`,
        bn: `এখনও কোনো পেমেন্ট তথ্য পাওয়া যায়নি।`,
      };
      const text = responses[lang] || responses.en;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'no_payment' };
    }
  }

  // 6. MSP rates
  if (q.includes('msp') || q.includes('రేటు') || q.includes('rate') || q.includes('दर') || q.includes('ಬೆಲೆ') || q.includes('விலை') || q.includes('দাম')) {
    const cropRates = ctx.crops.map(c => `${c.name.split(' ')[0]}: ₹${c.msp_per_quintal}/Qtl`).join(', ');
    const responses: Record<LanguageCode, string> = {
      te: `2026-27 MSP రేట్లు: ${ctx.crops.map(c => `${c.name.split(' ')[0]} ₹${c.msp_per_quintal}`).join(', ')} (క్వింటాల్ కి). ఈ ధరలు ప్రభుత్వ ప్రకటన ప్రకారం.`,
      hi: `2026-27 MSP दरें: ${cropRates}। ये दरें सरकारी अधिसूचना के अनुसार हैं।`,
      en: `2026-27 MSP Rates: ${cropRates}. These rates are as per the official government notification.`,
      kn: `2026-27 MSP ದರಗಳು: ${cropRates}. ಸರ್ಕಾರಿ ಅಧಿಸೂಚನೆ ಪ್ರಕಾರ.`,
      ta: `2026-27 MSP விலைகள்: ${cropRates}. அரசாங்க அறிவிப்பின்படி.`,
      bn: `2026-27 MSP হার: ${cropRates}। সরকারি বিজ্ঞপ্তি অনুযায়ী।`,
    };
    const text = responses[lang] || responses.en;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'msp_rates' };
  }

  // 7. J-Form explanation
  if (q.includes('j form') || q.includes('j-form') || q.includes('jform') || q.includes('j ఫారం') || q.includes('जे फॉर्म') || q.includes('రశీదు')) {
    const responses: Record<LanguageCode, string> = {
      te: `J-ఫారం అనేది అధికారిక ప్రభుత్వ సేకరణ రశీదు. ఇది జారీ అయిన తర్వాత మీ ఆధార్-లింక్డ్ బ్యాంక్ ఖాతాకు DBT చెల్లింపు ప్రారంభమవుతుంది.`,
      hi: `जे-फॉर्म एक आधिकारिक सरकारी खरीद रसीद है। इसके जारी होने के बाद आपके आधार-लिंक्ड बैंक खाते में डीबीटी भुगतान शुरू होता है।`,
      en: `A J-Form is the official government procurement receipt. Once issued, it triggers DBT payment directly to your Aadhaar-linked bank account within 2–3 working days.`,
      kn: `ಜೆ-ಫಾರ್ಮ್ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಖರೀದಿ ರಸೀದಿ. ಇದು ಜಾರಿಯಾದ ನಂತರ ಡಿಬಿಟಿ ಪಾವತಿ ಆರಂಭವಾಗುತ್ತದೆ.`,
      ta: `J-ஃபார்ம் என்பது அரசு கொள்முதல் ரசீது. இது வழங்கப்பட்டதும் DBT பணம் வரும்.`,
      bn: `J-ফর্ম হল সরকারি ক্রয় রসিদ। এটি জারি হলে DBT পেমেন্ট আপনার ব্যাংকে যাবে।`,
    };
    const text = responses[lang] || responses.en;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'jform_help' };
  }

  // 8. PM-KISAN / scheme eligibility
  if (q.includes('pm kisan') || q.includes('కిసాన్ సమ్మాన్') || q.includes('పీఎం') || q.includes('किसान सम्मान') || q.includes('scheme') || q.includes('yojana') || q.includes('నిధి')) {
    const responses: Record<LanguageCode, string> = {
      te: `PM-కిసాన్ పథకం కింద 5 ఎకరాల కంటే తక్కువ భూమి ఉన్న రైతులకు సంవత్సరానికి ₹6,000 నేరుగా బ్యాంకు ఖాతాలో జమ అవుతుంది. నమోదు కోసం pmkisan.gov.in సందర్శించండి.`,
      hi: `PM-किसान योजना में 5 एकड़ से कम जमीन वाले किसानों को ₹6,000 प्रतिवर्ष सीधे बैंक खाते में मिलते हैं। pmkisan.gov.in पर जाएं।`,
      en: `Under PM-KISAN scheme, farmers with less than 5 acres (2 hectares) receive ₹6,000/year directly in their bank account in three installments. Visit pmkisan.gov.in to register.`,
      kn: `PM-ಕಿಸಾನ್ ಯೋಜನೆಯಡಿ 5 ಎಕರೆಗಿಂತ ಕಡಿಮೆ ಭೂಮಿ ಹೊಂದಿರುವ ರೈತರಿಗೆ ₹6,000/ವರ್ಷ ನೇರ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಸಿಗುತ್ತದೆ.`,
      ta: `PM-KISAN திட்டத்தில் 5 ஏக்கருக்கும் குறைவான நிலம் உள்ள விவசாயிகளுக்கு ₹6,000/ஆண்டு வழங்கப்படும்.`,
      bn: `PM-KISAN প্রকল্পে ৫ একরের কম জমির কৃষকরা বার্ষিক ₹৬,০০০ পান।`,
    };
    const text = responses[lang] || responses.en;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'scheme_eligibility' };
  }

  // Default greeting fallback
  const greeting = LANG_METADATA[lang]?.greeting || 'నమస్తే';
  const fallbackReplies: Record<LanguageCode, string> = {
    te: `${greeting}! కిసాన్ ఫ్లో సహాయ కేంద్రం. మీ టోకెన్, క్యూ, స్లాట్ బుకింగ్, MSP రేట్లు, J-ఫారం లేదా చెల్లింపుల గురించి అడగండి.`,
    hi: `${greeting}! किसानफ्लो में आपका स्वागत है। टोकन, MSP दरें, जे-फॉर्म या भुगतान के बारे में पूछें।`,
    en: `Hello! Welcome to KisanFlow AI. Ask about your token, live queue, MSP rates, J-Form, PM-KISAN eligibility, or DBT payment status.`,
    kn: `${greeting}! ಕಿಸಾನ್‌ಫ್ಲೋ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ಟೋಕನ್, MSP ದರಗಳು ಅಥವಾ ಪಾವತಿ ಬಗ್ಗೆ ಕೇಳಿ.`,
    ta: `${greeting}! கிசான்ஃப்ளோவிற்கு வரவேற்கிறோம். டோக்கன், MSP விலைகள் அல்லது பணம் பற்றி கேளுங்கள்.`,
    bn: `${greeting}! কিষাণফ্লোতে স্বাগতম। টোকেন, MSP দর বা পেমেন্ট সম্পর্কে জিজ্ঞাসা করুন।`,
  };
  const text = fallbackReplies[lang] || fallbackReplies.en;
  return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'greeting' };
}
