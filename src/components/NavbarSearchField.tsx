import React, { useEffect, useRef, useState } from 'react';
import { Search, Mic, X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  /** Scroll catalog into view on focus / typing */
  onActivate?: () => void;
  className?: string;
};

export default function NavbarSearchField({
  value,
  onChange,
  onAddToast,
  onActivate,
  className = '',
}: Props) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<{
    start: () => void;
    stop: () => void;
    abort: () => void;
  } | null>(null);

  const onChangeRef = useRef(onChange);
  const onActivateRef = useRef(onActivate);
  const onAddToastRef = useRef(onAddToast);
  onChangeRef.current = onChange;
  onActivateRef.current = onActivate;
  onAddToastRef.current = onAddToast;

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      onAddToastRef.current('Listening…', 'Say a product name.', 'info');
    };
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      onActivateRef.current?.();
      onChangeRef.current(transcript);
      onAddToastRef.current('Voice search', `Looking for “${transcript}”`, 'success');
    };
    rec.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        onAddToastRef.current('Microphone blocked', 'Allow mic access to use voice search.', 'warning');
      } else if (event.error !== 'aborted') {
        onAddToastRef.current('Voice search', `Could not hear you (${event.error}).`, 'warning');
      }
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);

    setRecognition(rec);
    return () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      setRecognition(null);
    };
  }, []);

  const handleToggleSpeech = () => {
    if (!recognition) {
      onAddToast('Not supported', 'Voice search needs Chrome or Safari.', 'warning');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      try {
        onActivate?.();
        recognition.start();
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className={`relative flex-1 min-w-0 max-w-xl mx-2 sm:mx-4 ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c6f66]/70 pointer-events-none" />
      <input
        id="grocery-search"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Search produce, rice, tofu…"
        value={value}
        onFocus={() => onActivate?.()}
        onChange={(e) => {
          onActivate?.();
          onChange(e.target.value);
        }}
        className="w-full pl-9 pr-16 py-2 sm:py-2.5 border border-[#2d6a4f]/15 dark:border-white/10 bg-white/90 dark:bg-[#121a16] text-[#1a2e24] dark:text-[#e7efe9] rounded-2xl text-sm placeholder:text-[#5c6f66]/55 focus:outline-hidden focus:ring-2 focus:ring-[#40916c]/35 transition-shadow"
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 text-[#5c6f66] hover:text-[#1a2e24] dark:hover:text-white rounded-lg cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleToggleSpeech}
          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
            isListening
              ? 'bg-red-500/15 text-red-600'
              : 'text-[#5c6f66] hover:text-[#2d6a4f] hover:bg-[#d8f3dc]/60'
          }`}
          title={isListening ? 'Stop' : 'Voice search'}
          aria-label={isListening ? 'Stop voice search' : 'Voice search'}
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
