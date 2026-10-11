import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages, Globe } from 'lucide-react';

/**
 * TransliterateInput Component
 * Converts phonetic English typing into native script (Tamil, Hindi, etc.)
 * e.g. Typing "Thakkali " converts to "தக்காளி "
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

  const langInfo = getLanguageInfo();
  const isNonEnglish = currentLang !== 'en';
  const activeConversion = isNonEnglish && phoneticEnabled && localPhonetic;

  // Process the last typed word when space/enter/blur occurs
  const handleKeyDown = async (e) => {
    if (!activeConversion) return;

    if (e.key === ' ' || e.key === 'Enter') {
      const input = inputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart || value.length;
      const textBeforeCursor = value.slice(0, cursorPos);
      const textAfterCursor = value.slice(cursorPos);

      // Find the last word before the cursor
      const words = textBeforeCursor.split(/(\s+)/);
      const lastWord = words[words.length - 1];

      // Check if last word contains English letters to transliterate
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

          // Move cursor after the inserted word + space
          setTimeout(() => {
            if (inputRef.current) {
              const newPos = newTextBefore.length;
              inputRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        } catch (err) {
          console.warn('Transliteration error:', err);
        } finally {
          setIsConverting(false);
        }
      }
    }
  };

  const handleBlur = async () => {
    if (!activeConversion) return;
    if (!value || !value.trim()) return;

    const words = value.split(/(\s+)/);
    const lastWord = words[words.length - 1];
    if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
      setIsConverting(true);
      try {
        const converted = await transliterateWord(lastWord, currentLang);
        words[words.length - 1] = converted;
        const finalVal = words.join('');
        if (onChange) {
          onChange({ target: { name, value: finalVal } });
        }
      } catch (err) {
        console.warn('Blur transliteration error:', err);
      } finally {
        setIsConverting(false);
      }
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
          onChange={onChange}
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
          onChange={onChange}
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
          onClick={() => setLocalPhonetic(!localPhonetic)}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-tight transition flex items-center gap-1 shadow-2xs select-none ${
            localPhonetic
              ? 'bg-brand-500 text-slate-950 hover:bg-brand-600'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
          title={localPhonetic ? `Typing converts to ${langInfo.native} (Click to switch to English)` : 'Phonetic conversion off (Click to enable)'}
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
