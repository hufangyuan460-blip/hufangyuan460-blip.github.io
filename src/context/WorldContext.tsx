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
import { ACHIEVEMENTS, UI_TEXT } from '../i18n';
import type {
  AchievementId,
  AchievementToastItem,
  HotbarSlotNumber,
  Locale,
  MotionPresets,
  MotionSettings,
  TimeOfDay,
} from '../worlds/types';

export const DEFAULT_MOTION_SETTINGS: MotionSettings = {
  presets: {
    oreOrbit: true,
    portalVortex: false,
    blockWave: false,
  },
  speed: 1.0,
  density: 0.65,
};

interface WorldContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  timeOfDay: TimeOfDay;
  toggleTimeOfDay: () => void;
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
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
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
  const localeRef = useRef<Locale>(locale);
  localeRef.current = locale;

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
    setLocale((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  const toggleTimeOfDay = useCallback(() => {
    setTimeOfDay((prev) => (prev === 'day' ? 'night' : 'day'));
    unlockAchievement('night-owl');
  }, [unlockAchievement]);

  const selectSlot = useCallback((slot: HotbarSlotNumber, worldId: string) => {
    setActiveSlot(slot);
    setActiveWorldId(worldId);
    setEmptySlotHintSlot(null);
  }, []);

  const returnToOverworld = useCallback(() => {
    setActiveSlot(1);
    setActiveWorldId('overworld');
    setEmptySlotHintSlot(null);
  }, []);

  const flashEmptySlot = useCallback((slot: HotbarSlotNumber) => {
    setEmptySlotHintSlot(slot);
    if (emptySlotTimerRef.current !== null) {
      window.clearTimeout(emptySlotTimerRef.current);
    }
    emptySlotTimerRef.current = window.setTimeout(() => {
      setEmptySlotHintSlot(null);
    }, 2200);
  }, []);

  const toggleMotionPreset = useCallback((preset: keyof MotionPresets) => {
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
    setMotion(DEFAULT_MOTION_SETTINGS);
  }, []);

  const value = useMemo<WorldContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      timeOfDay,
      toggleTimeOfDay,
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
      toggleTimeOfDay,
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
