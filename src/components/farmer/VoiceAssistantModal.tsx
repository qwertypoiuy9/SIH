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
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // Auto scroll
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, interimText]);

  // Initial welcome greeting
  useEffect(() => {
    if (conversations.length === 0) {
      const welcomeMap: Record<LanguageCode, string> = {
        te: `నమస్తే! కిసాన్ ఫ్లో వాయిస్ అసిస్టెంట్ కు స్వాగతం. మీ టోకెన్, క్యూ లేదా చెల్లింపుల గురించి అడగండి.`,
        hi: `नमस्ते! किसानफ्लो वॉयस असिस्टेंट में आपका स्वागत है। अपने टोकन, कतार या भुगतान के बारे में पूछें।`,
        en: `Hello! Welcome to KisanFlow Voice Assistant. Ask about your token, live queue, or payment status.`,
        kn: `ನಮಸ್ಕಾರ! ಕಿಸಾನ್‌ಫ್ಲೋ ಧ್ವನಿ ಸಹಾಯಕಕ್ಕೆ ಸುಸ್ವಾಗತ. ನಿಮ್ಮ ಟೋಕನ್ ಅಥವಾ ಪಾವತಿಯ ಬಗ್ಗೆ ಕೇಳಿ.`,
        ta: `வணக்கம்! கிசான்ஃப்ளோ குரல் உதவியாளருக்கு வரவேற்கிறோம். டோக்கன் பற்றி கேளுங்கள்.`,
        bn: `নমস্কার! কিষাণফ্লো ভয়েস সহকারীতে স্বাগতম। আপনার টোকেন বা পেমেন্ট সম্পর্কে জানুন।`,
      };

      setConversations([
        {
          id: 'welcome_1',
          sender: 'assistant',
          text: welcomeMap[language] || welcomeMap.te,
          lang: language,
          timestamp: 'Just now',
          source: 'indic_nlp',
        },
      ]);
    }
  }, [language]);

  if (!isVoiceAssistantOpen) return null;

  // Real context lookup
  const farmerReg = registrations.find(
    r => r.farmer_id === authSession.user?.id || r.phone === authSession.user?.phone
  );
  const farmerPayment = payments.find(p => p.farmer_id === authSession.user?.id);
  const queueDepth = registrations.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;

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
        source: aiResponse.source,
      };

      setConversations((prev) => [...prev, aiTurn]);

      // Speak response aloud in chosen language
      soundController.speak(aiResponse.speakText, language + '-IN');
    } catch (err) {
      console.error('AI assistant error:', err);
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
        if (finalText.trim()) {
          processQuery(finalText);
        }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-linear-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-sm">KisanFlow AI Voice Assistant</h3>
              <p className="text-[11px] text-emerald-200">
                Connected to live database • Responds in {SUPPORTED_LANGUAGES.find(l => l.code === language)?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-emerald-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-emerald-700 cursor-pointer focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                soundController.stopListening();
                soundController.stopSpeaking();
                setIsVoiceAssistantOpen(false);
              }}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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
                  className={`max-w-[80%] rounded-2xl p-3 shadow-2xs ${
                    isUser
                      ? 'bg-emerald-800 text-white rounded-tr-xs'
                      : 'bg-white text-stone-900 border border-stone-200 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
                  <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-black/5 text-[10px] text-stone-400">
                    <span>{turn.timestamp}</span>
                    {!isUser && turn.source && (
                      <span className="font-mono uppercase font-bold text-[9px] text-emerald-700">
                        {turn.source === 'gemini' ? 'Gemini 2.5' : 'Indic NLP'}
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

          {interimText && (
            <div className="flex items-center gap-2 text-stone-500 text-xs italic p-2 bg-amber-50 rounded-xl border border-amber-200">
              <Mic className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>{interimText}</span>
            </div>
          )}

          {isProcessingAI && (
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold p-2 bg-emerald-50 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span>Querying database & generating native response...</span>
            </div>
          )}

          <div ref={transcriptBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-stone-100 flex gap-1.5 overflow-x-auto text-[11px]">
          {[
            { label: 'నా టోకెన్ ఎంత? (My Token)', text: 'నా టోకెన్ నంబర్ ఎంత?' },
            { label: 'నా ముందు ఎంత మంది ఉన్నారు? (Queue)', text: 'క్యూలో నా ముందు ఎంత మంది ఉన్నారు?' },
            { label: 'క్వాలిటీ ప్రమాణాలు ఏమిటి? (Quality)', text: 'పంట క్వాలిటీ తేమ ప్రమాణాలు ఏమిటి?' },
            { label: 'పేమెంట్ ఎప్పుడు వస్తుంది? (Payment)', text: 'నా పేమెంట్ స్థితి ఏమిటి?' },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => processQuery(chip.text)}
              className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg text-stone-700 whitespace-nowrap cursor-pointer transition-all border border-stone-200"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar & Mic Trigger */}
        <div className="p-3 bg-white border-t border-stone-200 flex items-center gap-2">
          <button
            onClick={handleToggleListening}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition-all ${
              isListening
                ? 'bg-red-600 text-white ring-4 ring-red-100 animate-bounce'
                : 'bg-emerald-800 hover:bg-emerald-900 text-white'
            }`}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6 text-amber-300" />}
          </button>

          <input
            type="text"
            value={typedQuery}
            onChange={(e) => setTypedQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                processQuery(typedQuery);
              }
            }}
            placeholder={`Ask in ${SUPPORTED_LANGUAGES.find(l => l.code === language)?.name} or click mic to speak...`}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />

          <button
            onClick={() => processQuery(typedQuery)}
            disabled={!typedQuery.trim() || isProcessingAI}
            className="w-10 h-10 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
