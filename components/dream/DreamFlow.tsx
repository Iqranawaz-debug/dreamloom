"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DreamDetail } from "@/lib/db/queries";
import { MAX_ANSWER_CHARS, type PaintStyle, type PoemStyle } from "@/lib/constants";
import { api } from "@/lib/client";
import { DreamOrb } from "./DreamOrb";
import { DreamView } from "./DreamView";
import { StylePicker } from "./StylePicker";
import { Overlay } from "@/components/ui/Overlay";

type Phase = "questions" | "styles" | "creating" | "done";
type Stage = "analyze" | "paint" | "poem";

// Each message belongs to a real stage; a message is only marked done when its stage finishes.
const MESSAGES: { stage: Stage; text: string }[] = [
  { stage: "analyze", text: "Listening to your dream..." },
  { stage: "analyze", text: "Discovering its symbols..." },
  { stage: "paint", text: "Finding its colors..." },
  { stage: "paint", text: "Painting your imagination..." },
  { stage: "poem", text: "Writing your poem..." },
];

function initialPhase(d: DreamDetail): Phase {
  if (d.imageUrl && d.poem) return "done";
  if (d.imagePrompt && d.style && d.poemStyle) return "creating";
  if (d.imagePrompt) return "styles";
  return "questions";
}

export function DreamFlow({ initial }: { initial: DreamDetail }) {
  const [dream, setDream] = useState(initial);
  const [phase, setPhase] = useState<Phase>(() => initialPhase(initial));
  const [paintStyle, setPaintStyle] = useState<PaintStyle>((initial.style as PaintStyle) ?? "watercolor");
  const [poemStyle, setPoemStyle] = useState<PoemStyle>((initial.poemStyle as PoemStyle) ?? "free-verse");
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);

  if (phase === "questions")
    return (
      <Questions
        dreamId={dream.id}
        onDone={(a) => {
          setAnswers(a);
          setPhase("styles");
        }}
      />
    );

  if (phase === "styles")
    return (
      <section className="mx-auto w-full max-w-2xl px-4 pt-8 sm:px-6 sm:pt-14 animate-rise-in" aria-labelledby="styles-title">
        <p className="eyebrow">Almost there</p>
        <h1 id="styles-title" className="font-display mt-3 text-4xl sm:text-5xl">
          How should it be painted?
        </h1>
        <StylePicker kind="paint" value={paintStyle} onChange={setPaintStyle} className="mt-8" />
        <StylePicker kind="poem" value={poemStyle} onChange={setPoemStyle} className="mt-8" />
        <button className="btn btn-primary mt-10 h-14 w-full sm:w-auto sm:px-10" onClick={() => setPhase("creating")}>
          Begin painting
        </button>
      </section>
    );

  if (phase === "creating")
    return (
      <Creating
        dream={dream}
        answers={answers}
        paintStyle={paintStyle}
        poemStyle={poemStyle}
        onDone={(d) => {
          setDream(d);
          setPhase("done");
        }}
      />
    );

  return <DreamView dream={dream} onChange={setDream} reveal />;
}

/* ---------------- Follow-up questions: one at a time, skippable ---------------- */

function Questions({ dreamId, onDone }: { dreamId: number; onDone: (a: { question: string; answer: string }[]) => void }) {
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<{ questions: string[] }>("/api/followups", { body: { dreamId }, signal: ctrl.signal })
      .then((r) => setQuestions(r.questions))
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctrl.abort();
  }, [dreamId, attempt]);

  useEffect(() => {
    if (questions) inputRef.current?.focus();
  }, [questions, i]);

  if (error)
    return (
      <ErrorPanel
        message={error}
        onRetry={() => {
          setError(null);
          setAttempt((a) => a + 1);
        }}
        onSkip={() => onDone([])}
      />
    );

  if (!questions)
    return (
      <Stage title="Your dream is taking shape..." messages={[{ text: "Listening to your dream...", state: "active" }]} />
    );

  const finish = (list: string[]) => onDone(questions.map((q, k) => ({ question: q, answer: list[k] ?? "" })));
  const next = (value: string) => {
    const list = [...answers];
    list[i] = value;
    setAnswers(list);
    if (i + 1 < questions.length) setI(i + 1);
    else finish(list);
  };

  return (
    <section key={i} className="mx-auto w-full max-w-2xl px-4 pt-10 sm:px-6 sm:pt-16 animate-rise-in" aria-labelledby="q-title">
      <div className="flex items-center gap-2" aria-label={`Question ${i + 1} of ${questions.length}`}>
        {questions.map((_, k) => (
          <span key={k} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${k <= i ? "bg-lavender/70" : "bg-line"}`} />
        ))}
      </div>
      <p className="eyebrow mt-8">A gentle question</p>
      <h1 id="q-title" className="font-display mt-3 text-3xl leading-tight sm:text-4xl">
        {questions[i]}
      </h1>
      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          next(inputRef.current?.value.trim() ?? "");
        }}
      >
        <label htmlFor="answer" className="sr-only">
          Your answer
        </label>
        <textarea
          id="answer"
          ref={inputRef}
          defaultValue={answers[i] ?? ""}
          maxLength={MAX_ANSWER_CHARS}
          rows={3}
          placeholder="Whatever comes to mind..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="field min-h-28 resize-none font-display text-xl"
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary min-w-36">
            {i + 1 < questions.length ? "Next" : "Continue"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => next("")}>
            Skip
          </button>
          {i > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button type="button" className="btn btn-ghost ml-auto text-sm" onClick={() => finish(answers)}>
            Skip all questions
          </button>
        </div>
      </form>
    </section>
  );
}

/* ---------------- Creating: analyze -> paint -> poem, each saved as it completes ---------------- */

function Creating({
  dream,
  answers,
  paintStyle,
  poemStyle,
  onDone,
}: {
  dream: DreamDetail;
  answers: { question: string; answer: string }[];
  paintStyle: PaintStyle;
  poemStyle: PoemStyle;
  onDone: (d: DreamDetail) => void;
}) {
  const [stage, setStage] = useState<Stage | "complete">("analyze");
  const [subStep, setSubStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const runningRef = useRef(false);
  const stateRef = useRef(dream);

  const run = useCallback(async () => {
    if (runningRef.current) return; // guards StrictMode double effects and double clicks
    runningRef.current = true;
    setError(null);
    let d = stateRef.current;
    try {
      if (!d.imagePrompt) {
        setStage("analyze");
        const a = await api<{ cleanedText: string; title: string; symbols: string[]; imagePrompt: string }>("/api/analyze", {
          body: { dreamId: d.id, answers: answers.filter((x) => x.question) },
        });
        d = { ...d, ...a, followups: answers.length ? answers.map((x, k) => ({ id: k, dreamId: d.id, ...x })) : d.followups };
        stateRef.current = d;
      }
      if (!d.imageUrl || d.style !== paintStyle) {
        setStage("paint");
        const { imageUrl } = await api<{ imageUrl: string }>("/api/paint", { body: { dreamId: d.id, style: paintStyle } });
        d = { ...d, imageUrl, style: paintStyle };
        stateRef.current = d;
      }
      if (!d.poem || d.poemStyle !== poemStyle) {
        setStage("poem");
        const { poem } = await api<{ poem: string }>("/api/poem", { body: { dreamId: d.id, style: poemStyle } });
        d = { ...d, poem, poemStyle };
        stateRef.current = d;
      }
      setStage("complete");
      onDone(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      runningRef.current = false;
    }
  }, [answers, paintStyle, poemStyle, onDone]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the async pipeline (external system)
    run();
  }, [run, attempt]);

  // Within a stage, advance to its next message after a moment (never past the stage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart sub-steps when the stage changes
    setSubStep(0);
    const t = setTimeout(() => setSubStep(1), 1600);
    return () => clearTimeout(t);
  }, [stage]);

  if (error)
    return (
      <ErrorPanel
        message={error}
        detail={stage !== "complete" ? `Everything before this step was saved, so trying again picks up where it stopped.` : undefined}
        onRetry={() => setAttempt((a) => a + 1)}
      />
    );

  const order: Stage[] = ["analyze", "paint", "poem"];
  const current = stage === "complete" ? 3 : order.indexOf(stage);
  const inStage = MESSAGES.filter((m) => order.indexOf(m.stage) === current).length;
  const activeK = Math.min(subStep, inStage - 1); // the stage's last message stays active until it really finishes
  let k = -1;
  const messages: Msg[] = MESSAGES.map((m) => {
    const si = order.indexOf(m.stage);
    if (si < current) return { text: m.text, state: "done" };
    if (si > current) return { text: m.text, state: "pending" };
    k++;
    return { text: m.text, state: k < activeK ? "done-soft" : k === activeK ? "active" : "pending" };
  });

  return <Stage title="Your dream is taking shape..." messages={messages} />;
}

/* ---------------- Shared pieces ---------------- */

type Msg = { text: string; state: "pending" | "active" | "done" | "done-soft" };

function Stage({ title, messages }: { title: string; messages: Msg[] }) {
  const active = messages.find((m) => m.state === "active");
  return (
    <Overlay className="px-6" aria-labelledby="stage-title" role="region">
      <div className="flex max-w-md flex-col items-center text-center">
        <DreamOrb />
        <h1 id="stage-title" className="font-display mt-10 text-3xl sm:text-4xl">
          {title}
        </h1>
        <p key={active?.text} className="mt-4 min-h-7 text-lg text-ink-muted animate-rise-in" role="status" aria-live="polite">
          {active?.text}
        </p>
        {messages.length > 1 && (
          <ol className="mt-8 space-y-2 text-left text-sm" aria-label="Progress">
            {messages.map((m) => (
              <li key={m.text} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid h-4 w-4 place-items-center rounded-full border transition-all duration-500 ${
                    m.state === "done"
                      ? "border-lavender bg-lavender/80"
                      : m.state === "active"
                        ? "border-lavender animate-pulse"
                        : m.state === "done-soft"
                          ? "border-lavender/60 bg-lavender/30"
                          : "border-line-strong"
                  }`}
                />
                <span className={m.state === "pending" ? "text-ink-faint" : "text-ink-muted"}>
                  {m.text.replace("...", "")}
                  <span className="sr-only">{m.state === "done" ? " (done)" : m.state === "active" ? " (in progress)" : ""}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Overlay>
  );
}

function ErrorPanel({ message, detail, onRetry, onSkip }: { message: string; detail?: string; onRetry: () => void; onSkip?: () => void }) {
  return (
    <section className="mx-auto w-full max-w-lg px-4 pt-16 text-center animate-rise-in" role="alert">
      <div className="glass p-8">
        <p className="text-3xl" aria-hidden>
          🌫️
        </p>
        <h1 className="font-display mt-4 text-3xl">The dream slipped away for a moment</h1>
        <p className="mt-3 text-ink-muted">{message}</p>
        {detail && <p className="mt-2 text-sm text-ink-faint">{detail}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={onRetry} autoFocus>
            Try again
          </button>
          {onSkip && (
            <button className="btn btn-ghost" onClick={onSkip}>
              Skip the questions
            </button>
          )}
          <Link href="/diary" className="btn btn-ghost">
            Go to diary
          </Link>
        </div>
      </div>
    </section>
  );
}
