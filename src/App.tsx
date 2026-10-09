import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cn } from "./utils/cn";

type Screen = "landing" | "auth" | "phone" | "otp" | "app";
type Tab = "discover" | "practice" | "player" | "profile";
type PlayerPanel = "lyrics" | "chords" | "diagram";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const onboardingSteps = [
  {
    title: "Play with confidence",
    body: "Diminish is a mobile rehearsal web app for songs, lyrics, and chord guidance in one focused player.",
  },
  {
    title: "Move from idea to performance",
    body: "Save songs, switch key, adjust tempo, and follow synced lyrics and chord flow without visual noise.",
  },
  {
    title: "Built for live mobile use",
    body: "A clean performance mode keeps essentials visible and gracefully fades secondary details while you play.",
  },
];

const song = {
  title: "Midnight Resolve",
  artist: "Sonnet Session",
  cover: "/images/cover-midnight.jpg",
  duration: 236,
  lyrics: [
    "The room is quiet, strings begin to breathe",
    "One steady pulse and all the doubt will leave",
    "Hold the line, hear the city slow",
    "Light the phrase, let the rhythm flow",
    "When the chorus lands we rise as one",
    "Every broken note becomes the sun",
    "Hands on the fret and eyes ahead",
    "We turn the silence into thread",
    "Take this chord and let it ring",
    "Tonight we play everything",
  ],
  chordLane: ["Am", "F", "C", "G", "Dm", "Am", "Em", "F", "C", "G"],
  diagrams: ["Am", "F", "C", "G", "Dm", "Em"],
};

const chordFingers: Record<string, string[]> = {
  Am: ["x", "0", "2", "2", "1", "0"],
  F: ["1", "3", "3", "2", "1", "1"],
  C: ["x", "3", "2", "0", "1", "0"],
  G: ["3", "2", "0", "0", "0", "3"],
  Dm: ["x", "x", "0", "2", "3", "1"],
  Em: ["0", "2", "2", "0", "0", "0"],
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(1, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [screen, setScreen] = useState<Screen>("landing");
  const [step, setStep] = useState(0);

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpTimer, setOtpTimer] = useState(30);

  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [playerPanel, setPlayerPanel] = useState<PlayerPanel>("lyrics");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tempo, setTempo] = useState(100);
  const [transpose, setTranspose] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  const [mode, setMode] = useState<"guest" | "member" | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [toast, setToast] = useState("");

  const activeLyricIndex = useMemo(() => {
    const ratio = progress / song.duration;
    return Math.min(song.lyrics.length - 1, Math.floor(ratio * song.lyrics.length));
  }, [progress]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setToast("App installed successfully.");
      setShowInstallPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (screen !== "otp" || otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, otpTimer]);

  useEffect(() => {
    if (!playing || activeTab !== "player") return;
    const timer = setInterval(() => {
      setProgress((prev) => (prev + 1 >= song.duration ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, activeTab]);

  useEffect(() => {
    if (screen !== "app" || installDismissed) return;
    const t = setTimeout(() => setShowInstallPrompt(true), 7000);
    return () => clearTimeout(t);
  }, [screen, installDismissed]);

  useEffect(() => {
    if (!playing || activeTab !== "player") {
      setShowChrome(true);
      return;
    }
    const t = setInterval(() => {
      if (Date.now() - lastInteraction > 3200) setShowChrome(false);
    }, 400);
    return () => clearInterval(t);
  }, [playing, activeTab, lastInteraction]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const enterApp = (nextMode: "guest" | "member") => {
    setMode(nextMode);
    setScreen("app");
    setActiveTab("discover");
  };

  const requestOtp = () => {
    if (!/^9\d{9}$/.test(phone)) {
      setPhoneError("Enter a valid Iranian mobile number. Example: 9123456789");
      return;
    }
    setPhoneError("");
    const code = generateOtp();
    setOtpCode(code);
    setOtp("");
    setOtpTimer(30);
    setScreen("otp");
  };

  const verifyOtp = () => {
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    if (otp !== otpCode) {
      setOtpError("Invalid code. Check and try again.");
      return;
    }
    setOtpError("");
    enterApp("member");
  };

  const resendOtp = () => {
    const code = generateOtp();
    setOtpCode(code);
    setOtp("");
    setOtpTimer(30);
    setToast("A new one-time code was sent.");
  };

  const markActivity = () => {
    setLastInteraction(Date.now());
    setShowChrome(true);
  };

  const installNow = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div
      className={cn(
        "min-h-screen w-full transition-colors duration-500",
        theme === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-zinc-100 text-zinc-900"
      )}
    >
      <main className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden border-zinc-800/30 md:border-x">
        <AnimatePresence mode="wait">
          {screen === "landing" && (
            <motion.section
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex min-h-screen flex-col justify-between"
            >
              <img src="/images/hero-stage.jpg" alt="Musician using mobile player" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/90" />

              <div className="relative z-10 px-6 pt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/80">Diminish</p>
              </div>

              <motion.div
                key={step}
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 px-6 pb-10"
              >
                <p className="text-sm text-white/70">Step {step + 1} of {onboardingSteps.length}</p>
                <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">{onboardingSteps[step].title}</h1>
                <p className="mt-3 max-w-[34ch] text-sm leading-6 text-white/80">{onboardingSteps[step].body}</p>

                <div className="mt-7 flex items-center justify-between gap-3">
                  <button
                    onClick={() => (step === 0 ? setScreen("auth") : setStep((prev) => prev - 1))}
                    className="h-11 px-4 text-sm font-medium text-white/75"
                  >
                    {step === 0 ? "Skip" : "Back"}
                  </button>
                  <button
                    onClick={() => (step === onboardingSteps.length - 1 ? setScreen("auth") : setStep((prev) => prev + 1))}
                    className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-zinc-900"
                  >
                    {step === onboardingSteps.length - 1 ? "Continue" : "Next"}
                  </button>
                </div>
              </motion.div>
            </motion.section>
          )}

          {screen === "auth" && (
            <motion.section
              key="auth"
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -36, opacity: 0 }}
              className="flex min-h-screen flex-col px-6 pb-10 pt-14"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">Diminish Access</p>
              <h2 className="mt-3 text-3xl font-semibold">Choose how to enter</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Continue as guest for instant use, or register with an Iranian mobile number for synced progress.
              </p>

              <div className="mt-10 space-y-3">
                <button
                  onClick={() => enterApp("guest")}
                  className="w-full rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium transition hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
                >
                  Continue as guest
                </button>
                <button
                  onClick={() => setScreen("phone")}
                  className="w-full rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white"
                >
                  Register with mobile number
                </button>
              </div>
            </motion.section>
          )}

          {screen === "phone" && (
            <motion.section
              key="phone"
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -36, opacity: 0 }}
              className="flex min-h-screen flex-col px-6 pb-10 pt-14"
            >
              <button onClick={() => setScreen("auth")} className="w-fit text-sm text-zinc-500">Back</button>
              <h2 className="mt-4 text-3xl font-semibold">Phone verification</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Enter your Iranian number to receive a one-time code.</p>

              <label className="mt-9 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Mobile Number</label>
              <div className="mt-2 flex items-center border-b border-zinc-300 pb-2 dark:border-zinc-700">
                <span className="text-lg font-medium text-zinc-500">+98</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9123456789"
                  className="ml-3 w-full bg-transparent text-lg outline-none"
                  inputMode="numeric"
                />
              </div>
              {phoneError && <p className="mt-2 text-xs text-rose-500">{phoneError}</p>}

              <button onClick={requestOtp} className="mt-auto w-full rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white">
                Send one-time code
              </button>
            </motion.section>
          )}

          {screen === "otp" && (
            <motion.section
              key="otp"
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -36, opacity: 0 }}
              className="flex min-h-screen flex-col px-6 pb-10 pt-14"
            >
              <button onClick={() => setScreen("phone")} className="w-fit text-sm text-zinc-500">Back</button>
              <h2 className="mt-4 text-3xl font-semibold">Enter the code</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Code was sent to +98 {phone}.</p>
              <p className="mt-2 text-xs text-zinc-400">Demo code: {otpCode}</p>

              <div className="mt-8">
                <div className="flex justify-between gap-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <span
                      key={idx}
                      className="flex h-12 w-11 items-center justify-center border-b-2 border-zinc-400 text-xl font-semibold dark:border-zinc-500"
                    >
                      {otp[idx] ?? ""}
                    </span>
                  ))}
                </div>
                <input
                  value={otp}
                  onChange={(e) => {
                    setOtpError("");
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  }}
                  inputMode="numeric"
                  autoFocus
                  placeholder="Type code"
                  className="mt-4 w-full border-b border-zinc-300 bg-transparent pb-2 text-center text-sm tracking-[0.4em] outline-none dark:border-zinc-700"
                />
              </div>

              {otpError && <p className="mt-3 text-xs text-rose-500">{otpError}</p>}

              <div className="mt-7 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Resend in {otpTimer}s</span>
                <button disabled={otpTimer > 0} onClick={resendOtp} className="font-medium text-violet-500 disabled:text-zinc-400">
                  Resend code
                </button>
              </div>

              <button onClick={verifyOtp} className="mt-auto w-full rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white">
                Verify and continue
              </button>
            </motion.section>
          )}

          {screen === "app" && (
            <motion.section key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-screen flex-col">
              <header className="flex items-center justify-between px-5 pb-3 pt-7">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-violet-400">Diminish</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{mode === "guest" ? "Guest session" : "Member session"}</p>
                </div>
                <button
                  onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700"
                >
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
              </header>

              <AnimatePresence mode="wait">
                {activeTab === "discover" && (
                  <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5">
                    <h3 className="text-2xl font-semibold">Discover</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose a song and jump directly into player mode.</p>

                    <div className="mt-6 space-y-3">
                      {[
                        { title: "Midnight Resolve", artist: "Sonnet Session", length: "3:56" },
                        { title: "Northern Lights", artist: "Aster Lane", length: "4:14" },
                        { title: "Blue Ceiling", artist: "Transit Echo", length: "2:58" },
                      ].map((item) => (
                        <button
                          key={item.title}
                          onClick={() => {
                            setActiveTab("player");
                            setToast(`${item.title} opened in player.`);
                          }}
                          className="flex w-full items-center justify-between border-b border-zinc-200 py-3 text-left dark:border-zinc-800"
                        >
                          <span>
                            <span className="block text-sm font-medium">{item.title}</span>
                            <span className="block text-xs text-zinc-500">{item.artist}</span>
                          </span>
                          <span className="text-xs text-zinc-500">{item.length}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === "practice" && (
                  <motion.div key="practice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5">
                    <h3 className="text-2xl font-semibold">Practice Setup</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Prepare scenarios before rehearsal starts.</p>

                    <div className="mt-7 space-y-5 text-sm">
                      <div>
                        <p className="font-medium">Quick start rehearsal</p>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Loads your recent song with saved tempo and key.</p>
                        <button onClick={() => setToast("Rehearsal session prepared.")} className="mt-2 text-violet-500">Start now</button>
                      </div>

                      <div>
                        <p className="font-medium">Sync across devices</p>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                          {mode === "guest"
                            ? "Guest mode has local-only history. Register to sync setlists."
                            : "Your account is ready. Sync is simulated in this design prototype."}
                        </p>
                        {mode === "guest" && (
                          <button onClick={() => setScreen("auth")} className="mt-2 text-violet-500">Register now</button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "player" && (
                  <motion.div
                    key="player"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-1 flex-col overflow-hidden"
                    onPointerDown={markActivity}
                    onPointerMove={markActivity}
                  >
                    <motion.div
                      animate={{ opacity: showChrome ? 1 : 0, y: showChrome ? 0 : -18, height: showChrome ? "auto" : 0 }}
                      transition={{ duration: 0.35 }}
                      className="overflow-hidden px-5"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Performance Mode</p>
                    </motion.div>

                    <div className="px-5 pt-3">
                      <motion.img
                        animate={{ height: showChrome ? 228 : 140 }}
                        transition={{ duration: 0.35 }}
                        src={song.cover}
                        alt={song.title}
                        className="w-full rounded-2xl object-cover"
                      />
                    </div>

                    <div className="px-5 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold">{song.title}</p>
                          <p className="text-sm text-zinc-500">{song.artist}</p>
                        </div>
                        <button onClick={() => setToast("Added to rehearsal queue.")} className="text-xs text-violet-500">Queue</button>
                      </div>

                      <div className="mt-4">
                        <input
                          type="range"
                          min={0}
                          max={song.duration}
                          value={progress}
                          onChange={(e) => {
                            setProgress(Number(e.target.value));
                            markActivity();
                          }}
                          className="h-1.5 w-full accent-violet-500"
                        />
                        <div className="mt-2 flex justify-between text-xs text-zinc-500">
                          <span>{formatTime(progress)}</span>
                          <span>{formatTime(song.duration)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-6">
                        <button onClick={() => setProgress((prev) => Math.max(0, prev - 10))} className="text-sm">-10s</button>
                        <button
                          onClick={() => {
                            setPlaying((prev) => !prev);
                            markActivity();
                          }}
                          className="rounded-full bg-violet-500 px-6 py-2 text-sm font-semibold text-white"
                        >
                          {playing ? "Pause" : "Play"}
                        </button>
                        <button onClick={() => setProgress((prev) => Math.min(song.duration, prev + 10))} className="text-sm">+10s</button>
                      </div>
                    </div>

                    <motion.div
                      animate={{ opacity: showChrome ? 1 : 0.85, y: showChrome ? 0 : 8 }}
                      className="mt-4 flex items-center gap-2 px-5"
                    >
                      {(["lyrics", "chords", "diagram"] as PlayerPanel[]).map((item) => (
                        <button
                          key={item}
                          onClick={() => {
                            setPlayerPanel(item);
                            markActivity();
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs capitalize",
                            playerPanel === item
                              ? "bg-violet-500 text-white"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </motion.div>

                    <div className="mt-3 flex min-h-0 flex-1 flex-col px-5 pb-24">
                      {playerPanel === "lyrics" && (
                        <div className="mobile-scrollbar flex-1 overflow-y-auto pr-2">
                          {song.lyrics.map((line, idx) => (
                            <p
                              key={line}
                              className={cn(
                                "py-2 text-base transition",
                                idx === activeLyricIndex ? "text-violet-500" : "text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      )}

                      {playerPanel === "chords" && (
                        <div className="overflow-x-auto pb-2">
                          <div className="flex min-w-max gap-8 border-b border-zinc-300 pb-5 pt-1 text-xl font-medium dark:border-zinc-700">
                            {song.chordLane.map((chord, idx) => (
                              <span key={`${chord}-${idx}`} className={idx === activeLyricIndex ? "text-violet-500" : "text-zinc-500"}>
                                {chord}
                              </span>
                            ))}
                          </div>

                          <div className="mt-5 flex items-center gap-4 text-xs text-zinc-500">
                            <label>Transpose {transpose > 0 ? `+${transpose}` : transpose}</label>
                            <input
                              type="range"
                              min={-6}
                              max={6}
                              value={transpose}
                              onChange={(e) => setTranspose(Number(e.target.value))}
                              className="h-1.5 flex-1 accent-violet-500"
                            />
                          </div>
                        </div>
                      )}

                      {playerPanel === "diagram" && (
                        <div className="overflow-x-auto">
                          <div className="flex min-w-max gap-6 pb-5">
                            {song.diagrams.map((chord) => (
                              <div key={chord} className="w-24">
                                <p className="text-center text-sm font-semibold">{chord}</p>
                                <div className="mt-2 grid grid-cols-6 gap-1 border-y border-zinc-300 py-3 text-center text-xs dark:border-zinc-700">
                                  {chordFingers[chord].map((finger, idx) => (
                                    <span key={`${chord}-${idx}`}>{finger}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                            <label>Tempo {tempo}%</label>
                            <input
                              type="range"
                              min={60}
                              max={120}
                              value={tempo}
                              onChange={(e) => setTempo(Number(e.target.value))}
                              className="h-1.5 flex-1 accent-violet-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === "profile" && (
                  <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5">
                    <h3 className="text-2xl font-semibold">Profile & Device</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Everything here is UI only, no backend persistence.</p>

                    <div className="mt-7 space-y-6 text-sm">
                      <div>
                        <p className="font-medium">Session type</p>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">{mode === "guest" ? "Guest" : "Registered member"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Install web app</p>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Get offline shell and quick home-screen launch.</p>
                        <button onClick={() => setShowInstallPrompt(true)} className="mt-2 text-violet-500">Open install guide</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <nav className="mt-auto grid grid-cols-4 border-t border-zinc-200 bg-white/90 px-2 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950/90">
                {[
                  ["discover", "Discover"],
                  ["practice", "Practice"],
                  ["player", "Player"],
                  ["profile", "Profile"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as Tab)}
                    className={cn("rounded-xl py-2", activeTab === key ? "text-violet-500" : "text-zinc-500")}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInstallPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-end bg-black/55 p-4"
              onClick={() => {
                setShowInstallPrompt(false);
                setInstallDismissed(true);
              }}
            >
              <motion.div
                initial={{ y: 26, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 26, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-2xl bg-white p-5 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-violet-500">Install Diminish</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Add this web app to your home screen for fast access during practice.</p>

                <div className="mt-4 space-y-2 text-sm">
                  <p><span className="font-medium">Android:</span> Open browser menu, then tap Install app or Add to Home screen.</p>
                  <p><span className="font-medium">iPhone:</span> Tap Share in Safari, then Add to Home Screen.</p>
                  <p><span className="font-medium">Desktop:</span> Use the install icon in the address bar.</p>
                </div>

                <div className="mt-5 flex gap-2">
                  {deferredPrompt && (
                    <button onClick={installNow} className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white">
                      Install now
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowInstallPrompt(false);
                      setInstallDismissed(true);
                    }}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
                  >
                    Maybe later
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
