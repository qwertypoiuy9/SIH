/**
 * KisanQ Voice Assistant Modal — Gemini Live API Edition
 *
 * UI is identical to the previous version.
 * Audio pipeline: mic PCM → Gemini Live session → PCM audio playback
 * Typed input / quick chips still work by calling session.sendText()
 * Falls back gracefully when Live API is unavailable (API error / no mic)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useKisanQ } from '../../context/KisanFlowContext';
import { soundController } from '../../utils/audio';
import { SUPPORTED_LANGUAGES, translations } from '../../translations';
import {
  Mic, MicOff, Volume2, Globe, X, Send,
  Bot, User, Zap, Bell, Radio, AlertCircle, Loader2,
} from 'lucide-react';
import { LanguageCode } from '../../types';
import { getAIAssistantResponse } from '../../services/aiAssistantService';
import {
  KisanLiveSession,
  LiveSessionState,
  createLiveSession,
  isLiveAPISupported,
} from '../../services/geminiLiveService';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ConversationTurn {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  lang: string;
  timestamp: string;
  source?: 'gemini-live' | 'gemini' | 'indic_nlp';
  toolUsed?: string;
}

// ── Quick chips ───────────────────────────────────────────────────────────────
const QUICK_CHIPS: Record<LanguageCode, { label: string; query: string }[]> = {
  te: [
    { label: '📍 దగ్గర కేంద్రం',  query: 'నా దగ్గర ఉన్న కొనుగోలు కేంద్రం ఏది? దూరం ఎంత?' },
    { label: '💰 MSP రేట్లు',      query: 'ఈ సంవత్సరం వరి, గోధుమ, పత్తి MSP రేట్లు ఏమిటి?' },
    { label: '🎫 నా టోకెన్',       query: 'నా టోకెన్ నంబర్ ఏమిటి? ఎంత మంది నా ముందు ఉన్నారు?' },
    { label: '💳 చెల్లింపు',       query: 'నా పేమెంట్ స్థితి ఏమిటి?' },
    { label: '🌾 నాణ్యత',          query: 'తేమ శాతం ప్రమాణాలు ఏమిటి?' },
    { label: '📄 J-ఫారం',          query: 'J-ఫారం అంటే ఏమిటి?' },
    { label: '🏛️ PM-కిసాన్',       query: 'PM కిసాన్ పథకం అర్హత ఏమిటి?' },
    { label: '📝 స్లాట్',          query: 'స్లాట్ ఎలా బుక్ చేయాలి?' },
  ],
  hi: [
    { label: '📍 नजदीकी केंद्र',   query: 'मेरे नजदीक कौन सा खरीद केंद्र है?' },
    { label: '💰 MSP दरें',        query: 'इस साल धान, गेहूं, कपास की MSP दरें क्या हैं?' },
    { label: '🎫 मेरा टोकन',       query: 'मेरा टोकन नंबर और मेरे आगे कितने किसान हैं?' },
    { label: '💳 भुगतान',          query: 'मेरी भुगतान स्थिति क्या है?' },
    { label: '🌾 गुणवत्ता',        query: 'नमी प्रतिशत मानक क्या हैं?' },
    { label: '📄 जे-फॉर्म',        query: 'जे-फॉर्म क्या होता है?' },
    { label: '🏛️ PM-किसान',       query: 'PM किसान योजना की पात्रता क्या है?' },
    { label: '📝 स्लॉट',           query: 'स्लॉट कैसे बुक करें?' },
  ],
  en: [
    { label: '📍 Nearest Centre',  query: 'Which procurement centre is nearest to me?' },
    { label: '💰 MSP Prices',      query: 'What are the MSP rates for paddy, wheat and cotton?' },
    { label: '🎫 My Token',        query: 'What is my token number and queue position?' },
    { label: '💳 Payment',         query: 'What is my payment status?' },
    { label: '🌾 Quality',         query: 'What are the moisture percentage standards?' },
    { label: '📄 J-Form',          query: 'What is a J-Form?' },
    { label: '🏛️ PM-KISAN',       query: 'What is PM KISAN scheme eligibility?' },
    { label: '📝 Book Slot',       query: 'How do I book a slot?' },
  ],
  kn: [
    { label: '📍 ಹತ್ತಿರದ ಕೇಂದ್ರ', query: 'ನನ್ನ ಹತ್ತಿರ ಯಾವ ಖರೀದಿ ಕೇಂದ್ರ ಇದೆ?' },
    { label: '💰 MSP ದರ',          query: 'ಈ ವರ್ಷ ಭತ್ತ ಮತ್ತು ಗೋಧಿ MSP ದರಗಳು ಏನು?' },
    { label: '🎫 ನನ್ನ ಟೋಕನ್',     query: 'ನನ್ನ ಟೋಕನ್ ಸಂಖ್ಯೆ ಏನು?' },
    { label: '💳 ಪಾವತಿ',           query: 'ನನ್ನ ಪಾವತಿ ಸ್ಥಿತಿ ಏನು?' },
    { label: '🌾 ಗುಣಮಟ್ಟ',         query: 'ತೇವಾಂಶ ಮಾನದಂಡಗಳು ಏನು?' },
    { label: '📄 ಜೆ-ಫಾರ್ಮ್',       query: 'ಜೆ-ಫಾರ್ಮ್ ಎಂದರೇನು?' },
    { label: '🏛️ PM-ಕಿಸಾನ್',      query: 'PM ಕಿಸಾನ್ ಯೋಜನೆ ಅರ್ಹತೆ ಏನು?' },
    { label: '📝 ಸ್ಲಾಟ್',           query: 'ಸ್ಲಾಟ್ ಹೇಗೆ ಬುಕ್ ಮಾಡಬೇಕು?' },
  ],
  ta: [
    { label: '📍 அருகில் உள்ள மையம்', query: 'என் அருகில் உள்ள கொள்முதல் மையம் எது?' },
    { label: '💰 MSP விலை',          query: 'இந்த ஆண்டு நெல் MSP விலை என்ன?' },
    { label: '🎫 என் டோக்கன்',        query: 'என் டோக்கன் எண் என்ன?' },
    { label: '💳 கட்டணம்',            query: 'என் கட்டண நிலை என்ன?' },
    { label: '🌾 தர சோதனை',           query: 'ஈரப்பதம் தரநிலை என்ன?' },
    { label: '📄 J-ஃபார்ம்',          query: 'J-ஃபார்ம் என்றால் என்ன?' },
    { label: '🏛️ PM-KISAN',          query: 'PM KISAN தகுதி என்ன?' },
    { label: '📝 ஸ்லாட்',             query: 'ஸ்லாட் எப்படி பதிவு செய்வது?' },
  ],
  bn: [
    { label: '📍 নিকটতম কেন্দ্র',   query: 'আমার কাছের ক্রয় কেন্দ্র কোনটি?' },
    { label: '💰 MSP মূল্য',          query: 'এই বছর ধান এবং গম MSP মূল্য কত?' },
    { label: '🎫 আমার টোকেন',         query: 'আমার টোকেন নম্বর কী?' },
    { label: '💳 পেমেন্ট',            query: 'আমার পেমেন্ট অবস্থা কী?' },
    { label: '🌾 মান পরীক্ষা',         query: 'আর্দ্রতার মান কী?' },
    { label: '📄 J-ফর্ম',             query: 'J-ফর্ম কী?' },
    { label: '🏛️ PM-KISAN',          query: 'PM KISAN যোগ্যতা কী?' },
    { label: '📝 স্লট',               query: 'স্লট কীভাবে বুক করবেন?' },
  ],
};

// ── Status label map ──────────────────────────────────────────────────────────
const STATE_LABELS: Record<LiveSessionState, string> = {
  idle:       'Ready',
  connecting: 'Connecting…',
  connected:  'Connected',
  listening:  'Listening…',
  thinking:   'Thinking…',
  speaking:   'Speaking…',
  error:      'Error',
  closed:     'Closed',
};

const STATE_COLORS: Record<LiveSessionState, string> = {
  idle:       'bg-stone-400',
  connecting: 'bg-amber-400 animate-pulse',
  connected:  'bg-blue-400',
  listening:  'bg-emerald-400 animate-pulse',
  thinking:   'bg-amber-400 animate-bounce',
  speaking:   'bg-blue-400 animate-pulse',
  error:      'bg-red-500',
  closed:     'bg-stone-400',
};

// ── Component ─────────────────────────────────────────────────────────────────
export const VoiceAssistantModal: React.FC = () => {
  const {
    language, setLanguage,
    isVoiceAssistantOpen, setIsVoiceAssistantOpen,
    authSession, registrations, centres, crops, payments,
    bookFarmerSlot,
  } = useKisanQ();

  // ── Conversation state ────────────────────────────────────────────────────
  const [conversations, setConversations]       = useState<ConversationTurn[]>([]);
  const [typedQuery,    setTypedQuery]           = useState('');
  const [interimText,   setInterimText]          = useState('');
  const [isMicOn,       setIsMicOn]              = useState(false);
  const [sessionState,  setSessionState]         = useState<LiveSessionState>('idle');
  const [errorBanner,   setErrorBanner]          = useState('');
  const [usingFallback, setUsingFallback]        = useState(false);
  const [isProcessingText, setIsProcessingText] = useState(false);
  const [proactiveShown,   setProactiveShown]   = useState(false);
  const [pendingTool,      setPendingTool]       = useState('');

  const sessionRef    = useRef<KisanLiveSession | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);

  // ── Derived farmer context ────────────────────────────────────────────────
  const farmer    = authSession.user || undefined;
  const farmerReg = registrations.find(r => r.farmer_id === farmer?.id || r.phone === farmer?.phone);
  const farmerPayment = payments.find(p => p.farmer_id === farmer?.id);
  const queueDepth = registrations.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;
  const farmersAhead = farmerReg
    ? registrations.filter(
        r => r.centre_id === farmerReg.centre_id &&
          r.token_number < farmerReg.token_number &&
          r.procurement_status !== 'PROCUREMENT_COMPLETED' &&
          r.procurement_status !== 'QUALITY_REJECTED'
      ).length
    : 0;

  // ── Auto scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    transcriptRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, interimText]);

  // ── Build live context object ─────────────────────────────────────────────
  const buildCtx = useCallback(() => ({
    farmer,
    centres,
    crops,
    registrations,
    payments,
    bookSlotFn: bookFarmerSlot,
  }), [farmer, centres, crops, registrations, payments, bookFarmerSlot]);

  // ── Add turn helper ───────────────────────────────────────────────────────
  const addTurn = useCallback((turn: Omit<ConversationTurn, 'id' | 'timestamp'>) => {
    setConversations(prev => [...prev, {
      ...turn,
      id: `${turn.sender}_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, []);

  // ── Initialise Live session ───────────────────────────────────────────────
  const initLiveSession = useCallback(async () => {
    setErrorBanner('');
    setUsingFallback(false);

    if (!isLiveAPISupported()) {
      setUsingFallback(true);
      setErrorBanner('Live API not supported in this browser. Using text mode.');
      setSessionState('connected');
      return;
    }

    const session = createLiveSession(buildCtx(), {
      onUserTranscript: (text, _final) => {
        setInterimText('');
        addTurn({ sender: 'user', text, lang: 'auto', source: 'gemini-live' });
      },
      onModelTranscript: (text, _final) => {
        if (!text.trim()) return;
        addTurn({ sender: 'assistant', text, lang: language, source: 'gemini-live' });
      },
      onStateChange: (s) => {
        setSessionState(s);
        if (s === 'listening') setInterimText('');
        if (s === 'error' || s === 'closed') setIsMicOn(false);
      },
      onError: (msg) => {
        setErrorBanner(msg);
        // If Live API errors (model not available, quota etc) → fall back to text
        if (msg.includes('model') || msg.includes('quota') || msg.includes('Switching')) {
          setUsingFallback(true);
          setSessionState('connected');
        } else {
          setSessionState('error');
        }
      },
      onToolCall: (name, _args) => {
        setPendingTool(name);
        setTimeout(() => setPendingTool(''), 3000);
      },
    });

    sessionRef.current = session;

    try {
      await session.connect();
    } catch {
      // Error already handled in callback → fall back to text mode
      setUsingFallback(true);
      setSessionState('connected');
    }
  }, [buildCtx, addTurn, language]);

  // ── Open / close lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!isVoiceAssistantOpen) return;

    // Reset
    setConversations([]);
    setInterimText('');
    setIsMicOn(false);
    setErrorBanner('');
    setProactiveShown(false);

    // Welcome message
    const welcomes: Record<LanguageCode, string> = {
      te: 'నమస్తే! కిసాన్‌ఫ్లో AI తో మాట్లాడండి. మైక్ నొక్కి మీ భాషలో మాట్లాడండి.',
      hi: 'नमस्ते! किसानफ्लो AI से बात करें। माइक दबाकर अपनी भाषा में बोलें।',
      en: 'Hello! Talk to KisanQ AI. Press the mic and speak in any language.',
      kn: 'ನಮಸ್ಕಾರ! ಕಿಸಾನ್‌ಫ್ಲೋ AI ಜೊತೆ ಮಾತನಾಡಿ. ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ.',
      ta: 'வணக்கம்! கிசான்ஃப்ளோ AI யுடன் பேசுங்கள். மைக்கை அழுத்தி உங்கள் மொழியில் பேசுங்கள்.',
      bn: 'নমস্কার! কিষাণফ্লো AI-এর সাথে কথা বলুন। মাইক চাপুন এবং আপনার ভাষায় কথা বলুন।',
    };

    setConversations([{
      id: 'welcome',
      sender: 'assistant',
      text: welcomes[language] || welcomes.en,
      lang: language,
      timestamp: 'Just now',
      source: 'gemini-live',
    }]);

    // Init Live session
    initLiveSession();

    return () => {
      sessionRef.current?.stopMic();
      sessionRef.current?.close();
      sessionRef.current = null;
    };
  }, [isVoiceAssistantOpen]); // only run on open/close

  // Update session context when data changes
  useEffect(() => {
    sessionRef.current?.updateContext(buildCtx());
  }, [centres, crops, registrations, payments]);

  // Proactive queue alert
  useEffect(() => {
    if (!isVoiceAssistantOpen || !farmerReg || proactiveShown) return;
    if (farmersAhead <= 3 && farmersAhead >= 0) {
      const alertMap: Record<LanguageCode, string> = {
        te: `🔔 మీ ముందు కేవలం ${farmersAhead} మంది! టోకెన్ #${farmerReg.token_number} త్వరలో పిలువబడుతుంది. గేట్ 1 దగ్గర సిద్ధంగా ఉండండి.`,
        hi: `🔔 आपके आगे केवल ${farmersAhead} किसान! टोकन #${farmerReg.token_number} जल्द बुलाया जाएगा। गेट 1 पर तैयार रहें।`,
        en: `🔔 Only ${farmersAhead} farmer(s) ahead! Token #${farmerReg.token_number} will be called soon. Please move to Gate 1.`,
        kn: `🔔 ನಿಮ್ಮ ಮುಂದೆ ಕೇವಲ ${farmersAhead} ರೈತರು! ಟೋಕನ್ #${farmerReg.token_number} ಶೀಘ್ರದಲ್ಲಿ ಕರೆಯಲ್ಪಡುತ್ತದೆ.`,
        ta: `🔔 உங்கள் முன்னால் ${farmersAhead} பேர் மட்டுமே! டோக்கன் #${farmerReg.token_number} விரைவில் அழைக்கப்படும்.`,
        bn: `🔔 আপনার সামনে মাত্র ${farmersAhead} জন! টোকেন #${farmerReg.token_number} শীঘ্রই ডাকা হবে।`,
      };
      setTimeout(() => {
        soundController.playTurnChime();
        addTurn({ sender: 'assistant', text: alertMap[language] || alertMap.en, lang: language, source: 'gemini-live' });
        setProactiveShown(true);
      }, 1800);
    }
  }, [isVoiceAssistantOpen, farmerReg, farmersAhead, language]);

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const handleToggleMic = async () => {
    if (usingFallback) {
      setErrorBanner('Voice input not available. Please type your question below.');
      return;
    }

    if (isMicOn) {
      sessionRef.current?.stopMic();
      setIsMicOn(false);
      setInterimText('');
      return;
    }

    if (!sessionRef.current || sessionState === 'idle' || sessionState === 'error') {
      await initLiveSession();
    }

    try {
      await sessionRef.current?.startMic();
      setIsMicOn(true);
      setInterimText('Listening…');
    } catch {
      setIsMicOn(false);
      setInterimText('');
    }
  };

  // ── Interrupt Gemini while speaking ──────────────────────────────────────
  const handleInterrupt = () => {
    sessionRef.current?.interrupt();
    setSessionState('listening');
  };

  // ── Send typed / chip text ────────────────────────────────────────────────
  const handleSendText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setTypedQuery('');
    addTurn({ sender: 'user', text, lang: language });
    soundController.playTurnChime();

    // If Live session is up, just send — model will respond via transcript callbacks
    if (!usingFallback && sessionRef.current && sessionState !== 'error') {
      sessionRef.current.sendText(text);
      return;
    }

    // Fallback: use generateContent (text-only mode)
    setIsProcessingText(true);
    try {
      const resp = await getAIAssistantResponse(text, {
        farmer,
        activeRegistration: farmerReg,
        centres,
        crops,
        payment: farmerPayment,
        queueDepth,
        language,
      });
      addTurn({ sender: 'assistant', text: resp.replyText, lang: language, source: resp.source as 'gemini' });
      soundController.speak(resp.speakText, language + '-IN');
    } catch {
      addTurn({
        sender: 'assistant',
        text: 'Sorry, I could not process that. Please try again or call 1800-425-4747.',
        lang: 'en',
        source: 'indic_nlp',
      });
    } finally {
      setIsProcessingText(false);
    }
  }, [usingFallback, sessionState, farmer, farmerReg, centres, crops, farmerPayment, queueDepth, language, addTurn]);

  // ── Close ─────────────────────────────────────────────────────────────────
  const handleClose = () => {
    sessionRef.current?.stopMic();
    sessionRef.current?.close();
    sessionRef.current = null;
    setIsMicOn(false);
    soundController.stopSpeaking();
    setIsVoiceAssistantOpen(false);
  };

  if (!isVoiceAssistantOpen) return null;

  const chips = QUICK_CHIPS[language] || QUICK_CHIPS.en;
  const isThinking = sessionState === 'thinking' || isProcessingText;
  const isSpeaking = sessionState === 'speaking';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Bot avatar with live status dot */}
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center relative">
              <Bot className="w-6 h-6 text-amber-300" />
              <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-emerald-900 ${STATE_COLORS[sessionState]}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm">KisanQ AI</h3>
                {!usingFallback && (
                  <span className="text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5" /> LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-200 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${STATE_COLORS[sessionState]}`} />
                {pendingTool
                  ? `🔧 ${pendingTool.replace(/([A-Z])/g, ' $1').toLowerCase()}…`
                  : STATE_LABELS[sessionState]}
                {usingFallback && ' · Text mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Proactive alert badge */}
            {farmerReg && farmersAhead <= 3 && (
              <div className="flex items-center gap-1 bg-amber-400 text-stone-900 text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
                <Bell className="w-3 h-3" />
                <span>{farmersAhead} ahead!</span>
              </div>
            )}

            {/* Interrupt button — only when speaking */}
            {isSpeaking && (
              <button onClick={handleInterrupt}
                className="p-1.5 rounded-xl hover:bg-white/10 text-amber-300 cursor-pointer" title="Stop speaking">
                <Volume2 className="w-4 h-4" />
              </button>
            )}

            {/* Language selector */}
            <div className="flex items-center gap-1 bg-emerald-900 rounded-xl px-2 py-1 border border-emerald-700">
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              <select value={language} onChange={e => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-white text-xs cursor-pointer focus:outline-none">
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="bg-emerald-900">{l.nativeName}</option>
                ))}
              </select>
            </div>

            <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────────────────────── */}
        {errorBanner && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2 text-xs text-amber-800 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner('')} className="ml-auto shrink-0 text-amber-600 hover:text-amber-900 cursor-pointer">✕</button>
          </div>
        )}

        {/* ── Active token bar ───────────────────────────────────────────── */}
        {farmerReg && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-900">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-bold">Token #{farmerReg.token_number}</span>
              <span className="text-amber-700">·</span>
              <span>{farmerReg.crop} ({farmerReg.quantity_quintals} Qtl)</span>
            </div>
            <span className="font-bold text-amber-800">{farmersAhead} ahead · ~{farmersAhead * 35 + 15} min</span>
          </div>
        )}

        {/* ── Conversation stream ────────────────────────────────────────── */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-stone-50">
          {conversations.map(turn => {
            const isUser = turn.sender === 'user';
            return (
              <div key={turn.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 text-[10px] font-bold">KF</div>
                )}
                <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                  isUser
                    ? 'bg-emerald-800 text-white rounded-tr-sm'
                    : 'bg-white text-stone-900 border border-stone-200 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
                  <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-black/5 text-[10px] text-stone-400">
                    <span>{turn.timestamp}</span>
                    {!isUser && turn.source && (
                      <span className={`font-mono uppercase font-bold text-[9px] ${
                        turn.source === 'gemini-live' ? 'text-emerald-600'
                        : turn.source === 'gemini' ? 'text-blue-600'
                        : 'text-stone-400'
                      }`}>
                        {turn.source === 'gemini-live' ? '🔴 Live'
                          : turn.source === 'gemini' ? '⚡ Gemini'
                          : '🔷 NLP'}
                      </span>
                    )}
                  </div>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-stone-800 text-white flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Interim mic text */}
          {interimText && (
            <div className="flex justify-end gap-2.5">
              <div className="max-w-[80%] rounded-2xl p-3 bg-emerald-100 border border-emerald-300 text-stone-600 italic text-xs">
                {interimText}
              </div>
              <div className="w-7 h-7 rounded-full bg-stone-300 flex items-center justify-center shrink-0">
                <Mic className="w-3.5 h-3.5 text-stone-600 animate-pulse" />
              </div>
            </div>
          )}

          {/* Thinking / processing indicator */}
          {(isThinking || sessionState === 'connecting') && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 text-[10px] font-bold">KF</div>
              <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {sessionState === 'connecting'
                  ? <><Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" /><span className="text-xs text-stone-500">Connecting to Gemini Live…</span></>
                  : <>
                      <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </>
                }
              </div>
            </div>
          )}

          <div ref={transcriptRef} />
        </div>

        {/* ── Quick chips ────────────────────────────────────────────────── */}
        <div className="px-3 py-2 bg-white border-t border-stone-100 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {chips.map((chip, idx) => (
              <button key={idx} onClick={() => handleSendText(chip.query)}
                disabled={isThinking || sessionState === 'connecting'}
                className="shrink-0 px-2.5 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:border-emerald-400 border border-stone-200 rounded-full text-[11px] font-semibold text-stone-700 cursor-pointer transition-all disabled:opacity-50">
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Input bar ──────────────────────────────────────────────────── */}
        <div className="p-3 bg-white border-t border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            {/* Mic button */}
            <button onClick={handleToggleMic}
              disabled={sessionState === 'connecting' || usingFallback}
              title={usingFallback ? 'Live API not available — use text input' : isMicOn ? 'Stop listening' : 'Start speaking'}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                isMicOn
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-200'
                  : isSpeaking
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-emerald-800 hover:bg-emerald-900 text-white'
              }`}>
              {isMicOn ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={typedQuery}
              onChange={e => setTypedQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(typedQuery); } }}
              placeholder={
                usingFallback
                  ? 'Type your question here…'
                  : isMicOn
                    ? 'Listening… (or type here)'
                    : 'Type or press mic to speak…'
              }
              disabled={isThinking || sessionState === 'connecting'}
              className="flex-1 px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-stone-50 disabled:opacity-60"
            />

            {/* Send button */}
            <button
              onClick={() => handleSendText(typedQuery)}
              disabled={!typedQuery.trim() || isThinking || sessionState === 'connecting'}
              className="w-11 h-11 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Mode indicator */}
          <p className="text-[10px] text-stone-400 text-center mt-1.5">
            {usingFallback
              ? '⚠️ Text mode — Live audio unavailable'
              : isMicOn
                ? '🎙️ Speak in any language — Gemini detects automatically'
                : '🔴 Gemini Live · Multilingual · Real-time audio'}
          </p>
        </div>
      </div>
    </div>
  );
};
