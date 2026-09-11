import { GoogleGenAI } from '@google/genai';
import {
  Centre,
  Crop,
  LanguageCode,
  PaymentRecord,
  Registration,
  UserProfile,
} from '../types';

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

const LANG_METADATA: Record<LanguageCode, { name: string; nativeName: string; greeting: string }> = {
  te: { name: 'Telugu', nativeName: 'తెలుగు', greeting: 'నమస్తే' },
  hi: { name: 'Hindi', nativeName: 'हिंदी', greeting: 'नमस्ते' },
  en: { name: 'English', nativeName: 'English', greeting: 'Hello' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', greeting: 'ನಮಸ್ಕಾರ' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', greeting: 'வணக்கம்' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', greeting: 'নমস্কার' },
};

/**
 * Translate text to target language via public translation API if needed
 */
export async function translateTextToTarget(text: string, targetLang: LanguageCode): Promise<string> {
  if (targetLang === 'en') return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch {
    // Return original if network fails
  }
  return text;
}

export async function getAIAssistantResponse(
  query: string,
  context: AssistantContext
): Promise<AssistantResponse> {
  const cleanQuery = query.trim();

  // 1. Try Gemini GenAI API if an API key is available
  const apiKey =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') ||
    localStorage.getItem('kisanflow_gemini_api_key') ||
    '';

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildGeminiPrompt(cleanQuery, context);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        const text = response.text.trim();
        const speakable = text.replace(/[*#_`>]/g, '').trim();
        return {
          replyText: text,
          speakText: speakable,
          source: 'gemini',
        };
      }
    } catch (err) {
      console.warn('Gemini API notice:', err);
    }
  }

  // 2. Multilingual Indic Engine with database context
  return generateIndicNLPResponse(cleanQuery, context);
}

function buildGeminiPrompt(query: string, ctx: AssistantContext): string {
  const langMeta = LANG_METADATA[ctx.language] || LANG_METADATA.te;
  const token = ctx.activeRegistration ? `#${ctx.activeRegistration.token_number}` : 'None';
  const stage = ctx.activeRegistration ? ctx.activeRegistration.current_stage : 'No active registration';
  const centre = ctx.activeRegistration?.centre_name || ctx.centres[0]?.name || 'Lakshmipur Procurement Centre';

  return `You are KisanFlow AI, an empathetic agricultural assistant for Indian farmers.
CRITICAL INSTRUCTION: Respond ENTIRELY in ${langMeta.name} (${langMeta.nativeName}). Do not answer in English unless requested.
Keep responses under 3 sentences. Answer accurately using the real database records below.

Database Records:
- Farmer Name: ${ctx.farmer?.name || 'Farmer'}
- Active Token: ${token}
- Allocated PPC: ${centre}
- Current Stage: ${stage}
- Farmers in Queue: ${ctx.queueDepth}
- Crop: ${ctx.activeRegistration?.crop || 'Paddy'} (${ctx.activeRegistration?.quantity_quintals || 0} Quintals)
- Payment Status: ${ctx.payment?.status || 'No payment recorded yet'}

Farmer Query in ${langMeta.name}: "${query}"
Answer politely in ${langMeta.nativeName}:`;
}

function generateIndicNLPResponse(query: string, ctx: AssistantContext): AssistantResponse {
  const q = query.toLowerCase();
  const lang = ctx.language;
  const token = ctx.activeRegistration?.token_number;
  const stage = ctx.activeRegistration?.current_stage || 'GATE_ENTRY';
  const ahead = ctx.queueDepth;
  const mandi = ctx.activeRegistration?.centre_name || ctx.centres[0]?.name || 'Lakshmipur Mandi';

  // 1. Slot booking request over voice
  if (
    q.includes('బుక్') || q.includes('స్లాట్') || q.includes('వరి') ||
    q.includes('book') || q.includes('slot') || q.includes('paddy') ||
    q.includes('स्लॉट') || q.includes('धान') || q.includes('ಬುಕ್') || q.includes('பதிவு')
  ) {
    const responses: Record<LanguageCode, string> = {
      te: `మీరు వరి లేదా ఇతర పంట కోసం స్లాట్ బుక్ చేయవచ్చు. స్లాట్ బుకింగ్ విభాగంలో లేదా టోల్-ఫ్రీ 1800-425-4747 కాల్ ద్వారా తక్షణమే #1 నుండి ప్రారంభమయ్యే టోకెన్ పొందవచ్చు.`,
      hi: `आप धान या अन्य फसल के लिए स्लॉट बुक कर सकते हैं। स्लॉट बुकिंग सेक्शन में जाकर या 1800-425-4747 पर कॉल करके टोकन प्राप्त करें।`,
      en: `You can book a slot for Paddy or other crops. Visit the Slot Booking tab or call Toll-Free 1800-425-4747 to generate your sequential token starting from #1.`,
      kn: `ನೀವು ಭತ್ತ ಅಥವಾ ಇತರ ಬೆಳೆಗಳಿಗೆ ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಬಹುದು. ಸ್ಲಾಟ್ ಬುಕಿಂಗ್ ಪುಟಕ್ಕೆ ಹೋಗಿ ಅಥವಾ 1800-425-4747 ಗೆ ಕರೆ ಮಾಡಿ.`,
      ta: `நீங்கள் நெல் அல்லது பிற பயிர்களுக்கு ஸ்லாட் பதிவு செய்யலாம். கட்டணமில்லா 1800-425-4747 எண்ணை அழைக்கலாம்.`,
      bn: `আপনি ধান বা অন্যান্য ফসলের জন্য স্লট বুক করতে পারেন। টোল-ফ্রি 1800-425-4747 নম্বরে কল করুন।`,
    };
    const text = responses[lang] || responses.te;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'book_slot' };
  }

  // 2. Token query
  if (
    q.includes('టోకెన్') || q.includes('token') || q.includes('टोकन') || q.includes('ಟೋಕನ್') || q.includes('டோக்கன்') || q.includes('টোকেন')
  ) {
    if (token) {
      const responses: Record<LanguageCode, string> = {
        te: `మీ టోకెన్ నంబర్ #${token}. ఇది ${mandi} వద్ద కేటాయించబడింది. ప్రస్తుత దశ: ${stage.replace('_', ' ')}.`,
        hi: `आपका टोकन नंबर #${token} है। वर्तमान चरण: ${stage.replace('_', ' ')}।`,
        en: `Your active token number is #${token} at ${mandi}. Current stage: ${stage.replace('_', ' ')}.`,
        kn: `ನಿಮ್ಮ ಟೋಕನ್ ಸಂಖ್ಯೆ #${token}. ಪ್ರಸ್ತುತ ಹಂತ: ${stage.replace('_', ' ')}.`,
        ta: `உங்கள் டோக்கன் எண் #${token}. தற்போதைய நிலை: ${stage.replace('_', ' ')}.`,
        bn: `আপনার টোকেন নম্বর #${token}। বর্তমান ধাপ: ${stage.replace('_', ' ')}।`,
      };
      const text = responses[lang] || responses.te;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'token_lookup' };
    } else {
      const responses: Record<LanguageCode, string> = {
        te: `ప్రస్తుతం మీకు క్రియాశీల టోకెన్ లేదు. దయచేసి స్లాట్ బుకింగ్ విభాగంలో పంట వివరాలను నమోదు చేసి టోకెన్ పొందండి.`,
        hi: `वर्तमान में आपके पास कोई सक्रिय टोकन नहीं है। कृपया स्लॉट बुक करें।`,
        en: `You currently have no active token. Please book a slot first to receive your token starting from #1.`,
        kn: `ಪ್ರಸ್ತುತ ನಿಮ್ಮಲ್ಲಿ ಸಕ್ರಿಯ ಟೋಕನ್ ಇಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಿ.`,
        ta: `தற்போது உங்களிடம் செயலில் உள்ள டோக்கன் இல்லை. தயவுசெய்து ஸ்லாట్ பதிவு செய்யவும்.`,
        bn: `বর্তমানে আপনার কোনো সক্রিয় টোকেন নেই। অনুগ্রহ করে প্রথমে একটি স্লট বুক করুন।`,
      };
      const text = responses[lang] || responses.te;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'no_token' };
    }
  }

  // 3. Queue / Wait time
  if (
    q.includes('క్యూ') || q.includes('ఎంత మంది') || q.includes('ముందు') || q.includes('సమయం') ||
    q.includes('queue') || q.includes('कतार') || q.includes('वेट') || q.includes('wait') ||
    q.includes('आगे') || q.includes('ahead') || q.includes('ಕಾಯುವ') || q.includes('வரிசை')
  ) {
    const responses: Record<LanguageCode, string> = {
      te: `ప్రస్తుతం క్యూలో మీ ముందు ${ahead} మంది రైతులు ఉన్నారు. అంచనా వేచి ఉండే సమయం సుమారు ${ahead * 35 + 15} నిమిషాలు.`,
      hi: `वर्तमान में कतार में आपके आगे ${ahead} किसान हैं। अनुमानित प्रतीक्षा समय लगभग ${ahead * 35 + 15} मिनट है।`,
      en: `There are currently ${ahead} farmers ahead of you in the queue. Estimated wait is ~${ahead * 35 + 15} minutes.`,
      kn: `ಪ್ರಸ್ತುತ ನಿಮ್ಮ ಮುಂದೆ ${ahead} ರೈತರಿದ್ದಾರೆ. ಅಂದಾಜು ಕಾಯುವ ಸಮಯ ಸುಮಾರು ${ahead * 35 + 15} ನಿಮಿಷಗಳು.`,
      ta: `வரிசையில் உங்கள் முன்னால் ${ahead} விவசாயிகள் உள்ளனர். மதிப்பிடப்பட்ட காத்திருப்பு நேரம் ~${ahead * 35 + 15} நிமிடங்கள்.`,
      bn: `বর্তমানে আপনার সামনে ${ahead} জন কৃষক সারিবদ্ধ আছেন। আনুমানিক অপেক্ষার সময় ~${ahead * 35 + 15} মিনিট।`,
    };
    const text = responses[lang] || responses.te;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'queue_status' };
  }

  // 4. Quality & Moisture Check
  if (
    q.includes('క్వాలిటీ') || q.includes('తేమ') || q.includes('quality') || q.includes('moisture') ||
    q.includes('नमी') || q.includes('गुणवत्ता') || q.includes('ತೇವಾಂಶ') || q.includes('ஈரப்பதம்')
  ) {
    const responses: Record<LanguageCode, string> = {
      te: `ప్రభుత్వ FAQ ప్రమాణాల ప్రకారం గరిష్ట తేమ శాతం 17% అనుమతించబడుతుంది. మీ ధాన్యం నాణ్యత తనిఖీ పూర్తయ్యాక ఆపరేటర్ స్థితిని నమోదు చేస్తారు.`,
      hi: `सरकारी FAQ मानकों के अनुसार अधिकतम नमी 17% तक मान्य है। ग्रेड ए के लिए सही सूखा होना चाहिए।`,
      en: `As per government FAQ standards, moisture up to 17% is acceptable for procurement.`,
      kn: `ಸರ್ಕಾರಿ ನಿಯಮಾವಳಿಗಳ ಪ್ರಕಾರ ತೇವಾಂಶ 17% ಕ್ಕಿಂತ ಕಡಿಮೆ ಇರಬೇಕು.`,
      ta: `அரசு விதிகளின்படி ஈரப்பதம் 17% வரை அனுமதிக்கப்படுகிறது.`,
      bn: `সরকারি নিয়ম অনুযায়ী সর্বোচ্চ আর্দ্রতা ১৭% গ্রহণযোগ্য।`,
    };
    const text = responses[lang] || responses.te;
    return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'quality_faq' };
  }

  // 5. Payment status
  if (
    q.includes('పేమెంట్') || q.includes('డబ్బులు') || q.includes('payment') || q.includes('भुगतान') ||
    q.includes('पैसे') || q.includes('ಹಣ') || q.includes('பணம்') || q.includes('টাকা')
  ) {
    if (ctx.payment) {
      const responses: Record<LanguageCode, string> = {
        te: `మీ చెల్లింపు స్థితి: ${ctx.payment.status}. మొత్తం: ₹${ctx.payment.amount}. లావాదేవీ ID: ${ctx.payment.transaction_id}.`,
        hi: `आपकी भुगतान स्थिति: ${ctx.payment.status}। कुल राशि: ₹${ctx.payment.amount}।`,
        en: `Your payment status is ${ctx.payment.status} for ₹${ctx.payment.amount}. TxID: ${ctx.payment.transaction_id}.`,
        kn: `ನಿಮ್ಮ ಪಾವತಿ ಸ್ಥಿತಿ: ${ctx.payment.status}. ಮೊತ್ತ: ₹${ctx.payment.amount}.`,
        ta: `உங்கள் கட்டண நிலை: ${ctx.payment.status}. தொகை: ₹${ctx.payment.amount}.`,
        bn: `আপনার পেমেন্ট স্থিতি: ${ctx.payment.status}। পরিমাণ: ₹${ctx.payment.amount}।`,
      };
      const text = responses[lang] || responses.te;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'payment_status' };
    } else {
      const responses: Record<LanguageCode, string> = {
        te: `ఇంకా చెల్లింపు సమాచారం నమోదు కాలేదు. తూకం మరియు J-ఫారం జారీ పూర్తయిన వెంటనే మీ ఆధార్-లింక్డ్ బ్యాంక్ ఖాతాకు DBT ప్రారంభమవుతుంది.`,
        hi: `अभी कोई भुगतान जानकारी उपलब्ध नहीं है। तौल और जे-फॉर्म के बाद बैंक खाते में डीबीटी शुरू होगा।`,
        en: `No payment information is available yet. DBT will initiate upon weighment completion and J-Form issuance.`,
        kn: `ಇನ್ನೂ ಯಾವುದೇ ಪಾವತಿ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ. ತೂಕದ ನಂತರ ಡಿಬಿಟಿ ಆರಂಭವಾಗುತ್ತದೆ.`,
        ta: `இன்னும் கட்டண விவரங்கள் கிடைக்கவில்லை.`,
        bn: `এখনও কোনো পেমেন্ট তথ্য পাওয়া যায়নি।`,
      };
      const text = responses[lang] || responses.te;
      return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'no_payment' };
    }
  }

  // Default Greeting / General
  const greeting = LANG_METADATA[lang]?.greeting || 'నమస్తే';
  const fallbackReplies: Record<LanguageCode, string> = {
    te: `${greeting}! కిసాన్ ఫ్లో సహాయ కేంద్రం. మీ టోకెన్, క్యూ, స్లాట్ బుకింగ్ లేదా చెల్లింపుల గురించి ఏదైనా అడగండి.`,
    hi: `${greeting}! किसानफ्लो सहायता केंद्र में आपका स्वागत है। अपने टोकन, कतार, स्लॉट या भुगतान के बारे में पूछें।`,
    en: `Hello! Welcome to KisanFlow. Ask about your token number, live queue wait time, booking a slot, or DBT payment status.`,
    kn: `ನಮಸ್ಕಾರ! ಕಿಸಾನ್‌ಫ್ಲೋ ಸಹಾಯವಾಣಿಗೆ ಸುಸ್ವಾಗತ. ನಿಮ್ಮ ಟೋಕನ್ ಅಥವಾ ಕಾಯುವ ಸಮಯದ ಬಗ್ಗೆ ಕೇಳಿ.`,
    ta: `வணக்கம்! கிசான்ஃப்ளோ உதவி மையத்திற்கு வரவேற்கிறோம். டோக்கன் அல்லது பதிவு பற்றி கேளுங்கள்.`,
    bn: `নমস্কার! কিষাণফ্লো সহায়তায় স্বাগতম। আপনার টোকেন বা কাতার সম্পর্কে জিজ্ঞাসা করুন।`,
  };

  const text = fallbackReplies[lang] || fallbackReplies.te;
  return { replyText: text, speakText: text, source: 'indic_nlp', detectedIntent: 'greeting' };
}
