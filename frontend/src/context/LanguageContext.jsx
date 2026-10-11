import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const LanguageContext = createContext(null);

export const languageList = [
  { code: 'en', label: 'English', native: 'English', itc: '' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', itc: 'ta-t-i0-und' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', itc: 'hi-t-i0-und' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', itc: 'te-t-i0-und' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', itc: 'kn-t-i0-und' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', itc: 'ml-t-i0-und' }
];

export function LanguageProvider({ children }) {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('simple_billing_lang') || 'ta';
  });

  const [phoneticEnabled, setPhoneticEnabled] = useState(() => {
    const saved = localStorage.getItem('simple_billing_phonetic');
    return saved !== null ? saved === 'true' : true;
  });

  // In-memory cache for transliterated words
  const transliterationCache = useRef({});

  useEffect(() => {
    localStorage.setItem('simple_billing_lang', currentLang);
    axios.defaults.headers.common['x-language'] = currentLang;
  }, [currentLang]);

  useEffect(() => {
    // Attempt to sync language from store settings if available
    axios.get('/api/settings').then(res => {
      if (res.data?.defaultLanguage) {
        const stored = localStorage.getItem('simple_billing_lang');
        if (!stored) {
          setCurrentLang(res.data.defaultLanguage);
        }
      }
    }).catch(() => {});
  }, []);

  const selectLanguage = async (code) => {
    setCurrentLang(code);
    localStorage.setItem('simple_billing_lang', code);
    axios.defaults.headers.common['x-language'] = code;
    try {
      await axios.put('/api/settings', { defaultLanguage: code });
    } catch (e) {
      // background sync
    }
  };

  useEffect(() => {
    localStorage.setItem('simple_billing_phonetic', String(phoneticEnabled));
  }, [phoneticEnabled]);

  const getLanguageInfo = (code = currentLang) => {
    return languageList.find(l => l.code === code) || languageList[0];
  };

  /**
   * Transliterate a single word from English phonetic input to target native script.
   * e.g. "thakkali" -> "தக்காளி", "cheeni" -> "चीनी"
   */
  const transliterateWord = async (word, targetLang = currentLang) => {
    if (!word || !word.trim()) return word;
    const clean = word.trim().toLowerCase();

    // If English, return as-is
    if (targetLang === 'en') return word;

    const langInfo = getLanguageInfo(targetLang);
    if (!langInfo.itc) return word;

    const cacheKey = `${targetLang}:${clean}`;
    if (transliterationCache.current[cacheKey]) {
      return transliterationCache.current[cacheKey];
    }

    try {
      const res = await axios.get(`/api/transliterate?text=${encodeURIComponent(clean)}&lang=${targetLang}`);
      if (res.data?.converted) {
        const converted = res.data.converted;
        transliterationCache.current[cacheKey] = converted;
        return converted;
      }
    } catch (err) {
      console.warn('Phonetic transliteration fallback:', err?.message);
    }
    return word;
  };

  /**
   * Helper to get display name from an item/category object based on current active language
   */
  const getLocalizedName = (item, defaultName = '') => {
    if (!item) return defaultName;
    if (currentLang !== 'en' && item.translations && item.translations[currentLang]) {
      return item.translations[currentLang];
    }
    return item.name || defaultName;
  };

  return (
    <LanguageContext.Provider value={{
      currentLang,
      setCurrentLang,
      selectLanguage,
      phoneticEnabled,
      setPhoneticEnabled,
      languageList,
      getLanguageInfo,
      transliterateWord,
      getLocalizedName
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
