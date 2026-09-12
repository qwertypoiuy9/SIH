import React, { useState, useEffect, useRef } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import { soundController } from '../../utils/audio';
import { SUPPORTED_LANGUAGES, translations } from '../../translations';
import {
  Mic,
  MicOff,
  Volume2,
  Globe,
  X,
  Send,
  Bot,
  User,
  Zap,
  Bell,
} from 'lucide-react';
import { LanguageCode } from '../../types';
import { getAIAssistantResponse } from '../../services/aiAssistantService';

interface ConversationTurn {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  lang: string;
  timestamp: string;
  source?: 'gemini' | 'indic_nlp';
}

// Quick suggestion chips organized by category
const QUICK_CHIPS: Record<LanguageCode, { label: string; query: string }[]> = {
  te: [
    { label: '🎫 నా టోకెన్', query: 'నా టోకెన్ నంబర్ ఏమిటి?' },
    { label: '🚜 క్యూ స్థితి', query: 'ఎంత మంది నా ముందు ఉన్నారు?' },
    { label: '💰 చెల్లింపు', query: 'నా పేమెంట్ స్థితి ఏమిటి?' },
    { label: '🌾 MSP రేట్లు', query: 'ఈ సంవత్సరం MSP రేట్లు ఏమిటి?' },
    { label: '📄 J-ఫారం', query: 'J-ఫారం అంటే ఏమిటి?' },
    { label: '🏛️ PM-కిసాన్', query: 'PM కిసాన్ పథకం అర్హత ఏమిటి?' },
    { label: '💧 నాణ్యత', query: 'తేమ శాతం ప్రమాణాలు ఏమిటి?' },
    { label: '📝 స్లాట్ బుకింగ్', query: 'స్లాట్ ఎలా బుక్ చేయాలి?' },
  ],
  hi: [
    { label: '🎫 मेरा टोकन', query: 'मेरा टोकन नंबर क्या है?' },
    { label: '🚜 कतार स्थिति', query: 'मेरे आगे कितने किसान हैं?' },
    { label: '💰 भुगतान', query: 'मेरी भुगतान स्थिति क्या है?' },
    { label: '🌾 MSP दरें', query: 'इस साल MSP दरें क्या हैं?' },
    { label: '📄 जे-फॉर्म', query: 'जे-फॉर्म क्या होता है?' },
    { label: '🏛️ PM-किसान', query: 'PM किसान योजना की पात्रता क्या है?' },
    { label: '💧 गुणवत्ता', query: 'नमी प्रतिशत मानक क्या हैं?' },
    { label: '📝 स्लॉट बुकिंग', query: 'स्लॉट कैसे बुक करें?' },
  ],
  en: [
    { label: '🎫 My Token', query: 'What is my token number?' },
    { label: '🚜 Queue Status', query: 'How many farmers are ahead of me?' },
    { label: '💰 Payment', query: 'What is my payment status?' },
    { label: '🌾 MSP Rates', query: 'What are the MSP rates this year?' },
    { label: '📄 J-Form', query: 'What is a J-Form?' },
    { label: '🏛️ PM-KISAN', query: 'What is PM KISAN scheme eligibility?' },
    { label: '💧 Quality', query: 'What are the moisture percentage standards?' },
    { label: '📝 Book Slot', query: 'How do I book a slot?' },
  ],
  kn: [
    { label: '🎫 ನನ್ನ ಟೋಕನ್', query: 'ನನ್ನ ಟೋಕನ್ ಸಂಖ್ಯೆ ಏನು?' },
    { label: '🚜 ಕ್ಯೂ ಸ್ಥಿತಿ', query: 'ನನ್ನ ಮುಂದೆ ಎಷ್ಟು ರೈತರಿದ್ದಾರೆ?' },
    { label: '💰 ಪಾವತಿ', query: 'ನನ್ನ ಪಾವತಿ ಸ್ಥಿತಿ ಏನು?' },
    { label: '🌾 MSP ದರ', query: 'MSP ದರಗಳು ಏನು?' },
    { label: '📄 ಜೆ-ಫಾರ್ಮ್', query: 'ಜೆ-ಫಾರ್ಮ್ ಎಂದರೇನು?' },
    { label: '🏛️ PM-ಕಿಸಾನ್', query: 'PM ಕಿಸಾನ್ ಯೋಜನೆ ಅರ್ಹತೆ ಏನು?' },
    { label: '💧 ಗುಣಮಟ್ಟ', query: 'ತೇವಾಂಶ ಮಾನದಂಡಗಳು ಏನು?' },
    { label: '📝 ಸ್ಲಾಟ್ ಬುಕ್', query: 'ಸ್ಲಾಟ್ ಹೇಗೆ ಬುಕ್ ಮಾಡಬೇಕು?' },
  ],
  ta: [
    { label: '🎫 என் டோக்கன்', query: 'என் டோக்கன் எண் என்ன?' },
    { label: '🚜 வரிசை நிலை', query: 'என் முன்னால் எத்தனை விவசாயிகள் உள்ளனர்?' },
    { label: '💰 கட்டணம்', query: 'என் கட்டண நிலை என்ன?' },
    { label: '🌾 MSP விலை', query: 'இந்த ஆண்டு MSP விலை என்ன?' },
    { label: '📄 J-ஃபார்ம்', query: 'J-ஃபார்ம் என்றால் என்ன?' },
    { label: '🏛️ PM-KISAN', query: 'PM KISAN தகுதி என்ன?' },
    { label: '💧 தரம்', query: 'ஈரப்பதம் தரநிலைகள் என்ன?' },
    { label: '📝 ஸ்லாட்', query: 'ஸ்லாட் எப்படி பதிவு செய்வது?' },
  ],
  bn: [
    { label: '🎫 আমার টোকেন', query: 'আমার টোকেন নম্বর কী?' },
    { label: '🚜 সারি অবস্থা', query: 'আমার সামনে কতজন কৃষক আছেন?' },
    { label: '💰 পেমেন্ট', query: 'আমার পেমেন্ট স্থিতি কী?' },
    { label: '🌾 MSP হার', query: 'এই বছরের MSP হার কী?' },
    { label: '📄 J-ফর্ম', query: 'J-ফর্ম কী?' },
    { label: '🏛️ PM-KISAN', query: 'PM KISAN প্রকল্পের যোগ্যতা কী?' },
    { label: '💧 গুণমান', query: 'আর্দ্রতার মান কী?' },
    { label: '📝 স্লট বুকিং', query: 'স্লট কীভাবে বুক করবেন?' },
  ],
};

export const VoiceAssistantModal: React.FC = () => {
  const {
    language,
    setLanguage,
    isVoiceAssistantOpen,
    setIsVoiceAssistantOpen,
    authSession,
    registrations,
    centres,
    crops,
    payments,
  } = useKisanFlow();

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [typedQuery, setTypedQuery] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [conversations, setConversations] = useState<ConversationTurn[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [proactiveAlertShown, setProactiveAlertShown] = useState(false);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // Auto scroll
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, interimText]);

  // Real context lookup
  const farmerReg = registrations.find(
    r => r.farmer_id === authSession.user?.id || r.phone === authSession.user?.phone
  );
  const farmerPayment = payments.find(p => p.farmer_id === authSession.user?.id);
  const queueDepth = registrations.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;

  // Farmers ahead of this farmer
  const farmersAhead = farmerReg
    ? registrations.filter(
        r => r.centre_id === farmerReg.centre_id &&
          r.token_number < farmerReg.token_number &&
          r.procurement_status !== 'PROCUREMENT_COMPLETED' &&
          r.procurement_status !== 'QUALITY_REJECTED'
      ).length
    : 0;

  // Initial welcome greeting
  useEffect(() => {
    if (isVoiceAssistantOpen && conversations.length === 0) {
      const welcomeMap: Record<LanguageCode, string> = {
        te: `నమస్తే! కిసాన్ ఫ్లో AI వాయిస్ అసిస్టెంట్ కు స్వాగతం. మీ టోకెన్, క్యూ, MSP రేట్లు, J-ఫారం, PM-కిసాన్ లేదా చెల్లింపుల గురించి అడగండి.`,
        hi: `नमस्ते! किसानफ्लो AI असिस्टेंट में आपका स्वागत है। टोकन, MSP दर, जे-फॉर्म, PM-किसान या भुगतान के बारे में पूछें।`,
        en: `Hello! Welcome to KisanFlow AI Assistant. Ask about your token, queue status, MSP rates, J-Form, PM-KISAN eligibility, or DBT payment status.`,
        kn: `ನಮಸ್ಕಾರ! ಕಿಸಾನ್‌ಫ್ಲೋ AI ಸಹಾಯಕಕ್ಕೆ ಸ್ವಾಗತ. ಟೋಕನ್, MSP ದರ, ಪಾವತಿ ಅಥವಾ PM-ಕಿಸಾನ್ ಬಗ್ಗೆ ಕೇಳಿ.`,
        ta: `வணக்கம்! கிசான்ஃப்ளோ AI உதவியாளருக்கு வரவேற்கிறோம். டோக்கன், MSP விலை, J-ஃபார்ம் பற்றி கேளுங்கள்.`,
        bn: `নমস্কার! কিষাণফ্লো AI সহকারীতে স্বাগতম। টোকেন, MSP হার, J-ফর্ম বা পেমেন্ট সম্পর্কে জানুন।`,
      };

      const welcomeText = welcomeMap[language] || welcomeMap.en;
      setConversations([
        {
          id: 'welcome_1',
          sender: 'assistant',
          text: welcomeText,
          lang: language,
          timestamp: 'Just now',
          source: 'indic_nlp',
        },
      ]);

      // Proactive token alert: if farmer is within 3 tokens of being served
      if (farmerReg && farmersAhead <= 3 && farmersAhead >= 0 && !proactiveAlertShown) {
        setTimeout(() => {
          const alertMap: Record<LanguageCode, string> = {
            te: `🔔 గమనిక: మీ ముందు కేవలం ${farmersAhead} మంది రైతులు ఉన్నారు! దయచేసి గేట్ 1 వద్ద సిద్ధంగా ఉండండి. మీ టోకెన్ #${farmerReg.token_number} త్వరలో పిలువబడుతుంది.`,
            hi: `🔔 सूचना: आपके आगे केवल ${farmersAhead} किसान बचे हैं! कृपया गेट 1 पर तैयार रहें। टोकन #${farmerReg.token_number} जल्द बुलाया जाएगा।`,
            en: `🔔 Alert: Only ${farmersAhead} farmer(s) ahead of you! Please move to Gate 1. Your Token #${farmerReg.token_number} will be called soon.`,
            kn: `🔔 ಎಚ್ಚರಿಕೆ: ನಿಮ್ಮ ಮುಂದೆ ಕೇವಲ ${farmersAhead} ರೈತರಿದ್ದಾರೆ! ಗೇಟ್ 1 ಬಳಿ ತಯಾರಾಗಿರಿ. ಟೋಕನ್ #${farmerReg.token_number} ಶೀಘ್ರದಲ್ಲಿ ಕರೆಯಲಾಗುವುದು.`,
            ta: `🔔 எச்சரிக்கை: உங்கள் முன்னால் ${farmersAhead} விவசாயிகள் மட்டுமே உள்ளனர்! கேட் 1 அருகில் தயாராக இருங்கள். டோக்கன் #${farmerReg.token_number} விரைவில் அழைக்கப்படும்.`,
            bn: `🔔 সতর্কতা: আপনার সামনে মাত্র ${farmersAhead} জন কৃষক! গেট ১-এ প্রস্তুত থাকুন। টোকেন #${farmerReg.token_number} শীঘ্রই ডাকা হবে।`,
          };
          const alertText = alertMap[language] || alertMap.en;
          setConversations(prev => [...prev, {
            id: 'proactive_alert',
            sender: 'assistant',
            text: alertText,
            lang: language,
            timestamp: 'Just now',
            source: 'indic_nlp',
          }]);
          soundController.playTurnChime();
          soundController.speak(alertText, language + '-IN');
          setProactiveAlertShown(true);
        }, 1500);
      }
    }
  }, [isVoiceAssistantOpen, language]);

  if (!isVoiceAssistantOpen) return null;

  const processQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessingAI) return;

    soundController.playTurnChime();
    setIsProcessingAI(true);
    setInterimText('');

    const userTurn: ConversationTurn = {
      id: 'q_' + Date.now(),
      sender: 'user',
      text: queryText.trim(),
      lang: language,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversations((prev) => [...prev, userTurn]);

    try {
      const aiResponse = await getAIAssistantResponse(queryText, {
        farmer: authSession.user || undefined,
        activeRegistration: farmerReg,
        centres,
        crops,
        payment: farmerPayment,
        queueDepth,
        language,
      });

      const aiTurn: ConversationTurn = {
        id: 'r_' + Date.now(),
        sender: 'assistant',
        text: aiResponse.replyText,
        lang: language,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: aiResponse.source as 'gemini' | 'indic_nlp',
      };

      setConversations((prev) => [...prev, aiTurn]);

      // Speak the response
      setIsSpeaking(true);
      soundController.speak(aiResponse.speakText, language + '-IN', () => setIsSpeaking(false));
    } catch (err) {
      console.error('AI assistant error:', err);
      setConversations(prev => [...prev, {
        id: 'err_' + Date.now(),
        sender: 'assistant',
        text: 'Sorry, I encountered an error. Please try again or call 1800-425-4747.',
        lang: 'en',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'indic_nlp',
      }]);
    } finally {
      setIsProcessingAI(false);
      setTypedQuery('');
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      soundController.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setInterimText('Listening...');

    soundController.startListening(language, {
      onStart: () => setIsListening(true),
      onInterim: (text) => setInterimText(text),
      onFinal: (finalText) => {
        setIsListening(false);
        setInterimText('');
        if (finalText.trim()) processQuery(finalText);
      },
      onError: (err) => {
        console.warn('Speech recognition notice:', err);
        setIsListening(false);
        setInterimText('');
      },
      onEnd: () => {
        setIsListening(false);
        setInterimText('');
      },
    });
  };

  const handleStopSpeaking = () => {
    soundController.stopSpeaking();
    setIsSpeaking(false);
  };

  const handleClose = () => {
    soundController.stopListening();
    soundController.stopSpeaking();
    setIsSpeaking(false);
    setIsListening(false);
    setIsVoiceAssistantOpen(false);
  };

  const chips = QUICK_CHIPS[language] || QUICK_CHIPS.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center relative">
              <Bot className="w-6 h-6 text-amber-300" />
              {(isProcessingAI || isSpeaking) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h3 className="font-black text-sm">KisanFlow AI Assistant</h3>
              <p className="text-[11px] text-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isProcessingAI ? 'Thinking...' : isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : `Live database · ${SUPPORTED_LANGUAGES.find(l => l.code === language)?.name}`}
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

            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-emerald-900 rounded-xl px-2 py-1 border border-emerald-700">
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-white text-xs cursor-pointer focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-emerald-900">
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Stop speaking */}
            {isSpeaking && (
              <button
                onClick={handleStopSpeaking}
                className="p-1.5 rounded-xl hover:bg-white/10 text-amber-300 cursor-pointer"
                title="Stop speaking"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active token status bar */}
        {farmerReg && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-900">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-bold">Token #{farmerReg.token_number}</span>
              <span className="text-amber-700">·</span>
              <span>{farmerReg.crop} ({farmerReg.quantity_quintals} Qtl)</span>
            </div>
            <span className="font-bold text-amber-800">
              {farmersAhead} ahead · ~{farmersAhead * 35 + 15} min
            </span>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-stone-50">
          {conversations.map((turn) => {
            const isUser = turn.sender === 'user';
            return (
              <div
                key={turn.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 text-[10px] font-bold">
                    KF
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                    isUser
                      ? 'bg-emerald-800 text-white rounded-tr-sm'
                      : 'bg-white text-stone-900 border border-stone-200 rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
                  <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-black/5 text-[10px] text-stone-400">
                    <span>{turn.timestamp}</span>
                    {!isUser && turn.source && (
                      <span className={`font-mono uppercase font-bold text-[9px] ${turn.source === 'gemini' ? 'text-blue-600' : 'text-emerald-700'}`}>
                        {turn.source === 'gemini' ? '⚡ Gemini 2.5' : '🔷 Indic NLP'}
                      </span>
                    )}
                  </div>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-stone-800 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Interim STT text */}
          {interimText && interimText !== 'Listening...' && (
            <div className="flex justify-end gap-2.5">
              <div className="max-w-[80%] rounded-2xl p-3 bg-emerald-100 border border-emerald-300 text-stone-600 italic">
                {interimText}
              </div>
              <div className="w-7 h-7 rounded-full bg-stone-300 flex items-center justify-center shrink-0">
                <Mic className="w-3.5 h-3.5 text-stone-600" />
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessingAI && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 text-[10px] font-bold">KF</div>
              <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={transcriptBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white border-t border-stone-100 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => processQuery(chip.query)}
                disabled={isProcessingAI}
                className="shrink-0 px-2.5 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:border-emerald-400 border border-stone-200 rounded-full text-[11px] font-semibold text-stone-700 cursor-pointer transition-all disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            {/* Mic Button */}
            <button
              onClick={handleToggleListening}
              disabled={isProcessingAI}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-200'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={typedQuery}
              onChange={(e) => setTypedQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  processQuery(typedQuery);
                }
              }}
              placeholder={
                language === 'te' ? 'మీ ప్రశ్న టైప్ చేయండి...' :
                language === 'hi' ? 'अपना प्रश्न टाइप करें...' :
                language === 'kn' ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...' :
                language === 'ta' ? 'உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள்...' :
                language === 'bn' ? 'আপনার প্রশ্ন টাইপ করুন...' :
                'Type your question or tap mic to speak...'
              }
              disabled={isProcessingAI || isListening}
              className="flex-1 px-3 py-2.5 rounded-2xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 bg-stone-50"
            />

            {/* Send Button */}
            <button
              onClick={() => processQuery(typedQuery)}
              disabled={!typedQuery.trim() || isProcessingAI}
              className="w-11 h-11 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {isListening && (
            <p className="text-center text-[10px] text-red-600 font-bold mt-1.5 animate-pulse">
              🎙️ {language === 'te' ? 'వినబడుతుంది...' : language === 'hi' ? 'सुन रहा है...' : 'Listening — speak now...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
