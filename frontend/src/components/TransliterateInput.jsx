import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';

/**
 * TransliterateInput Component
 * Converts phonetic English typing into native script (Tamil, Hindi, etc.)
 * Automatically transliterates:
 * 1. While typing with a 450ms debounce
 * 2. On Space or Enter
 * 3. On Blur
 * 4. When clicking the language toggle badge
 */
export default function TransliterateInput({
  value = '',
  onChange,
  placeholder = '',
  className = '',
  required = false,
  autoFocus = false,
  type = 'text',
  isTextarea = false,
  rows = 3,
  disabled = false,
  name = '',
  id = ''
}) {
  const { currentLang, phoneticEnabled, transliterateWord, getLanguageInfo } = useLanguage();
  const [localPhonetic, setLocalPhonetic] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const langInfo = getLanguageInfo();
  const isNonEnglish = currentLang !== 'en';
  const activeConversion = isNonEnglish && phoneticEnabled && localPhonetic;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  /**
   * Convert all English words in a given string to target script
   */
  const convertFullText = async (text) => {
    if (!activeConversion || !text || !text.trim()) return;
    if (!/[a-zA-Z]/.test(text)) return;

    setIsConverting(true);
    try {
      const tokens = text.split(/(\s+)/);
      let changed = false;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token && /^[a-zA-Z]+$/.test(token)) {
          const converted = await transliterateWord(token, currentLang);
          if (converted && converted !== token) {
            tokens[i] = converted;
            changed = true;
          }
        }
      }

      if (changed) {
        const finalVal = tokens.join('');
        if (onChange) {
          onChange({
            target: {
              name,
              value: finalVal
            }
          });
        }
      }
    } catch (err) {
      console.warn('Transliteration error:', err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    if (onChange) onChange(e);

    if (activeConversion && /[a-zA-Z]/.test(newVal)) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        convertFullText(newVal);
      }, 450);
    }
  };

  // Immediate conversion on Space or Enter
  const handleKeyDown = async (e) => {
    if (!activeConversion) return;

    if (e.key === ' ' || e.key === 'Enter') {
      const input = inputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart || value.length;
      const textBeforeCursor = value.slice(0, cursorPos);
      const textAfterCursor = value.slice(cursorPos);

      const words = textBeforeCursor.split(/(\s+)/);
      const lastWord = words[words.length - 1];

      if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
        e.preventDefault();
        setIsConverting(true);
        try {
          const converted = await transliterateWord(lastWord, currentLang);
          words[words.length - 1] = converted;
          const newTextBefore = words.join('') + (e.key === ' ' ? ' ' : '\n');
          const finalVal = newTextBefore + textAfterCursor;

          if (onChange) {
            onChange({
              target: {
                name,
                value: finalVal
              }
            });
          }

          setTimeout(() => {
            if (inputRef.current) {
              const newPos = newTextBefore.length;
              inputRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        } catch (err) {
          console.warn('Space transliteration error:', err);
        } finally {
          setIsConverting(false);
        }
      }
    }
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (activeConversion && value && /[a-zA-Z]/.test(value)) {
      convertFullText(value);
    }
  };

  const handleBadgeClick = () => {
    if (value && /[a-zA-Z]/.test(value)) {
      convertFullText(value);
    } else {
      setLocalPhonetic(!localPhonetic);
    }
  };

  return (
    <div className="relative w-full">
      {isTextarea ? (
        <textarea
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          rows={rows}
          disabled={disabled}
          className={`${className} ${isNonEnglish ? 'pr-14' : ''}`}
        />
      ) : (
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          className={`${className} ${isNonEnglish ? 'pr-14' : ''}`}
        />
      )}

      {/* Language / Script Toggle Badge */}
      {isNonEnglish && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleBadgeClick}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-tight transition flex items-center gap-1 shadow-2xs select-none ${
            localPhonetic
              ? 'bg-brand-500 text-slate-950 hover:bg-brand-600'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
          title={
            localPhonetic
              ? `Auto-transliteration to ${langInfo.native} active (Click to force convert or switch to EN)`
              : 'Phonetic conversion off (Click to enable)'
          }
        >
          {isConverting ? (
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping mr-0.5" />
          ) : (
            <Languages className="w-3 h-3 shrink-0" />
          )}
          <span>{localPhonetic ? langInfo.native.slice(0, 3) : 'EN'}</span>
        </button>
      )}
    </div>
  );
}
