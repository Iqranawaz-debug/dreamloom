"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in lib.dom for all browsers).
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type Ctor = new () => SpeechRecognitionLike;

function getCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. You can allow it in your browser, or write instead.",
  "service-not-allowed": "Voice input isn't available here. You can write your dream instead.",
  "audio-capture": "No microphone was found. You can write your dream instead.",
  network: "Voice input needs a connection in this browser. You can write instead.",
};

/**
 * Live dictation. Final phrases are passed to onFinal; the in-progress phrase is exposed as `interim`.
 * Chrome ends recognition after silence, so we restart until the user stops.
 */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null); // null until mounted
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run on the client
    setSupported(getCtor() !== null);
    return () => {
      wantRef.current = false;
      recRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const C = getCtor();
    if (!C) return;
    setError(null);
    const rec = new C();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinalRef.current(r[0].transcript.trim());
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      wantRef.current = false;
      setError(ERRORS[e.error] ?? "Voice input stopped unexpectedly. You can try again or write instead.");
    };
    rec.onend = () => {
      setInterim("");
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {}
      }
      setListening(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. Please try again.");
    }
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
