import React, { useState, useEffect } from 'react';
import { useKisanQ } from '../../context/KisanFlowContext';
import { soundController } from '../../utils/audio';
import { SUPPORTED_LANGUAGES } from '../../translations';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  Radio,
  User,
  Send,
} from 'lucide-react';
import { LanguageCode } from '../../types';
import { getAIAssistantResponse } from '../../services/aiAssistantService';

type CallStage =
  | 'idle'
  | 'dialing'
  | 'connected_menu'
  | 'in_conversation'
  | 'call_ended';

export const PhoneSimulatorModal: React.FC = () => {
  const {
    language,
    setLanguage,
    isPhoneModalOpen,
    setIsPhoneModalOpen,
    authSession,
    registrations,
    centres,
    crops,
    payments,
    bookFarmerSlot,
  } = useKisanQ();

  const [callStage, setCallStage] = useState<CallStage>('idle');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [typedDigits, setTypedDigits] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [interimSpoken, setInterimSpoken] = useState('');

  // Real database lookups
  const farmerReg = registrations.find(
    r => r.farmer_id === authSession.user?.id || r.phone === authSession.user?.phone
  );
  const farmerPayment = payments.find(p => p.farmer_id === authSession.user?.id);
  const queueDepth = registrations.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callStage === 'connected_menu' || callStage === 'in_conversation') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStage]);

  if (!isPhoneModalOpen) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playVoicePrompt = (text: string, lang = language) => {
    setCurrentPrompt(text);
    soundController.speak(text, lang + '-IN');
  };

  // 1. Start Phone Call to Toll-Free 1800-425-4747
  const handleStartCall = () => {
    setCallStage('dialing');
    setTypedDigits('');
    soundController.playRingTone(2);

    setTimeout(() => {
      setCallStage('connected_menu');
      const greetings: Record<LanguageCode, string> = {
        te: `నమస్తే! కిసాన్ ఫ్లో టోల్ ఫ్రీ 1800-425-4747 కి స్వాగతం. మీ టోకెన్, క్యూ లేదా పంట స్లాట్ బుకింగ్ గురించి నేరుగా మాట్లాడండి లేదా కీప్యాడ్ ఉపయోగించండి.`,
        hi: `नमस्ते! किसानफ्लो टोल फ्री 1800-425-4747 में आपका स्वागत है। अपने टोकन, कतार या स्लॉट बुकिंग के बारे में बोलकर बताएं या कीपैड दबाएं।`,
        en: `Hello! Welcome to KisanQ Toll-Free 1800-425-4747. Speak directly to ask about your token, queue wait time, or book a slot.`,
        kn: `ನಮಸ್ಕಾರ! ಕಿಸಾನ್‌ಫ್ಲೋ ಟೋಲ್ ಫ್ರೀ 1800-425-4747 ಗೆ ಸುಸ್ವಾಗತ. ನಿಮ್ಮ ಟೋಕನ್ ಅಥವಾ ಕ್ಯೂ ಬಗ್ಗೆ ಮಾತನಾಡಿ.`,
        ta: `வணக்கம்! கிசான்ஃப்ளோ கட்டணமில்லா உதவி எண் 1800-425-4747 க்கு வரவேற்கிறோம். பேசத் தொடங்குங்கள்.`,
        bn: `নমস্কার! কিষাণফ্লো টোল ফ্রি 1800-425-4747-এ স্বাগতম। কথা বলুন বা কিপ্যাড চাপুন।`,
      };
      playVoicePrompt(greetings[language] || greetings.te);
    }, 2400);
  };

  // 2. End Call
  const handleEndCall = () => {
    soundController.stopSpeech();
    soundController.stopListening();
    setCallStage('call_ended');
    setIsListening(false);
    setTimeout(() => {
      setCallStage('idle');
      setCurrentPrompt('');
    }, 1200);
  };

  // 3. Process voice query during phone call
  const handlePhoneVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setCallStage('in_conversation');
    setInterimSpoken('');

    // Check if user is asking to book a slot over the phone
    const lower = queryText.toLowerCase();
    if (
      lower.includes('బుక్') || lower.includes('book') || lower.includes('స్లాట్') || lower.includes('स्लॉट') || lower.includes('వరి') || lower.includes('paddy')
    ) {
      try {
        if (authSession.isAuthenticated && authSession.user) {
          const booked = await bookFarmerSlot({
            crop: 'Paddy',
            quantity: 25,
            centreId: 'centre_lakshmipur',
          });

          const bookMsgs: Record<LanguageCode, string> = {
            te: `ధన్యవాదాలు! మీ వరి పంట కోసం లక్ష్మీపూర్ కేంద్రం వద్ద స్లాట్ విజయవంతంగా బుక్ అయింది. మీ కొత్త టోకెన్ నంబర్ #${booked.token_number}. SMS పంపబడింది.`,
            hi: `धन्यवाद! लक्ष्मीपुर केंद्र पर धान के लिए आपका स्लॉट बुक हो गया है। आपका नया टोकन नंबर #${booked.token_number} है।`,
            en: `Thank you! Your Paddy slot at Lakshmipur Centre has been confirmed. Your new token number is #${booked.token_number}.`,
            kn: `ಧನ್ಯವಾದಗಳು! ಲಕ್ಷ್ಮೀಪುರ ಕೇಂದ್ರದಲ್ಲಿ ಭತ್ತದ ಸ್ಲಾಟ್ ಬುಕ್ ಆಗಿದೆ. ನಿಮ್ಮ ಹೊಸ ಟೋಕನ್ ಸಂಖ್ಯೆ #${booked.token_number}.`,
            ta: `நன்றி! உங்கள் டோக்கன் எண் #${booked.token_number}. பதிவு முடிந்தது.`,
            bn: `ধন্যবাদ! আপনার প্যাডি স্লট নিশ্চিত হয়েছে। টোকেন নম্বর #${booked.token_number}।`,
          };

          const text = bookMsgs[language] || bookMsgs.te;
          playVoicePrompt(text);
          return;
        }
      } catch {
        // Fallback to general AI answer
      }
    }

    // Process general inquiry via AI Assistant with live DB context
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

      playVoicePrompt(aiResponse.replyText);
    } catch (err) {
      console.warn('Phone call voice error:', err);
    }
  };

  // Toggle mic for voice talking on phone call
  const togglePhoneMic = () => {
    if (isListening) {
      soundController.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setInterimSpoken('Listening to your voice...');

    soundController.startListening(language, {
      onStart: () => setIsListening(true),
      onInterim: (text) => setInterimSpoken(text),
      onFinal: (finalText) => {
        setIsListening(false);
        setInterimSpoken('');
        if (finalText.trim()) {
          handlePhoneVoiceQuery(finalText);
        }
      },
      onError: () => {
        setIsListening(false);
        setInterimSpoken('');
      },
      onEnd: () => {
        setIsListening(false);
        setInterimSpoken('');
      },
    });
  };

  // DTMF key press
  const handleDTMFPress = (key: string) => {
    soundController.playDTMF(key);
    setTypedDigits((prev) => (prev + key).slice(-8));

    if (callStage === 'connected_menu' || callStage === 'in_conversation') {
      if (key === '1') {
        // Option 1: Book Slot via Phone
        handlePhoneVoiceQuery('వరి పంట స్లాట్ బుక్ చేయండి');
      } else if (key === '2') {
        // Option 2: Token lookup
        handlePhoneVoiceQuery('నా టోకెన్ నంబర్ ఎంత?');
      } else if (key === '3') {
        // Option 3: Queue status
        handlePhoneVoiceQuery('క్యూ స్థితి మరియు వేచి ఉండే సమయం ఎంత?');
      } else if (key === '4') {
        // Option 4: Payment status
        handlePhoneVoiceQuery('నా పేమెంట్ స్థితి ఏమిటి?');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4">
      <div className="bg-stone-900 text-white w-full max-w-sm rounded-3xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col">
        {/* Top Phone Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-stone-300">
              IVR TOLL-FREE: 1800-425-4747
            </span>
          </div>
          <button
            onClick={() => {
              handleEndCall();
              setIsPhoneModalOpen(false);
            }}
            className="text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Screen Area */}
        <div className="p-6 text-center bg-linear-to-b from-stone-950 to-stone-900 border-b border-stone-800 space-y-3">
          <div className="flex justify-center items-center gap-2">
            {/* Language switch on phone */}
            <span className="text-[10px] text-stone-400">Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-stone-800 text-white text-xs px-2 py-0.5 rounded-md border border-stone-700 cursor-pointer focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-lg font-black text-white">Government Mandi Helpline</h3>
            <p className="text-xs text-emerald-400 font-mono">
              {callStage === 'idle'
                ? 'Ready to Call'
                : callStage === 'dialing'
                ? 'Dialing 1800-425-4747...'
                : callStage === 'call_ended'
                ? 'Call Ended'
                : `Connected • ${formatDuration(callDuration)}`}
            </p>
          </div>

          {/* Spoken Prompt / Visual Subtitle */}
          {currentPrompt && (
            <div className="p-3 bg-stone-800/80 rounded-2xl border border-stone-700 text-xs text-emerald-200 text-left leading-relaxed">
              <span className="text-[9px] uppercase font-bold text-stone-400 block mb-1">
                Helpline Voice:
              </span>
              {currentPrompt}
            </div>
          )}

          {interimSpoken && (
            <div className="p-2 bg-amber-950/60 rounded-xl border border-amber-800 text-xs text-amber-200 italic">
              🎙️ {interimSpoken}
            </div>
          )}

          {typedDigits && (
            <div className="font-mono text-xl text-amber-400 tracking-widest font-bold">
              {typedDigits}
            </div>
          )}
        </div>

        {/* DTMF Keypad */}
        <div className="p-5 bg-stone-900 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
              <button
                key={k}
                onClick={() => handleDTMFPress(k)}
                disabled={callStage === 'idle' || callStage === 'dialing'}
                className="py-3 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 disabled:opacity-40 rounded-2xl font-bold font-mono text-lg text-white shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <span>{k}</span>
                {k === '1' && <span className="text-[8px] text-emerald-400">Book</span>}
                {k === '2' && <span className="text-[8px] text-amber-400">Token</span>}
                {k === '3' && <span className="text-[8px] text-blue-400">Queue</span>}
                {k === '4' && <span className="text-[8px] text-purple-400">Payment</span>}
              </button>
            ))}
          </div>

          {/* Action Row: Talk with Mic & Dial / End Buttons */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {callStage === 'connected_menu' || callStage === 'in_conversation' ? (
              <>
                {/* Voice Talking Mic Button */}
                <button
                  onClick={togglePhoneMic}
                  className={`p-4 rounded-full shadow-lg transition-all cursor-pointer ${
                    isListening
                      ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-200 animate-pulse'
                      : 'bg-stone-700 hover:bg-stone-600 text-white'
                  }`}
                  title="Speak on call in your language"
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6 text-emerald-400" />}
                </button>

                {/* Hang Up Button */}
                <button
                  onClick={handleEndCall}
                  className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg cursor-pointer transition-all transform hover:scale-105"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </>
            ) : (
              /* Dial Call Button */
              <button
                onClick={handleStartCall}
                disabled={callStage === 'dialing'}
                className="py-3 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full text-sm shadow-lg cursor-pointer transition-all flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                <span>Call Helpline 1800-425-4747</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
