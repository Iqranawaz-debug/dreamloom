"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

// Voices that tend to sound soft, best first. Falls back to any voice in the page language.
const PREFERRED = [/aria/i, /jenny/i, /samantha/i, /serena/i, /libby/i, /sonia/i, /natural/i, /google uk english female/i, /female/i];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const lang = navigator.language.slice(0, 2);
  const local = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  const pool = local.length ? local : voices;
  for (const re of PREFERRED) {
    const match = pool.find((v) => re.test(v.name));
    if (match) return match;
  }
  return pool[0] ?? null;
}

/** Reads the poem line by line with browser text-to-speech: slow, low and soft. */
export function ReadAloud({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const runRef = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- speechSynthesis only exists in the browser
    setSupported("speechSynthesis" in window);
    if ("speechSynthesis" in window) speechSynthesis.getVoices(); // some browsers load voices lazily
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- a counter, not a DOM node: cancels the running read
      runRef.current++;
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
  }, []);

  // A rewritten poem should not keep reading the old words.
  useEffect(() => {
    runRef.current++;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with the external speech engine
    setSpeaking(false);
  }, [text]);

  function toggle() {
    const run = ++runRef.current;
    speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const voice = pickVoice();
    setSpeaking(true);
    const speakLine = (i: number) => {
      if (run !== runRef.current) return;
      if (i >= lines.length) return setSpeaking(false);
      const u = new SpeechSynthesisUtterance(lines[i]);
      if (voice) u.voice = voice;
      u.rate = 0.72;
      u.pitch = 0.9;
      u.volume = 0.85;
      u.onend = () => setTimeout(() => speakLine(i + 1), 450); // a breath between lines
      u.onerror = () => run === runRef.current && setSpeaking(false);
      speechSynthesis.speak(u);
    };
    speakLine(0);
  }

  if (!supported) return null;
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={toggle} aria-pressed={speaking}>
      <Icon name={speaking ? "stop" : "speaker"} className="h-4 w-4" />
      {speaking ? "Stop reading" : "Read aloud"}
    </button>
  );
}
