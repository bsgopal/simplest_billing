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
    return localStorage.getItem('simple_billing_lang') || 'en';
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
      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(clean)}&itc=${langInfo.itc}&num=3&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
      const res = await axios.get(url, { timeout: 3000 });
      if (res.data && res.data[0] === 'SUCCESS' && res.data[1]?.[0]?.[1]?.[0]) {
        const converted = res.data[1][0][1][0];
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
