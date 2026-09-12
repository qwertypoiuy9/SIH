/**
 * KisanQ — Gemini Live API Service
 * Real-time bidirectional audio conversation with Gemini.
 *
 * Architecture:
 *  - Browser MediaRecorder → raw PCM chunks → Live session.sendRealtimeInput()
 *  - Gemini audio response (PCM base64) → Web Audio API playback
 *  - Tool calls handled inline: findNearbyProcurementCenters, getCropPrice,
 *    getMSP, getCenterDetails, bookSlot
 *  - Text transcripts surfaced for the UI conversation log
 *  - Graceful fallback to text+TTS mode when Live API unavailable
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { Centre, Crop, Registration, UserProfile, PaymentRecord } from '../types';
import { haversineKm } from './weatherService';

// ── Constants ─────────────────────────────────────────────────────────────────
const LIVE_MODEL = 'gemini-2.5-flash-preview-native-audio-dialog';
const PCM_SAMPLE_RATE = 16000;
const PCM_CHANNELS = 1;
const RESPONSE_SAMPLE_RATE = 24000; // Gemini outputs 24kHz PCM

function getGeminiKey(): string {
  return (
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY || ''
  );
}

// ── Context types ─────────────────────────────────────────────────────────────
export interface LiveAssistantContext {
  farmer?: UserProfile;
  centres: Centre[];
  crops: Crop[];
  registrations: Registration[];
  payments: PaymentRecord[];
  bookSlotFn: (data: { crop: string; quantity: number; centreId: string }) => Promise<Registration>;
}

export interface LiveSessionCallbacks {
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onModelTranscript: (text: string, isFinal: boolean) => void;
  onStateChange: (state: LiveSessionState) => void;
  onError: (message: string) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => void;
}

export type LiveSessionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'closed';

// ── PCM audio helpers ─────────────────────────────────────────────────────────

/** Convert Float32Array samples to Int16 PCM base64 */
function float32ToBase64PCM(float32Array: Float32Array): string {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode base64 PCM from Gemini → Float32Array for Web Audio */
function base64ToFloat32PCM(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const KISAN_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'findNearbyProcurementCenters',
        description: 'Find procurement centres near the farmer sorted by distance. Returns name, distance, queue, status, accepted crops, and hours.',
        parameters: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', description: 'Maximum number of centres to return (default 3)' },
            cropFilter: { type: 'string', description: 'Filter by accepted crop name (optional)' },
          },
          required: [],
        },
      },
      {
        name: 'getCropPrice',
        description: 'Get the current MSP (Minimum Support Price) for a specific crop.',
        parameters: {
          type: 'object',
          properties: {
            cropName: { type: 'string', description: 'Name of the crop in English or regional language' },
          },
          required: ['cropName'],
        },
      },
      {
        name: 'getMSP',
        description: 'Get all MSP rates for the current year (2026-27) for all crops.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'getCenterDetails',
        description: 'Get detailed information about a specific procurement centre including queue length, capacity, and status.',
        parameters: {
          type: 'object',
          properties: {
            centreId: { type: 'string', description: 'The centre ID' },
            centreName: { type: 'string', description: 'Centre name (partial match allowed)' },
          },
          required: [],
        },
      },
      {
        name: 'bookSlot',
        description: 'Book a procurement slot for the farmer at a specified centre.',
        parameters: {
          type: 'object',
          properties: {
            centreId: { type: 'string', description: 'The ID of the procurement centre' },
            crop: { type: 'string', description: 'Crop name (e.g. Paddy, Wheat)' },
            quantityQuintals: { type: 'number', description: 'Quantity in quintals' },
          },
          required: ['centreId', 'crop', 'quantityQuintals'],
        },
      },
      {
        name: 'getTokenStatus',
        description: 'Get the farmer\'s current token number, queue position, and estimated wait time.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'getPaymentStatus',
        description: 'Get the farmer\'s payment status including amount and disbursement details.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    ],
  },
];

// ── Build system instruction ──────────────────────────────────────────────────
function buildSystemInstruction(ctx: LiveAssistantContext): string {
  const farmer = ctx.farmer;
  const locationStr = farmer?.latitude && farmer?.longitude
    ? `${farmer.village || ''}, ${farmer.district || ''} (GPS: ${farmer.latitude.toFixed(4)}, ${farmer.longitude.toFixed(4)})`
    : `${farmer?.village || ''}, ${farmer?.district || 'Unknown location'}`;

  const farmerReg = ctx.registrations.find(
    r => r.farmer_id === farmer?.id || r.phone === farmer?.phone
  );
  const farmerPayment = ctx.payments.find(p => p.farmer_id === farmer?.id);

  const nearestCentres = ctx.centres
    .filter(c => c.distance_km < 999)
    .slice(0, 5)
    .map((c, i) =>
      `${i + 1}. ${c.name} | ${c.district}, ${c.state} | ${c.distance_km} km | Status: ${c.status} | Queue: ${c.current_queue} | Crops: ${(c.accepted_crops || []).join(', ') || 'All'} | Hours: ${c.open_hours} | ${c.is_open ? 'OPEN' : 'CLOSED'}`
    ).join('\n') || 'No centres loaded.';

  const cropLines = ctx.crops
    .filter(c => c.msp_per_quintal > 0)
    .slice(0, 12)
    .map(c => `${c.name}: ₹${c.msp_per_quintal}/Qtl (${c.category})`)
    .join(', ');

  return `You are KisanQ AI — a friendly voice assistant for Indian farmers using the government MSP procurement system.

LANGUAGE RULES (CRITICAL):
- Automatically detect the farmer's spoken language from their speech.
- Always respond in the SAME language the farmer speaks.
- Supported: Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, English.
- If the farmer switches language mid-conversation, switch immediately.
- Keep all responses SHORT (2–3 sentences max) and SIMPLE — like talking to a village elder.
- Avoid jargon. Use local crop names (వరి for Paddy in Telugu, etc.).
- NEVER read out long lists. Summarize to 2–3 most relevant items.

FARMER PROFILE:
- Name: ${farmer?.name || 'Farmer'}
- Location: ${locationStr}
- Land: ${farmer?.land_holding_acres || 'unknown'} acres
- Active Token: ${farmerReg ? `#${farmerReg.token_number} at ${farmerReg.centre_name}` : 'No active booking'}
- Crop in queue: ${farmerReg ? `${farmerReg.crop} (${farmerReg.quantity_quintals} Qtl)` : 'None'}
- Payment: ${farmerPayment ? `₹${farmerPayment.amount?.toLocaleString('en-IN')} — ${farmerPayment.status}` : 'No payment on record'}

NEAREST CENTRES:
${nearestCentres}

MSP RATES 2026-27: ${cropLines}

RULES:
- Quality: Paddy max 17% moisture, Wheat max 14% (FAQ standard).
- J-Form: Official receipt for DBT payment to Aadhaar-linked bank.
- PM-KISAN: ₹6,000/year for farmers with < 2 hectares land.
- Helpline: 1800-425-4747 (toll-free, 24x7).

TOOL USE:
- Use tools to get real data when farmer asks about centres, prices, tokens, payments, or booking.
- After a tool call, incorporate the result into a brief spoken answer.
- For bookSlot: confirm crop + quantity + centre name with farmer before executing.`;
}

// ── Execute tool functions ─────────────────────────────────────────────────────
function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: LiveAssistantContext,
  onToolCall: (name: string, args: Record<string, unknown>) => void
): Record<string, unknown> {
  onToolCall(name, args);

  const farmer = ctx.farmer;

  switch (name) {
    case 'findNearbyProcurementCenters': {
      const maxResults = (args.maxResults as number) || 3;
      const cropFilter = (args.cropFilter as string || '').toLowerCase();

      let centres = ctx.centres.filter(c => c.distance_km < 999);
      if (cropFilter) {
        centres = centres.filter(c =>
          (c.accepted_crops || []).some(crop => crop.toLowerCase().includes(cropFilter))
        );
      }
      centres = centres.slice(0, maxResults);

      return {
        centres: centres.map(c => ({
          id: c.id,
          name: c.name,
          district: c.district,
          distanceKm: c.distance_km,
          status: c.status,
          queueLength: c.current_queue,
          acceptedCrops: c.accepted_crops || [],
          openHours: c.open_hours,
          isOpen: c.is_open,
          avgProcessingMins: c.avg_processing_mins,
          contact: c.contact || '',
        })),
        farmerLocation: `${farmer?.village || ''}, ${farmer?.district || ''}`,
        totalFound: centres.length,
      };
    }

    case 'getCropPrice': {
      const cropName = (args.cropName as string || '').toLowerCase();
      const crop = ctx.crops.find(c =>
        c.name.toLowerCase().includes(cropName) ||
        (c.local_name || '').toLowerCase().includes(cropName)
      );
      if (!crop) {
        return { error: `Crop "${args.cropName}" not found. Available: ${ctx.crops.slice(0, 5).map(c => c.name).join(', ')}` };
      }
      return {
        cropName: crop.name,
        localName: crop.local_name,
        mspPerQuintal: crop.msp_per_quintal,
        category: crop.category,
        season: crop.season,
        hasMSP: crop.msp_per_quintal > 0,
        unit: 'per quintal',
        year: '2026-27',
      };
    }

    case 'getMSP': {
      const mspCrops = ctx.crops
        .filter(c => c.msp_per_quintal > 0)
        .map(c => ({ name: c.name, localName: c.local_name, msp: c.msp_per_quintal, category: c.category, season: c.season }));
      return { year: '2026-27', crops: mspCrops, currency: 'INR', unit: 'per quintal' };
    }

    case 'getCenterDetails': {
      const centreId = args.centreId as string | undefined;
      const centreName = (args.centreName as string || '').toLowerCase();
      const centre = centreId
        ? ctx.centres.find(c => c.id === centreId)
        : ctx.centres.find(c => c.name.toLowerCase().includes(centreName));

      if (!centre) return { error: 'Centre not found' };
      return {
        id: centre.id,
        name: centre.name,
        address: centre.address || `${centre.district}, ${centre.state}`,
        distanceKm: centre.distance_km,
        status: centre.status,
        queueLength: centre.current_queue,
        capacity: centre.capacity_per_day,
        countersActive: centre.counters_active,
        avgProcessingMins: centre.avg_processing_mins,
        openHours: centre.open_hours,
        isOpenNow: centre.is_open,
        acceptedCrops: centre.accepted_crops || [],
        contact: centre.contact || 'Not available',
        estimatedWaitMins: centre.current_queue * centre.avg_processing_mins,
      };
    }

    case 'bookSlot': {
      // Booking is async — signal intent; actual booking done in modal
      return {
        status: 'READY_TO_BOOK',
        centreId: args.centreId,
        crop: args.crop,
        quantityQuintals: args.quantityQuintals,
        message: 'Slot booking initiated. Confirm to complete.',
      };
    }

    case 'getTokenStatus': {
      const reg = ctx.registrations.find(
        r => r.farmer_id === farmer?.id || r.phone === farmer?.phone
      );
      if (!reg) return { hasToken: false, message: 'No active registration found.' };

      const farmersAhead = ctx.registrations.filter(
        r => r.centre_id === reg.centre_id &&
          r.token_number < reg.token_number &&
          r.procurement_status !== 'PROCUREMENT_COMPLETED' &&
          r.procurement_status !== 'QUALITY_REJECTED'
      ).length;

      return {
        hasToken: true,
        tokenNumber: reg.token_number,
        centreName: reg.centre_name,
        crop: reg.crop,
        quantityQuintals: reg.quantity_quintals,
        currentStage: reg.current_stage,
        status: reg.procurement_status,
        farmersAhead,
        estimatedWaitMins: farmersAhead * (reg.estimated_processing_mins || 35),
        preferredDate: reg.preferred_date,
        preferredTime: reg.preferred_time,
      };
    }

    case 'getPaymentStatus': {
      const payment = ctx.payments.find(p => p.farmer_id === farmer?.id);
      if (!payment) return { hasPayment: false, message: 'No payment record found.' };
      return {
        hasPayment: true,
        amount: payment.amount,
        status: payment.status,
        mspRate: payment.msp_price,
        quantity: payment.quantity,
        transactionId: payment.transaction_id || 'Pending',
        paymentDate: payment.payment_date || 'Not yet credited',
        bankAccount: payment.bank_account_masked || 'Not set',
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Main KisanLiveSession class ───────────────────────────────────────────────
export class KisanLiveSession {
  private ai: GoogleGenAI | null = null;
  private session: ReturnType<typeof Promise.resolve> | null = null;
  private sessionRef: { sendRealtimeInput: Function; sendToolResponse: Function; close: Function } | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private pendingAudioChunks: Float32Array[] = [];
  private isPlayingAudio = false;
  private audioQueue: Float32Array[] = [];
  private state: LiveSessionState = 'idle';
  private ctx: LiveAssistantContext;
  private callbacks: LiveSessionCallbacks;
  private isClosed = false;

  constructor(ctx: LiveAssistantContext, callbacks: LiveSessionCallbacks) {
    this.ctx = ctx;
    this.callbacks = callbacks;
  }

  updateContext(ctx: LiveAssistantContext) {
    this.ctx = ctx;
  }

  private setState(s: LiveSessionState) {
    this.state = s;
    this.callbacks.onStateChange(s);
  }

  getState(): LiveSessionState { return this.state; }

  // ── Connect ────────────────────────────────────────────────────────────────
  async connect(): Promise<void> {
    const key = getGeminiKey();
    if (!key) {
      this.callbacks.onError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env.local file.');
      this.setState('error');
      return;
    }

    this.setState('connecting');
    this.isClosed = false;

    try {
      this.ai = new GoogleGenAI({ apiKey: key });

      const sessionPromise = await (this.ai as any).live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
          systemInstruction: { parts: [{ text: buildSystemInstruction(this.ctx) }] },
          tools: KISAN_TOOLS,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (!this.isClosed) this.setState('listening');
          },
          onmessage: (message: unknown) => {
            if (!this.isClosed) this.handleMessage(message);
          },
          onerror: (e: { message?: string }) => {
            if (!this.isClosed) {
              this.callbacks.onError(e.message || 'Live API connection error');
              this.setState('error');
            }
          },
          onclose: (e: { reason?: string }) => {
            if (!this.isClosed) {
              this.setState('closed');
            }
          },
        },
      });

      this.sessionRef = sessionPromise;
      this.setState('connected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Gemini Live API';
      this.callbacks.onError(this.friendlyError(msg));
      this.setState('error');
      throw err;
    }
  }

  // ── Handle incoming messages ───────────────────────────────────────────────
  private handleMessage(message: unknown) {
    const msg = message as Record<string, unknown>;
    const content = msg.serverContent as Record<string, unknown> | undefined;

    // Audio response chunks
    if (content?.modelTurn) {
      const parts = (content.modelTurn as Record<string, unknown>)?.parts as unknown[] | undefined;
      if (parts) {
        for (const part of parts) {
          const p = part as Record<string, unknown>;
          if (p.inlineData) {
            const d = p.inlineData as Record<string, unknown>;
            if (d.data && typeof d.data === 'string') {
              const float32 = base64ToFloat32PCM(d.data as string);
              this.audioQueue.push(float32);
              if (!this.isPlayingAudio) this.drainAudioQueue();
              this.setState('speaking');
            }
          }
        }
      }
    }

    // Input transcription (what user said)
    if (content?.inputTranscription) {
      const t = content.inputTranscription as Record<string, unknown>;
      const text = (t.text as string) || '';
      if (text) {
        this.callbacks.onUserTranscript(text, true);
        this.setState('thinking');
      }
    }

    // Output transcription (what model says)
    if (content?.outputTranscription) {
      const t = content.outputTranscription as Record<string, unknown>;
      const text = (t.text as string) || '';
      if (text) this.callbacks.onModelTranscript(text, true);
    }

    // Turn complete
    if (content?.turnComplete) {
      if (this.audioQueue.length === 0 && !this.isPlayingAudio) {
        this.setState('listening');
      }
    }

    // Tool calls
    if (msg.toolCall) {
      const toolCall = msg.toolCall as Record<string, unknown>;
      const fns = (toolCall.functionCalls as unknown[]) || [];
      const responses: unknown[] = [];

      for (const fc of fns) {
        const call = fc as Record<string, unknown>;
        const result = executeTool(
          call.name as string,
          (call.args as Record<string, unknown>) || {},
          this.ctx,
          this.callbacks.onToolCall
        );

        // Handle async bookSlot
        if (call.name === 'bookSlot' && result.status === 'READY_TO_BOOK') {
          const bookArgs = call.args as { centreId: string; crop: string; quantityQuintals: number };
          this.ctx.bookSlotFn({
            centreId: bookArgs.centreId,
            crop: bookArgs.crop,
            quantity: bookArgs.quantityQuintals,
          }).then(reg => {
            // Send follow-up text confirming booking
            this.sendText(`Slot booked successfully. Token number is ${reg.token_number}.`);
          }).catch(e => {
            this.sendText(`Booking failed: ${e.message}. Please try again.`);
          });
        }

        responses.push({
          name: call.name,
          id: call.id,
          response: { result },
        });
      }

      this.sessionRef?.sendToolResponse({ functionResponses: responses });
    }
  }

  // ── Drain + play audio queue ───────────────────────────────────────────────
  private async drainAudioQueue() {
    if (this.isPlayingAudio || this.audioQueue.length === 0) return;
    this.isPlayingAudio = true;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: RESPONSE_SAMPLE_RATE });
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      while (this.audioQueue.length > 0) {
        const chunk = this.audioQueue.shift()!;
        const buffer = this.audioContext.createBuffer(1, chunk.length, RESPONSE_SAMPLE_RATE);
        buffer.getChannelData(0).set(chunk);

        await new Promise<void>(resolve => {
          const source = this.audioContext!.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioContext!.destination);
          source.onended = () => resolve();
          source.start();
        });
      }
    } catch {
      // Audio playback failed silently
    } finally {
      this.isPlayingAudio = false;
      if (this.audioQueue.length > 0) this.drainAudioQueue();
      else if (this.state === 'speaking') this.setState('listening');
    }
  }

  // ── Start microphone capture ───────────────────────────────────────────────
  async startMic(): Promise<void> {
    if (!this.sessionRef) throw new Error('Session not connected');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: PCM_SAMPLE_RATE,
          channelCount: PCM_CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: PCM_SAMPLE_RATE });
      } else if (this.audioContext.sampleRate !== PCM_SAMPLE_RATE) {
        this.audioContext = new AudioContext({ sampleRate: PCM_SAMPLE_RATE });
      }
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      // ScriptProcessor is deprecated but still widely supported; worklets require HTTPS + SharedArrayBuffer
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        if (this.isClosed || !this.sessionRef) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmB64 = float32ToBase64PCM(inputData);
        this.sessionRef.sendRealtimeInput({
          audio: { data: pcmB64, mimeType: `audio/pcm;rate=${PCM_SAMPLE_RATE}` },
        });
      };

      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      this.setState('listening');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone error';
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        this.callbacks.onError('Microphone permission denied. Please allow microphone access in your browser settings and try again.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        this.callbacks.onError('No microphone found. Please connect a microphone and try again.');
      } else {
        this.callbacks.onError(`Microphone error: ${msg}`);
      }
      this.setState('error');
      throw err;
    }
  }

  // ── Stop microphone ────────────────────────────────────────────────────────
  stopMic() {
    try {
      this.scriptProcessor?.disconnect();
      this.sourceNode?.disconnect();
    } catch { /* ignore */ }
    this.scriptProcessor = null;
    this.sourceNode = null;
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
  }

  // ── Send text query (for typed input / chip clicks) ────────────────────────
  sendText(text: string) {
    if (!this.sessionRef) return;
    try {
      this.sessionRef.sendRealtimeInput({ text });
      this.setState('thinking');
    } catch { /* ignore */ }
  }

  // ── Interrupt current response ─────────────────────────────────────────────
  interrupt() {
    this.audioQueue = [];
    this.isPlayingAudio = false;
    if (this.audioContext) {
      // Stop all scheduled audio by recreating context
      try { this.audioContext.close(); } catch { /* ignore */ }
      this.audioContext = new AudioContext({ sampleRate: RESPONSE_SAMPLE_RATE });
    }
    if (this.state === 'speaking') this.setState('listening');
  }

  // ── Close session ──────────────────────────────────────────────────────────
  close() {
    this.isClosed = true;
    this.stopMic();
    try { this.sessionRef?.close(); } catch { /* ignore */ }
    try { this.audioContext?.close(); } catch { /* ignore */ }
    this.sessionRef = null;
    this.audioContext = null;
    this.audioQueue = [];
    this.setState('closed');
  }

  // ── User-friendly error messages ───────────────────────────────────────────
  private friendlyError(msg: string): string {
    if (msg.includes('API_KEY') || msg.includes('invalid') || msg.includes('Unauthorized')) {
      return 'Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY setting.';
    }
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return 'Gemini API quota exceeded. Please try again in a few minutes.';
    }
    if (msg.includes('model') || msg.includes('not found') || msg.includes('404')) {
      return 'Live API model unavailable. Switching to text mode.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    return `Connection error: ${msg}`;
  }
}

// ── Singleton factory ─────────────────────────────────────────────────────────
let _instance: KisanLiveSession | null = null;

export function createLiveSession(
  ctx: LiveAssistantContext,
  callbacks: LiveSessionCallbacks
): KisanLiveSession {
  if (_instance) {
    try { _instance.close(); } catch { /* ignore */ }
  }
  _instance = new KisanLiveSession(ctx, callbacks);
  return _instance;
}

export function isLiveAPISupported(): boolean {
  // Requires: getUserMedia + AudioContext + fetch + WebSocket
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(window.AudioContext || (window as any).webkitAudioContext) &&
    typeof WebSocket !== 'undefined'
  );
}
