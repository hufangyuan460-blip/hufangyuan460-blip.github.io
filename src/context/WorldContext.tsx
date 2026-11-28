import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { soundEngine } from '../audio/soundEngine';
import { ACHIEVEMENTS, UI_TEXT } from '../i18n';
import type {
  AchievementId,
  AchievementToastItem,
  HotbarSlotNumber,
  LandmarkTarget,
  Locale,
  MotionPresets,
  MotionSettings,
  TimeOfDay,
  TimePhase,
} from '../worlds/types';

export const DEFAULT_MOTION_SETTINGS: MotionSettings = {
  presets: {
    oreOrbit: false,
    portalVortex: false,
    blockWave: false,
  },
  speed: 1.0,
  density: 0.65,
};

export interface CameraFocusCommand {
  target: LandmarkTarget | 'overview';
  seq: number;
}

interface WorldContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  timeOfDay: TimeOfDay;
  timePhase: TimePhase;
  syncTimePhase: (phase: TimePhase) => void;
  timeJumpSeq: number;
  timeJumpTo: TimeOfDay;
  toggleTimeOfDay: () => void;
  audioMuted: boolean;
  toggleAudioMuted: () => void;
  sailingMode: boolean;
  setSailingMode: (enabled: boolean) => void;
  focusedLandmark: LandmarkTarget | null;
  setFocusedLandmark: (landmark: LandmarkTarget | null) => void;
  nearbyLandmark: 'lighthouse' | 'workshop' | null;
  setNearbyLandmark: (landmark: 'lighthouse' | 'workshop' | null) => void;
  cameraCommand: CameraFocusCommand | null;
  requestCameraFocus: (target: LandmarkTarget | 'overview') => void;
  hotbarNotice: string | null;
  showHotbarNotice: (message: string, durationMs?: number) => void;
  sleepFade: number;
  setSleepFade: (opacity: number) => void;
  activeSlot: HotbarSlotNumber;
  activeWorldId: string;
  selectSlot: (slot: HotbarSlotNumber, worldId: string) => void;
  returnToOverworld: () => void;
  motion: MotionSettings;
  toggleMotionPreset: (preset: keyof MotionPresets) => void;
  setMotionSpeed: (speed: number) => void;
  setMotionDensity: (density: number) => void;
  setAllMotionPresets: (enabled: boolean) => void;
  resetMotion: () => void;
  toasts: AchievementToastItem[];
  unlockedAchievements: AchievementId[];
  unlockAchievement: (id: AchievementId, options?: { forceNotify?: boolean }) => void;
  dismissToast: (uid: number) => void;
  srAnnouncement: string;
  emptySlotHintSlot: HotbarSlotNumber | null;
  flashEmptySlot: (slot: HotbarSlotNumber) => void;
}

const WorldContext = createContext<WorldContextValue | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('zh');
  const [timePhase, setTimePhase] = useState<TimePhase>('day');
  const [timeJumpSeq, setTimeJumpSeq] = useState<number>(0);
  const [timeJumpTo, setTimeJumpTo] = useState<TimeOfDay>('day');
  const [audioMuted, setAudioMuted] = useState<boolean>(true);
  const [sailingMode, setSailingModeState] = useState<boolean>(false);
  const [focusedLandmark, setFocusedLandmark] = useState<LandmarkTarget | null>(null);
  const [nearbyLandmark, setNearbyLandmark] = useState<'lighthouse' | 'workshop' | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraFocusCommand | null>(null);
  const [hotbarNotice, setHotbarNotice] = useState<string | null>(null);
  const [sleepFade, setSleepFade] = useState<number>(0);

  const [activeSlot, setActiveSlot] = useState<HotbarSlotNumber>(1);
  const [activeWorldId, setActiveWorldId] = useState<string>('overworld');
  const [motion, setMotion] = useState<MotionSettings>(DEFAULT_MOTION_SETTINGS);
  const [toasts, setToasts] = useState<AchievementToastItem[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<AchievementId[]>([]);
  const [srAnnouncement, setSrAnnouncement] = useState<string>('');
  const [emptySlotHintSlot, setEmptySlotHintSlot] = useState<HotbarSlotNumber | null>(null);

  const toastCounterRef = useRef(1);
  const unlockedRef = useRef<Set<AchievementId>>(new Set());
  const emptySlotTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const cameraSeqRef = useRef(1);
  const timePhaseRef = useRef<TimePhase>(timePhase);
  timePhaseRef.current = timePhase;
  const localeRef = useRef<Locale>(locale);
  localeRef.current = locale;

  const timeOfDay: TimeOfDay = timePhase === 'night' || timePhase === 'dusk' ? 'night' : 'day';

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = UI_TEXT.pageTitle[locale];
  }, [locale]);

  const announce = useCallback((text: string) => {
    const doc = document as Document & { ariaNotify?: (message: string) => void };
    if (typeof doc.ariaNotify === 'function') {
      doc.ariaNotify(text);
    } else {
      setSrAnnouncement('');
      requestAnimationFrame(() => {
        setSrAnnouncement(text);
      });
    }
  }, []);

  const unlockAchievement = useCallback(
    (id: AchievementId, options?: { forceNotify?: boolean }) => {
      const alreadyUnlocked = unlockedRef.current.has(id);
      if (alreadyUnlocked && !options?.forceNotify) {
        return;
      }
      if (!alreadyUnlocked) {
        unlockedRef.current.add(id);
        setUnlockedAchievements((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }

      soundEngine.playAdvancementChime();
      const uid = toastCounterRef.current++;
      setToasts((prev) => [...prev.slice(-2), { uid, achievementId: id, createdAt: Date.now() }]);

      const currentLocale = localeRef.current;
      const def = ACHIEVEMENTS[id];
      announce(`${UI_TEXT.advancementBanner[currentLocale]} ${def.title[currentLocale]}`);
    },
    [announce],
  );

  const dismissToast = useCallback((uid: number) => {
    setToasts((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  // Trigger welcome achievement once on initial mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      unlockAchievement('new-world');
    }, 650);
    return () => window.clearTimeout(timer);
  }, [unlockAchievement]);

  const toggleLocale = useCallback(() => {
    soundEngine.playUiClick();
    setLocale((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  const syncTimePhase = useCallback((phase: TimePhase) => {
    if (timePhaseRef.current !== phase) {
      timePhaseRef.current = phase;
      setTimePhase(phase);
    }
  }, []);

  const toggleTimeOfDay = useCallback(() => {
    soundEngine.playUiClick();
    const currentlyNight = timePhaseRef.current === 'night' || timePhaseRef.current === 'dusk';
    const next: TimeOfDay = currentlyNight ? 'day' : 'night';
    setTimeJumpTo(next);
    setTimeJumpSeq((s) => s + 1);
    setTimePhase(next);
    unlockAchievement('night-owl');
  }, [unlockAchievement]);

  const toggleAudioMuted = useCallback(() => {
    setAudioMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const setSailingMode = useCallback((enabled: boolean) => {
    soundEngine.playUiClick();
    setSailingModeState(enabled);
    if (enabled) {
      setFocusedLandmark(null);
      soundEngine.playSplash();
    } else {
      setNearbyLandmark(null);
    }
  }, []);

  const requestCameraFocus = useCallback((target: LandmarkTarget | 'overview') => {
    soundEngine.playUiClick();
    if (target === 'overview') {
      setSailingModeState(false);
      setFocusedLandmark(null);
      setNearbyLandmark(null);
    } else {
      setSailingModeState(false);
      setFocusedLandmark(target);
    }
    setCameraCommand({ target, seq: cameraSeqRef.current++ });
  }, []);

  const showHotbarNotice = useCallback((message: string, durationMs = 2100) => {
    setHotbarNotice(message);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setHotbarNotice(null);
    }, durationMs);
  }, []);

  // Esc exits sailing mode cleanly when no overlay panel is open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sailingMode && activeWorldId === 'overworld') {
        requestCameraFocus('overview');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeWorldId, requestCameraFocus, sailingMode]);

  const selectSlot = useCallback((slot: HotbarSlotNumber, worldId: string) => {
    soundEngine.playUiClick();
    setActiveSlot(slot);
    setActiveWorldId(worldId);
    setEmptySlotHintSlot(null);
  }, []);

  const returnToOverworld = useCallback(() => {
    soundEngine.playUiClick();
    setActiveSlot(1);
    setActiveWorldId('overworld');
    setEmptySlotHintSlot(null);
  }, []);

  const flashEmptySlot = useCallback((slot: HotbarSlotNumber) => {
    soundEngine.playUiClick();
    setEmptySlotHintSlot(slot);
    if (emptySlotTimerRef.current !== null) {
      window.clearTimeout(emptySlotTimerRef.current);
    }
    emptySlotTimerRef.current = window.setTimeout(() => {
      setEmptySlotHintSlot(null);
    }, 2200);
  }, []);

  const toggleMotionPreset = useCallback((preset: keyof MotionPresets) => {
    soundEngine.playUiClick();
    setMotion((prev) => ({
      ...prev,
      presets: {
        ...prev.presets,
        [preset]: !prev.presets[preset],
      },
    }));
  }, []);

  const setMotionSpeed = useCallback((speed: number) => {
    setMotion((prev) => ({ ...prev, speed }));
  }, []);

  const setMotionDensity = useCallback((density: number) => {
    setMotion((prev) => ({ ...prev, density }));
  }, []);

  const setAllMotionPresets = useCallback((enabled: boolean) => {
    soundEngine.playUiClick();
    setMotion((prev) => ({
      ...prev,
      presets: {
        oreOrbit: enabled,
        portalVortex: enabled,
        blockWave: enabled,
      },
    }));
  }, []);

  const resetMotion = useCallback(() => {
    soundEngine.playUiClick();
    setMotion(DEFAULT_MOTION_SETTINGS);
  }, []);

  const value = useMemo<WorldContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      timeOfDay,
      timePhase,
      syncTimePhase,
      timeJumpSeq,
      timeJumpTo,
      toggleTimeOfDay,
      audioMuted,
      toggleAudioMuted,
      sailingMode,
      setSailingMode,
      focusedLandmark,
      setFocusedLandmark,
      nearbyLandmark,
      setNearbyLandmark,
      cameraCommand,
      requestCameraFocus,
      hotbarNotice,
      showHotbarNotice,
      sleepFade,
      setSleepFade,
      activeSlot,
      activeWorldId,
      selectSlot,
      returnToOverworld,
      motion,
      toggleMotionPreset,
      setMotionSpeed,
      setMotionDensity,
      setAllMotionPresets,
      resetMotion,
      toasts,
      unlockedAchievements,
      unlockAchievement,
      dismissToast,
      srAnnouncement,
      emptySlotHintSlot,
      flashEmptySlot,
    }),
    [
      locale,
      toggleLocale,
      timeOfDay,
      timePhase,
      syncTimePhase,
      timeJumpSeq,
      timeJumpTo,
      toggleTimeOfDay,
      audioMuted,
      toggleAudioMuted,
      sailingMode,
      setSailingMode,
      focusedLandmark,
      nearbyLandmark,
      cameraCommand,
      requestCameraFocus,
      hotbarNotice,
      showHotbarNotice,
      sleepFade,
      activeSlot,
      activeWorldId,
      selectSlot,
      returnToOverworld,
      motion,
      toggleMotionPreset,
      setMotionSpeed,
      setMotionDensity,
      setAllMotionPresets,
      resetMotion,
      toasts,
      unlockedAchievements,
      unlockAchievement,
      dismissToast,
      srAnnouncement,
      emptySlotHintSlot,
      flashEmptySlot,
    ],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) {
    throw new Error('useWorld must be used within a WorldProvider');
  }
  return ctx;
}
