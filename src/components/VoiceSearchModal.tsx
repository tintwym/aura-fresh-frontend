import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, ShoppingCart, Sparkles, Volume2, Search, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GroceryItem } from '../types';
import { parseVoiceCommand, VoiceCommandResult } from '../utils/fuzzySearch';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  groceries: GroceryItem[];
  onAddToCart: (item: GroceryItem, qty: number, isSub: boolean, freq?: 'weekly' | 'biweekly' | 'monthly') => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  onApplySearchFilter?: (query: string) => void;
}

export default function VoiceSearchModal({
  isOpen,
  onClose,
  groceries,
  onAddToCart,
  onAddToast,
  onApplySearchFilter
}: VoiceSearchModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [commandResult, setCommandResult] = useState<VoiceCommandResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Suggested voice shortcuts for instant testing
  const sampleCommands = [
    'Add 2 Shwe Bo Rice to cart',
    'Buy Shan Organic Avocados',
    'Add 1 kg Chickpea Tofu',
    'Pyin Oo Lwin Coffee Beans',
    'Add Free-Range Chicken'
  ];

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setCommandResult(null);
      setErrorMsg(null);
      return;
    }

    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (event.results[0].isFinal) {
          processTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access denied. You can type or tap sample commands below.');
        } else if (event.error === 'no-speech') {
          setErrorMsg('No speech detected. Please speak into your microphone or try again.');
        } else {
          setErrorMsg(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      startListening();
    } else {
      setErrorMsg('Web Speech API is not supported in this browser environment. Use manual input or sample prompts below.');
    }

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setTranscript('');
        setCommandResult(null);
        setErrorMsg(null);
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be running
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    setIsListening(false);
  };

  const processTranscript = (text: string) => {
    if (!text.trim()) return;
    const result = parseVoiceCommand(text, groceries);
    setCommandResult(result);

    if (result.action === 'add_to_cart' && result.item) {
      onAddToCart(result.item, result.quantity, false);
      onAddToast(
        '🎤 Voice Order Added!',
        `Added ${result.quantity}x "${result.item.name}" directly to your cart.`,
        'success'
      );
    } else if (result.item) {
      if (onApplySearchFilter) {
        onApplySearchFilter(result.item.name);
      }
      onAddToast('🎤 Item Found', `Matching item: ${result.item.name}`, 'info');
    } else {
      if (onApplySearchFilter) {
        onApplySearchFilter(text);
      }
      onAddToast('🎤 Voice Search', `Searching catalog for "${text}"`, 'info');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setTranscript(manualInput);
    processTranscript(manualInput);
    setManualInput('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-lg bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden font-sans text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-[#161616]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Volume2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">Voice Assistant & Search</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Speak commands like "Add 2 Shwe Bo Rice to cart"</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Visualizer & Mic Button */}
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="relative">
                {/* Glowing ripple background rings */}
                {isListening && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.4, 1.8], opacity: [0.6, 0.3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-emerald-500/30 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.25, 1.5], opacity: [0.8, 0.4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-emerald-500/40 rounded-full"
                    />
                  </>
                )}

                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 cursor-pointer ${
                    isListening
                      ? 'bg-emerald-500 text-black shadow-emerald-500/40'
                      : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#252525]'
                  }`}
                >
                  {isListening ? (
                    <Mic className="w-8 h-8 animate-pulse" />
                  ) : (
                    <MicOff className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div className="text-center space-y-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                  isListening
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-[#181818] text-slate-500 dark:text-slate-400'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {isListening ? 'Listening for voice command...' : 'Tap mic to start listening'}
                </span>
                {transcript && (
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 pt-2 italic">
                    "{transcript}"
                  </p>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Parsing Result Card */}
            {commandResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Command Parsed
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 rounded-full font-bold">
                    {commandResult.action === 'add_to_cart' ? 'Cart Auto-Add' : 'Catalog Search'}
                  </span>
                </div>

                {commandResult.item ? (
                  <div className="flex items-center gap-3 p-2 bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-white/5">
                    <img
                      src={commandResult.item.imageUrl}
                      alt={commandResult.item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {commandResult.item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {commandResult.item.price.toLocaleString()} MMK ({commandResult.item.unit})
                      </p>
                    </div>
                    {commandResult.action === 'add_to_cart' ? (
                      <span className="px-2.5 py-1 bg-emerald-500 text-black text-xs font-black rounded-lg flex items-center gap-1">
                        <ShoppingCart className="w-3.5 h-3.5" /> +{commandResult.quantity}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onAddToCart(commandResult.item!, 1, false);
                          onAddToast('Added to Cart', `${commandResult.item!.name} added`, 'success');
                        }}
                        className="px-2.5 py-1 bg-emerald-500 text-black text-xs font-extrabold rounded-lg cursor-pointer"
                      >
                        Add
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No exact grocery item match for "{commandResult.searchTerm}". Try saying "Rice" or "Avocado".
                  </p>
                )}
              </motion.div>
            )}

            {/* Quick Sample Prompts */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Try Speaking or Tapping These Prompts:
              </label>
              <div className="flex flex-wrap gap-2">
                {sampleCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTranscript(cmd);
                      processTranscript(cmd);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-500/10 dark:bg-[#1a1a1a] dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <span>"{cmd}"</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Fallback Text Input */}
            <form onSubmit={handleManualSubmit} className="relative pt-2">
              <div className="relative">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Or type voice command manually..."
                  className="w-full pl-9 pr-20 py-2.5 bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 px-3 py-1 bg-emerald-500 text-black text-xs font-extrabold rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  Execute
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
