import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChartColumn,
  Plus,
  Trash2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Check,
  X,
  Pencil,
  Tags,
  CalendarClock,
  Palette,
  Cloud,
  LogIn,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./services/supabase";
import { layoutCalendarItems } from "./services/calendarLayout";

import type { Task } from "./components/StudyTasks";
import { useWorkspaceSync } from "./hooks/useWorkspaceSync";
import StudyTasks from "./components/StudyTasks";
import type { FocusPreferences } from "./components/FocusTimer";
import FocusTimer from "./components/FocusTimer";
import { listAppearanceThemes, saveAppearanceTheme, deleteAppearanceTheme } from "./services/appearanceThemes";
import type { AppearanceTheme } from "./services/appearanceThemes";

type Entry = {
  id: string;
  date: string;
  course: string;
  start: string;
  end: string;
  notes: string;
  status?: "draft" | "submitted";
};
type StudySessionRow = {
  id: string;
  user_id: string;
  course: string;
  description: string;
  start_time: string;
  end_time: string;
  created_at: string;
  status: "draft" | "submitted";
};
type CalendarColorTheme = { id: string; label: string; colors: string[]; overrides: Record<string, string>; categoryColors?: Record<string, string> };
const loadColorSetting = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
};
type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay?: boolean;
  htmlLink?: string;
  calendarName: string;
  textColor?: string;
  calendarId: string;
  eventId: string;
  etag?: string;
  recurring?: boolean;
  seriesId?: string;
  editable?: boolean;
  color?: string;
};
type View = "timesheet" | "analytics" | "tasks" | "appearance";
type GoogleTokenResponse = { access_token?: string; error?: string };
type TokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}
const DEFAULT_CATEGORIES = [
  "CMSC414",
  "CMSC422",
  "CMSC416",
  "BMIN210",
  "BMIN305",
  "BMIN395",
  "Personal study",
  "Other",
];
const COLORS = [
  "#c7c7c7",
  "#a8a8a8",
  "#8e8e8e",
  "#d7d7d7",
  "#b8b8b8",
  "#707070",
  "#999999",
  "#e1e1e1",
];
// Google Calendar's legacy API presets differ from its current web palette.
// Only translate an exact preset ID/value pair; retain custom RGB colors.
const GOOGLE_CALENDAR_PRESETS: Record<string, { api: string; web: string }> = {
  "10": { api: "#b3dc6c", web: "#c0ca33" },
  "20": { api: "#cabdbf", web: "#a79b8e" },
  "21": { api: "#cca6ac", web: "#ad1457" },
};
const googleCalendarBackground = (calendar: { colorId?: string; backgroundColor?: string }) => {
  const preset = calendar.colorId ? GOOGLE_CALENDAR_PRESETS[calendar.colorId] : undefined;
  return preset && calendar.backgroundColor?.toLowerCase() === preset.api
    ? preset.web
    : calendar.backgroundColor;
};
const CATEGORY_THEMES = {
  soft: { label: "Soft", colors: ["#cbdcc5", "#d8cce5", "#f0d9bf", "#c7dce6", "#e8c9ce", "#dddcb8"], calendar: "#c7dce6" },
  vivid: { label: "Vivid", colors: ["#387568", "#7e5ba4", "#c07835", "#366f9b", "#b64d69", "#828c37"], calendar: "#366f9b" },
  neutral: { label: "Neutral", colors: ["#c7c7c7", "#a8a8a8", "#8e8e8e", "#d7d7d7", "#b8b8b8", "#707070"], calendar: "#b8b8b8" },
} as const;
const THEMES = {
  forest: {
    label: "Forest",
    background: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=80",
    sidebar: "#18342d",
    sidebarActive: "#2a4940",
    primary: "#2f725f",
    primaryHover: "#245b4c",
    highlight: "#d1ef73",
    logoBackground: "#2a4940",
    logoForeground: "#d1ef73",
    studyBackground: "#e9f1d8",
    studyBorder: "#7d982f",
    studyText: "#354421",
    submittedBackground: "#dcefe5",
    submittedBorder: "#318263",
    submittedText: "#244c3c",
  },
  ocean: {
    label: "Ocean",
    background: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=80",
    sidebar: "#17384b",
    sidebarActive: "#2a5265",
    primary: "#2b7189",
    primaryHover: "#205a70",
    highlight: "#9ee6d7",
    logoBackground: "#2a5265",
    logoForeground: "#9ee6d7",
    studyBackground: "#dceef3",
    studyBorder: "#397f9a",
    studyText: "#294c59",
    submittedBackground: "#d9eee8",
    submittedBorder: "#318778",
    submittedText: "#254d47",
  },
  berry: {
    label: "Berry",
    background: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=2400&q=80",
    sidebar: "#44314d",
    sidebarActive: "#5e4268",
    primary: "#8a557f",
    primaryHover: "#714365",
    highlight: "#efb8d2",
    logoBackground: "#5e4268",
    logoForeground: "#efb8d2",
    studyBackground: "#f4e3ef",
    studyBorder: "#a55d91",
    studyText: "#563c52",
    submittedBackground: "#e7e9f4",
    submittedBorder: "#6e75a2",
    submittedText: "#3e456c",
  },
  amber: {
    label: "Amber",
    background: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=2400&q=80",
    sidebar: "#4a3926",
    sidebarActive: "#68502d",
    primary: "#a66b2b",
    primaryHover: "#875521",
    highlight: "#f3cc68",
    logoBackground: "#68502d",
    logoForeground: "#f3cc68",
    studyBackground: "#f7ecd5",
    studyBorder: "#b47a2c",
    studyText: "#5a4628",
    submittedBackground: "#e2efe2",
    submittedBorder: "#60896b",
    submittedText: "#344f3a",
  },
} as const;
type ThemeName = keyof typeof THEMES;
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monday = (d: Date) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const hours = (entry: Entry) =>
  Math.max(0, (minutes(entry.end) - minutes(entry.start)) / 60);
const hhmm = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const entryToSessionRow = (entry: Entry, userId: string) => ({
  id: entry.id,
  user_id: userId,
  course: entry.course,
  description: entry.notes,
  status: entry.status || "draft",
  start_time: new Date(`${entry.date}T${entry.start}:00`).toISOString(),
  end_time: new Date(`${entry.date}T${entry.end}:00`).toISOString(),
});
const sessionRowToEntry = (row: StudySessionRow): Entry => {
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  return {
    id: row.id,
    date: iso(start),
    course: row.course,
    start: hhmm(start),
    end: hhmm(end),
    notes: row.description || "",
    status: row.status,
  };
};
const saveLocalSetting = (key: string, value: string) => {
  if (supabase) return;
  try { localStorage.setItem(key, value); } catch { /* Cloud settings remain authoritative when configured. */ }
};
const removeLocalSetting = (key: string) => {
  if (supabase) return;
  try { localStorage.removeItem(key); } catch { /* Keep the current setting in memory. */ }
};
const loadEntries = (): Entry[] => {
  try {
    return JSON.parse(
      localStorage.getItem("studyday.entries") || "[]",
    ) as Entry[];
  } catch {
    return [];
  }
};
const loadCategories = (): string[] => {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("studyday.categories") || "null",
    );
    if (Array.isArray(saved)) {
      const categories = saved.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );
      if (categories.length) return [...new Set(categories)];
    }
  } catch {
    return DEFAULT_CATEGORIES;
  }
  return DEFAULT_CATEGORIES;
};
const loadCategoryColors = (): Record<string, string> => {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("studyday.categoryColors") || "{}",
    );
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return Object.fromEntries(
        Object.entries(saved).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && /^#[\da-f]{6}$/i.test(entry[1]),
        ),
      );
    }
  } catch {
    return {};
  }
  return {};
};
const dateFrom = (value: string) => new Date(`${value}T12:00:00`);
const formatHours = (value: number) => `${value.toFixed(1)}h`;
const GRID_START = 0;
const GRID_END = 24;
const HOUR_HEIGHT = 64;
const clockLabel = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric" });
const readableText = (hex: string) => {
  const channels = hex.replace("#", "").match(/.{2}/g)?.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  if (!channels || channels.length !== 3) return "#000000";
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#ffffff";
};
const hexWithAlpha = (hex: string, alpha: number) => {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

function ColorField({ value, onChange, label, id }: { value: string; onChange: (color: string) => void; label: string; id?: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = /^#[0-9a-fA-F]{6}$/.test(draft);
  return <span className="color-field">
    <input id={id} type="color" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} />
    <input className="color-hex-field" type="text" value={draft} aria-label={`${label} hex code`}
      placeholder="#ffd1dc" maxLength={7} spellCheck={false} aria-invalid={!valid}
      onChange={(event) => {
        const next = event.target.value; setDraft(next);
        if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next.toLowerCase());
      }} onBlur={() => { if (!valid) setDraft(value); }}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
  </span>;
}

function InspirationNote({ background, note, setNote }: { background: string; note: string; setNote: (value: string) => void }) {
  return <section className="inspiration-note" style={{ backgroundColor: background, color: readableText(background) }} aria-labelledby="inspiration-title">
    <div className="inspiration-heading"><h2 id="inspiration-title">Note to self</h2></div>
    <textarea aria-label="Your inspiration message" value={note} maxLength={600} rows={5}
      placeholder="write a note!" onChange={(event) => setNote(event.target.value)} />

  </section>;
}

function StudydayBrand() {
  return (<div className="brand">
          <span className="brand-icon"><CalendarClock size={23} /></span>
          <span>studyday<small>STUDY TIMESHEET</small></span>
        </div>);
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>(loadEntries);
  const sessionRevision = useRef(0);
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    loadCategoryColors,
  );
  const [view, setView] = useState<View>("timesheet");
  const [categoryRange, setCategoryRange] = useState<"day" | "week">("week");
  const [categoryDay, setCategoryDay] = useState(iso(new Date()));
  const [week, setWeek] = useState(() => monday(new Date()));
  const [course, setCourse] = useState(DEFAULT_CATEGORIES[0]);
  const [date, setDate] = useState(iso(new Date()));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [goal, setGoal] = useState(() =>
    Number(localStorage.getItem("studyday.goal") || 20),
  );
  const [focusPreferences, setFocusPreferences] = useState<FocusPreferences>(() => loadColorSetting("studyday.focusPreferences", { mode: "countdown", duration: 30, focusMinutes: 25, breakMinutes: 5 }));
  const [taskData, setTaskData] = useState<{ tasks: Task[] }>(() => !supabase ? loadColorSetting("studyday.tasks.local", { tasks: [] }) : { tasks: [] });
  const [inspirationNote, setInspirationNote] = useState(() => !supabase ? localStorage.getItem("studyday.inspiration.local") || "" : "");
  const [goalInput, setGoalInput] = useState(() => String(goal));

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<"signin" | "signup">("signin");
  const [submittingWeek, setSubmittingWeek] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(!supabase);
  const [cloudError, setCloudError] = useState("");
  const [cloudStatus, setCloudStatus] = useState("");
  const [googleColorOverrides, setGoogleColorOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("studyday.googleColorOverrides") || "{}");
      const entries = Object.entries(saved).filter((entry): entry is [string, string] =>
        typeof entry[1] === "string" && (entry[1] === "google" || /^#[0-9a-fA-F]{6}$/.test(entry[1])));
      return Object.fromEntries(entries);
    } catch { return {}; }
  });
  useEffect(() => {
    saveLocalSetting("studyday.googleColorOverrides", JSON.stringify(googleColorOverrides));
  }, [googleColorOverrides]);
  const googleColorKey = (event: CalEvent) => JSON.stringify([event.calendarId, event.seriesId || event.eventId]);
  const [editingGoogle, setEditingGoogle] = useState<CalEvent | null>(null);
  const [googleDraft, setGoogleDraft] = useState({ title: "", start: "", end: "" });
  const [googleSaveError, setGoogleSaveError] = useState("");
  const [googleSaving, setGoogleSaving] = useState(false);
  const openGoogleEditor = (event: CalEvent) => {
    const localTime = (value: string) => { const date = new Date(value); return `${iso(date)}T${hhmm(date)}`; };
    setGoogleDraft({ title: event.summary, start: event.allDay ? event.start : localTime(event.start), end: event.allDay ? event.end : localTime(event.end) });
    setGoogleSaveError("");
    setEditingGoogle(event);
  };
  const [showCalendar, setShowCalendar] = useState(true);
  const [useGoogleColors, setUseGoogleColors] = useState(() =>
    localStorage.getItem("studyday.useGoogleColors") !== "false");
  useEffect(() => {
    saveLocalSetting("studyday.useGoogleColors", String(useGoogleColors));
  }, [useGoogleColors]);
  const [googleEventColor, setGoogleEventColor] = useState(() => {
    const saved = localStorage.getItem("studyday.googleEventColor");
    return saved && /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : "#f8e9e2";
  });
  useEffect(() => {
    saveLocalSetting("studyday.googleEventColor", googleEventColor);
  }, [googleEventColor]);
  const [calendarThemesOpen, setCalendarThemesOpen] = useState(false);
  const [calendarThemeName, setCalendarThemeName] = useState("");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingThemeColors, setEditingThemeColors] = useState<string[]>([]);
  const [calendarPalette, setCalendarPalette] = useState<string[]>(() => loadColorSetting("studyday.calendarPalette", [...CATEGORY_THEMES.soft.colors]));
  const [savedCalendarThemes, setSavedCalendarThemes] = useState<CalendarColorTheme[]>(() => loadColorSetting("studyday.savedCalendarThemes", []));
  const [calendarSeriesSlots, setCalendarSeriesSlots] = useState<Record<string, number>>(() => loadColorSetting("studyday.calendarSeriesSlots", {}));
  const [calendarThemeError, setCalendarThemeError] = useState("");
  useEffect(() => { saveLocalSetting("studyday.calendarPalette", JSON.stringify(calendarPalette)); }, [calendarPalette]);
  useEffect(() => { saveLocalSetting("studyday.savedCalendarThemes", JSON.stringify(savedCalendarThemes)); }, [savedCalendarThemes]);
  useEffect(() => { saveLocalSetting("studyday.calendarSeriesSlots", JSON.stringify(calendarSeriesSlots)); }, [calendarSeriesSlots]);
  useEffect(() => {
    setCalendarSeriesSlots((current) => {
      const next = { ...current };
      let changed = false;
      let slot = Math.max(-1, ...Object.values(current)) + 1;
      for (const key of [...new Set(events.map(googleColorKey))].sort()) {
        if (!(key in next)) { next[key] = slot++; changed = true; }
      }
      return changed ? next : current;
    });
  }, [events]);
  const applyCalendarTheme = (colors: readonly string[], overrides: Record<string, string> = {}, savedCategoryColors: Record<string, string> = {}) => {
    const names = [...new Set([...categories, ...entries.map((entry) => entry.course)])];
    setCategoryColors(Object.fromEntries(names.map((name, index) => [name, savedCategoryColors[name] || colors[index % colors.length]])));
    setCalendarPalette([...colors]);
    setGoogleColorOverrides({ ...overrides });
    setUseGoogleColors(false);
  };
  const googleAppearance = (event: CalEvent) => {
    const override = googleColorOverrides[googleColorKey(event)];
    const customColor = override && override !== "google" ? override : undefined;
    const useOriginal = override === "google" || (!customColor && useGoogleColors);
    const seriesColor = calendarPalette[(calendarSeriesSlots[googleColorKey(event)] ?? 0) % calendarPalette.length];
    const color = customColor || (useOriginal && event.color) || seriesColor || googleEventColor;
    return { backgroundColor: color, color: useOriginal ? event.textColor || readableText(color) : readableText(color) };
  };
  const usedEventColors = [...new Set([
    ...events.map((event) => googleAppearance(event).backgroundColor),
    ...entries.map((entry) => categoryColors[entry.course] || COLORS[Math.max(0, categories.indexOf(entry.course)) % COLORS.length]),
  ].map((color) => color.toLowerCase()))];
  const calendarScrollRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollTop = (7 - GRID_START) * HOUR_HEIGHT;
  }, []);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryThemesOpen, setCategoryThemesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("studyday.theme");
    return saved && saved in THEMES ? (saved as ThemeName) : "forest";
  });
  const [wallpaper, setWallpaper] = useState(
    () => localStorage.getItem("studyday.wallpaper") || "",
  );
  const [wallpaperTint, setWallpaperTint] = useState(
    () => localStorage.getItem("studyday.wallpaperTint") || "#f5f5f5",
  );
  const [wallpaperTintStrength, setWallpaperTintStrength] = useState(() =>
    Number(localStorage.getItem("studyday.wallpaperTintStrength") || 82),
  );
  const [bannerColor, setBannerColor] = useState(
    () => localStorage.getItem("studyday.bannerColor") || "",
  );
  const [bannerColorInput, setBannerColorInput] = useState(
    () => localStorage.getItem("studyday.bannerColor") || "#242424",
  );
  const [appearanceError, setAppearanceError] = useState("");
  const [savedAppearances, setSavedAppearances] = useState<AppearanceTheme[]>([]);
  const [appearanceName, setAppearanceName] = useState("");
  const [editingAppearanceId, setEditingAppearanceId] = useState<string | null>(null);
  const [appearanceBusy, setAppearanceBusy] = useState(false);
  const [appearancesLoaded, setAppearancesLoaded] = useState(false);
  useEffect(() => {
    setGoogleToken(null); setEvents([]); setEditingGoogle(null);
  }, [authUser?.id]);
  const applyAppearance = (item: AppearanceTheme) => {
    setTheme(item.theme); setWallpaper(item.wallpaper);
    setBannerColor(item.bannerColor); setBannerColorInput(item.bannerColor || THEMES[item.theme].sidebar);
    setWallpaperTint(item.tint); setWallpaperTintStrength(item.overlay);
  };
  const saveCurrentAppearance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (appearanceBusy) return;
    const name = appearanceName.trim();
    if (!name) { setAppearanceError("Name your appearance theme."); return; }
    if (savedAppearances.some((item) => item.id !== editingAppearanceId && item.name.toLowerCase() === name.toLowerCase())) { setAppearanceError("A theme already uses that name."); return; }
    setAppearanceBusy(true); setAppearanceError("");
    const item: AppearanceTheme = { id: editingAppearanceId || crypto.randomUUID(), name, theme, wallpaper, bannerColor: bannerColor || THEMES[theme].sidebar, tint: wallpaperTint, overlay: wallpaperTintStrength };
    try {
      if (!supabase) await saveAppearanceTheme(item);
      setSavedAppearances((current) => [...current.filter((saved) => saved.id !== item.id), item]);
      setEditingAppearanceId(null); setAppearanceName("");
    } catch { setAppearanceError("Could not save this theme. Browser storage may be full or unavailable."); }
    finally { setAppearanceBusy(false); }
  };
  const removeAppearance = async (id: string) => {
    setAppearanceBusy(true);
    try {
      if (!supabase) await deleteAppearanceTheme(id);
      setSavedAppearances((current) => current.filter((item) => item.id !== id));
      if (editingAppearanceId === id) { setEditingAppearanceId(null); setAppearanceName(""); }
    } catch { setAppearanceError("Could not delete this theme. Please try again."); }
    finally { setAppearanceBusy(false); }
  };
  const workspace = { categories, categoryColors, goal, theme, wallpaper, wallpaperTint, wallpaperTintStrength, bannerColor,
    googleColorOverrides, useGoogleColors, googleEventColor, calendarPalette, savedCalendarThemes, calendarSeriesSlots,
    savedAppearances, taskData, inspirationNote, focusPreferences };
  const workspaceSync = useWorkspaceSync(authUser?.id, workspace, {
    categories: DEFAULT_CATEGORIES, categoryColors: {}, goal: 20, theme: "forest" as ThemeName, wallpaper: "", wallpaperTint: "#f5f5f5",
    wallpaperTintStrength: 82, bannerColor: "", googleColorOverrides: {}, useGoogleColors: true, googleEventColor: "#f8e9e2",
    calendarPalette: [...CATEGORY_THEMES.soft.colors], savedCalendarThemes: [], calendarSeriesSlots: {}, savedAppearances: [], taskData: { tasks: [] }, inspirationNote: "", focusPreferences: { mode: "countdown", duration: 30, focusMinutes: 25, breakMinutes: 5 },
  }, (value) => {
    setCategories(value.categories); setCategoryColors(value.categoryColors); setGoal(value.goal); setGoalInput(String(value.goal));
    setTheme(value.theme); setWallpaper(value.wallpaper); setWallpaperTint(value.wallpaperTint); setWallpaperTintStrength(value.wallpaperTintStrength);
    setBannerColor(value.bannerColor); setBannerColorInput(value.bannerColor || THEMES[value.theme].sidebar);
    setGoogleColorOverrides(value.googleColorOverrides); setUseGoogleColors(value.useGoogleColors); setGoogleEventColor(value.googleEventColor);
    setCalendarPalette(value.calendarPalette); setSavedCalendarThemes(value.savedCalendarThemes); setCalendarSeriesSlots(value.calendarSeriesSlots);
    setSavedAppearances(value.savedAppearances); setAppearancesLoaded(true); setTaskData(value.taskData); setInspirationNote(value.inspirationNote); setFocusPreferences(value.focusPreferences);
  }, async () => {
    const legacyNote = localStorage.getItem(`studyday.inspiration.${authUser?.id}`) || "";
    return { savedAppearances: await listAppearanceThemes(), taskData: loadColorSetting(`studyday.tasks.${authUser?.id}`, { tasks: [] }),
      inspirationNote: legacyNote === "One session at a time. Your effort counts." ? "" : legacyNote };
  });
  useEffect(() => {
    if (supabase) return;
    void listAppearanceThemes().then((items) => { setSavedAppearances(items); setAppearancesLoaded(true); });
  }, []);
  useEffect(() => {
    if (supabase) return;
    saveLocalSetting("studyday.tasks.local", JSON.stringify(taskData));
    saveLocalSetting("studyday.inspiration.local", inspirationNote);
    saveLocalSetting("studyday.focusPreferences", JSON.stringify(focusPreferences));
  }, [taskData, inspirationNote, focusPreferences]);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const palette = THEMES[theme];
  useEffect(() => {
    if (!supabase)
      saveLocalSetting("studyday.entries", JSON.stringify(entries));
  }, [entries]);
  useEffect(
    () => saveLocalSetting("studyday.categories", JSON.stringify(categories)),
    [categories],
  );
  useEffect(
    () =>
      saveLocalSetting(
        "studyday.categoryColors",
        JSON.stringify(categoryColors),
      ),
    [categoryColors],
  );
  useEffect(() => saveLocalSetting("studyday.theme", theme), [theme]);
  useEffect(() => {
    if (wallpaper) saveLocalSetting("studyday.wallpaper", wallpaper);
    else removeLocalSetting("studyday.wallpaper");
  }, [wallpaper]);
  useEffect(
    () => saveLocalSetting("studyday.wallpaperTint", wallpaperTint),
    [wallpaperTint],
  );
  useEffect(
    () =>
      saveLocalSetting(
        "studyday.wallpaperTintStrength",
        String(wallpaperTintStrength),
      ),
    [wallpaperTintStrength],
  );
  useEffect(() => {
    if (bannerColor) saveLocalSetting("studyday.bannerColor", bannerColor);
    else removeLocalSetting("studyday.bannerColor");
  }, [bannerColor]);
  useEffect(() => {
    if (!bannerColor) setBannerColorInput(THEMES[theme].sidebar);
  }, [bannerColor, theme]);
  useEffect(() => saveLocalSetting("studyday.goal", String(goal)), [goal]);
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setCloudStatus("Local-only mode. Add Supabase environment variables to sync.");
      return;
    }
    let active = true;
    const auth = supabase.auth;
    // Callback failures are returned by initialize(), not necessarily getSession().
    void auth
      .initialize()
      .then(async ({ error }) => {
        if (error) throw error;
        return auth.getSession();
      })
      .then(({ data, error }) => {
        if (!active) return;
        if (error)
          setCloudError(`Could not restore Supabase session: ${error.message}`);
        setAuthUser(data.session?.user ?? null);
        setAuthLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCloudError(
          `Google sign-in or session restoration failed: ${error instanceof Error ? error.message : "Network error."}`,
        );
        setAuthLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
      if (session) setCloudError("");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    setShowEntryForm(false);
    setEditingEntryId(null);
    if (!supabase || !authUser) {
      if (supabase) setEntries(loadEntries());
      setSessionsLoading(false);
      setSessionsLoaded(!supabase);
      return;
    }
    let active = true;
    setEntries([]);
    const client = supabase;
    setSessionsLoading(true);
    setSessionsLoaded(false);
    setCloudError("");
    setCloudStatus("Loading your cloud sessions…");
    let refreshing = false;
    const refreshSessions = async () => {
      if (refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      const revision = sessionRevision.current;
      try {
        const { data, error } = await client
          .from("study_sessions")
          .select("id,user_id,course,description,start_time,end_time,created_at,status")
          .eq("user_id", authUser.id)
          .order("start_time", { ascending: false });
        if (!active || revision !== sessionRevision.current) return;
        if (error) {
          setCloudError(`Could not load study sessions: ${error.message}`);
          setCloudStatus("Cloud sync needs attention");
          return;
        }
        const rows = (data || []) as StudySessionRow[];
        setEntries(rows.map(sessionRowToEntry));
        setSessionsLoaded(true);
        setCloudError("");
        setCloudStatus("Synced");
      } catch (error) {
        if (!active) return;
        setCloudError(
          `Could not load study sessions: ${error instanceof Error ? error.message : "Network error."}`,
        );
        setCloudStatus("Cloud sync needs attention");
      } finally {
        refreshing = false;
        if (active) setSessionsLoading(false);
      }
    };
    const refreshVisibleSessions = () => void refreshSessions();
    void refreshSessions();
    const refreshInterval = window.setInterval(refreshVisibleSessions, 30_000);
    window.addEventListener("focus", refreshVisibleSessions);
    window.addEventListener("online", refreshVisibleSessions);
    document.addEventListener("visibilitychange", refreshVisibleSessions);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshVisibleSessions);
      window.removeEventListener("online", refreshVisibleSessions);
      document.removeEventListener("visibilitychange", refreshVisibleSessions);
    };
  }, [authUser?.id]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(week);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [week],
  );
  const weekEntries = entries.filter(
    (e) => e.date >= iso(days[0]) && e.date <= iso(days[6]),
  );
  const draftEntries = weekEntries.filter((entry) => entry.status !== "submitted");
  const total = weekEntries.reduce((sum, e) => sum + hours(e), 0);
  const categoryEntries = categoryRange === "day" ? entries.filter((entry) => entry.date === categoryDay) : weekEntries;
  const grouped = [...new Set([...categories, ...categoryEntries.map((entry) => entry.course)])].map((name, i) => ({
    name,
    color: categoryColors[name] || COLORS[i % COLORS.length],
    value: categoryEntries
      .filter((e) => e.course === name)
      .reduce((sum, e) => sum + hours(e), 0),
  })).filter((x) => x.value > 0);
  const progressData = days.map((day) => {
    const key = iso(day);
    const dailyHours = weekEntries
      .filter((entry) => entry.date === key)
      .reduce((sum, entry) => sum + hours(entry), 0);
    return {
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      actual: Number(dailyHours.toFixed(2)),
      target: Number((goal / 7).toFixed(2)),
    };
  });
  const moveWeek = (delta: number) =>
    setWeek((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  const openEntryForm = (day: string, hour = 9) => {
    setEditingEntryId(null);
    setDate(day);
    setStart(`${String(hour).padStart(2, "0")}:00`);
    setEnd(
      hour === GRID_END - 1
        ? "23:59"
        : `${String(hour + 1).padStart(2, "0")}:00`,
    );
    setFormError("");
    setShowEntryForm(true);
  };
  const openEditEntry = (entry: Entry) => {
    setEditingEntryId(entry.id);
    setDate(entry.date);
    setCourse(entry.course);
    setStart(entry.start);
    setEnd(entry.end);
    setNotes(entry.notes);
    setFormError("");
    setShowEntryForm(true);
  };
  const saveStudySession = async (
    entry: Entry,
    isEditing: boolean,
  ): Promise<boolean> => {
    if (!supabase) {
      setEntries((current) =>
        isEditing
          ? current.map((item) => (item.id === entry.id ? entry : item))
          : [entry, ...current],
      );
      return true;
    }
    if (!authUser) {
      setCloudError("Sign in with Google to save study sessions to Supabase.");
      return false;
    }
    if (!sessionsLoaded) {
      setCloudError("Wait for your Supabase sessions to finish loading.");
      return false;
    }

    const row = entryToSessionRow(entry, authUser.id);
    const fields = {
      course: row.course,
      description: row.description,
      status: row.status,
      start_time: row.start_time,
      end_time: row.end_time,
    };
    try {
      const result = isEditing
        ? await supabase
            .from("study_sessions")
            .update(fields)
            .eq("id", entry.id)
            .eq("user_id", authUser.id)
            .select("id,user_id,course,description,start_time,end_time,created_at,status")
            .single()
        : await supabase
            .from("study_sessions")
            .insert(row)
            .select("id,user_id,course,description,start_time,end_time,created_at,status")
            .single();
      if (result.error) {
        setCloudError(`Could not save study session: ${result.error.message}`);
        return false;
      }
      const savedEntry = sessionRowToEntry(result.data as StudySessionRow);
      sessionRevision.current += 1;
      setEntries((current) =>
        isEditing
          ? current.map((item) => (item.id === savedEntry.id ? savedEntry : item))
          : [savedEntry, ...current],
      );
      setCloudError("");
      setCloudStatus("Synced");
      return true;
    } catch (error) {
      setCloudError(
        `Could not save study session: ${error instanceof Error ? error.message : "Network error."}`,
      );
      return false;
    }
  };
  const addEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (minutes(end) <= minutes(start)) {
      setFormError("End time must be later than start time.");
      return;
    }
    const entry: Entry = {
      id: editingEntryId || crypto.randomUUID(),
      date,
      course,
      start,
      end,
      notes: notes.trim(),
      status: "draft",
    };
    if (!(await saveStudySession(entry, Boolean(editingEntryId)))) return;
    setNotes("");
    setEditingEntryId(null);
    setShowEntryForm(false);
    setWeek(monday(dateFrom(date)));
  };
  const deleteEntry = async (entryId: string) => {
    if (supabase) {
      if (!authUser) {
        setCloudError("Sign in with Google to delete cloud study sessions.");
        return;
      }
      try {
        const { error } = await supabase
          .from("study_sessions")
          .delete()
          .eq("id", entryId)
          .eq("user_id", authUser.id);
        if (error) {
          setCloudError(`Could not delete study session: ${error.message}`);
          return;
        }
      } catch (error) {
        setCloudError(
          `Could not delete study session: ${error instanceof Error ? error.message : "Network error."}`,
        );
        return;
      }
      setCloudError("");
      setCloudStatus("Synced");
    }
    sessionRevision.current += 1;
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
    if (editingEntryId === entryId) {
      setEditingEntryId(null);
      setShowEntryForm(false);
    }
  };
  const signInWithGoogle = async () => {
    if (!supabase) {
      setCloudError("Supabase is not configured in this build.");
      return;
    }
    setAuthActionLoading(true);
    setCloudError("");
    try {
      const redirectTo = new URL(
        import.meta.env.BASE_URL,
        window.location.origin,
      ).toString();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Supabase did not return a Google sign-in URL.");
      window.location.assign(data.url);
    } catch (error) {
      setCloudError(
        `Google sign-in failed: ${error instanceof Error ? error.message : "Network error."}`,
      );
    } finally {
      setAuthActionLoading(false);
    }
  };
  const signOut = async () => {
    if (!supabase) return;
    if (workspaceSync.pending) { setCloudError("Wait for account changes to sync before signing out."); return; }
    setAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setCloudError(`Could not sign out: ${error.message}`);
        return;
      }
      setEntries(loadEntries());
      setCloudError("");
      setCloudStatus("Signed out. Cloud sessions were not changed.");
    } catch (error) {
      setCloudError(
        `Could not sign out: ${error instanceof Error ? error.message : "Network error."}`,
      );
    } finally {
      setAuthActionLoading(false);
    }
  };
  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const oldName = editingCategory;
    const name = (oldName ? categoryNameDraft : newCategoryName).trim();
    if (!name) {
      setCategoryError("Enter a category name.");
      return;
    }
    if (
      categories.some(
        (category) =>
          category.toLowerCase() === name.toLowerCase() &&
          category !== oldName,
      )
    ) {
      setCategoryError("That category already exists.");
      return;
    }
    if (oldName) {
      if (supabase && oldName !== name) {
        if (!authUser || !sessionsLoaded) {
          setCategoryError("Sign in and wait for sessions to load before renaming a category.");
          return;
        }
        try {
          const { error } = await supabase
            .from("study_sessions")
            .update({ course: name })
            .eq("user_id", authUser.id)
            .eq("course", oldName);
          if (error) throw error;
        } catch (error) {
          setCategoryError(`Could not rename category: ${error instanceof Error ? error.message : "Cloud update failed."}`);
          return;
        }
      }
      sessionRevision.current += 1;
      setCategories((current) =>
        current.map((category) => (category === oldName ? name : category)),
      );
      setEntries((current) =>
        current.map((entry) =>
          entry.course === oldName ? { ...entry, course: name } : entry,
        ),
      );
      setCategoryColors((current) => {
        const updated = { ...current };
        if (updated[oldName]) updated[name] = updated[oldName];
        if (oldName !== name) delete updated[oldName];
        return updated;
      });
      if (course === oldName) setCourse(name);
      setEditingCategory(null);
      setCategoryNameDraft("");
    } else {
      setCategories((current) => [...current, name]);
      setNewCategoryName("");
    }
    setCategoryError("");
  };
  const deleteCategory = (name: string) => {
    if (categories.length <= 1) {
      setCategoryError("Keep at least one category.");
      return;
    }
    setCategories((current) =>
      current.filter((category) => category !== name),
    );
    setCategoryColors((current) => {
      const updated = { ...current };
      delete updated[name];
      return updated;
    });
    if (course === name)
      setCourse(categories.find((category) => category !== name) || "");
    if (editingCategory === name) setEditingCategory(null);
    setCategoryError("");
  };
  const uploadWallpaper = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAppearanceError("");
    if (!file.type.startsWith("image/")) {
      setAppearanceError("Choose an image file.");
      event.target.value = "";
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1800 / bitmap.width, 1200 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not process this image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const dataUrl = canvas.toDataURL("image/webp", 0.82);
      if (dataUrl.length > 2_500_000)
        throw new Error("Choose a smaller image for your wallpaper.");
      setWallpaper(dataUrl);
    } catch (error) {
      setAppearanceError(
        error instanceof Error
          ? error.message
          : "Could not load this image. Try another one.",
      );
    } finally {
      event.target.value = "";
    }
  };
  const submitWeek = async () => {
    if (draftEntries.length === 0 || submittingWeek) return;
    const ids = draftEntries.map((entry) => entry.id);
    setSubmittingWeek(true);
    try {
      if (supabase) {
        if (!authUser || !sessionsLoaded) throw new Error("Sign in and wait for your sessions to load.");
        const { data, error } = await supabase.from("study_sessions")
          .update({ status: "submitted" })
          .eq("user_id", authUser.id)
          .in("id", ids)
          .select("id");
        if (error) throw error;
        if (data.length !== ids.length) throw new Error("Some sessions changed. Refresh and submit again.");
      }
      sessionRevision.current += 1;
      setEntries((current) => current.map((entry) =>
        ids.includes(entry.id) ? { ...entry, status: "submitted" } : entry,
      ));
      setCloudError("");
    } catch (error) {
      setCloudError(`Could not submit week: ${error instanceof Error ? error.message : "Network error."}`);
    } finally {
      setSubmittingWeek(false);
    }
  };
  const fetchCalendar = async (token: string, currentWeek: Date) => {
    setCalendarLoading(true);
    setCalendarError("");
    try {
      const first = monday(currentWeek),
        last = new Date(first);
      last.setDate(last.getDate() + 7);
      const timeMin = new Date(
        first.getFullYear(),
        first.getMonth(),
        first.getDate(),
      ).toISOString();
      const timeMax = new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate(),
      ).toISOString();
      const headers = { Authorization: `Bearer ${token}` };
      const calendars: Array<{ id: string; summary: string; backgroundColor?: string; foregroundColor?: string; colorId?: string; accessRole?: string }> = [];
      let eventColors: Record<string, { background: string; foreground?: string }> = {};
      let colorWarning = "";
      try {
        const response = await fetch("https://www.googleapis.com/calendar/v3/colors", { headers });
        if (!response.ok) throw new Error("Could not load event color overrides.");
        const colors = await response.json() as { event?: Record<string, { background: string; foreground?: string }> };
        eventColors = colors.event || {};
      } catch {
        colorWarning = "Individual event colors could not be loaded; calendar colors are shown instead.";
      }
      let calendarPageToken: string | undefined;
      do {
        const params = new URLSearchParams({ maxResults: "250" });
        if (calendarPageToken) params.set("pageToken", calendarPageToken);
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`,
          { headers },
        );
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Google session expired. Reconnect your calendar."
              : `Could not list Google calendars (${response.status}).`,
          );
        const data = (await response.json()) as {
          items?: Array<{ id: string; summary?: string; backgroundColor?: string; foregroundColor?: string; colorId?: string; accessRole?: string }>;
          nextPageToken?: string;
        };
        calendars.push(
          ...(data.items || []).map((calendar) => ({
            id: calendar.id,
            summary: calendar.summary || calendar.id,
            backgroundColor: googleCalendarBackground(calendar),
            foregroundColor: calendar.colorId && GOOGLE_CALENDAR_PRESETS[calendar.colorId]
              && calendar.backgroundColor?.toLowerCase() === GOOGLE_CALENDAR_PRESETS[calendar.colorId].api
              ? "#ffffff" : calendar.foregroundColor,
            accessRole: calendar.accessRole,
          })),
        );
        calendarPageToken = data.nextPageToken;
      } while (calendarPageToken);

      const results = await Promise.all(
        calendars.map(async (calendar) => {
          const calendarEvents: CalEvent[] = [];
          let eventPageToken: string | undefined;
          try {
            do {
              const params = new URLSearchParams({
                timeMin,
                timeMax,
                singleEvents: "true",
                orderBy: "startTime",
                maxResults: "2500",
              });
              if (eventPageToken) params.set("pageToken", eventPageToken);
              const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
                { headers },
              );
              if (!response.ok)
                throw new Error(`${calendar.summary} (${response.status})`);
              const data = (await response.json()) as {
                items?: Array<{
                  id: string;
                  summary?: string;
                  start: { dateTime?: string; date?: string };
                  end: { dateTime?: string; date?: string };
                  htmlLink?: string;
                  colorId?: string;
                  etag?: string;
                  recurringEventId?: string;
                }>;
                nextPageToken?: string;
              };
              calendarEvents.push(
                ...(data.items || [])
                  .filter(
                    (event) =>
                      (event.start.dateTime || event.start.date) &&
                      (event.end.dateTime || event.end.date),
                  )
                  .map((event) => ({
                    id: `${calendar.id}:${event.id}`,
                    summary: event.summary || "Untitled event",
                    start: event.start.dateTime || event.start.date!,
                    end: event.end.dateTime || event.end.date!,
                    allDay: Boolean(event.start.date),
                    htmlLink: event.htmlLink,
                    calendarName: calendar.summary,
                    calendarId: calendar.id,
                    eventId: event.id,
                    etag: event.etag,
                    recurring: Boolean(event.recurringEventId),
                    seriesId: event.recurringEventId,
                    editable: calendar.accessRole === "owner" || calendar.accessRole === "writer",
                    color: (event.colorId && eventColors[event.colorId]?.background) || calendar.backgroundColor || "#f8e9e2",
                    textColor: event.colorId && eventColors[event.colorId]
                      ? eventColors[event.colorId].foreground || readableText(eventColors[event.colorId].background)
                      : calendar.foregroundColor || readableText(calendar.backgroundColor || "#f8e9e2"),
                  })),
              );
              eventPageToken = data.nextPageToken;
            } while (eventPageToken);
            return { events: calendarEvents, error: "" };
          } catch (error) {
            return {
              events: calendarEvents,
              error:
                error instanceof Error
                  ? error.message
                  : `Could not load ${calendar.summary}`,
            };
          }
        }),
      );
      setEvents(results.flatMap((result) => result.events));
      const errors = results.map((result) => result.error).filter(Boolean);
      if (colorWarning) errors.push(colorWarning);
      setCalendarError(
        errors.length
          ? `Some calendars could not be loaded: ${errors.slice(0, 3).join(", ")}`
          : "",
      );
    } catch (err) {
      setCalendarError(
        err instanceof Error ? err.message : "Could not load calendar events.",
      );
    } finally {
      setCalendarLoading(false);
    }
  };
  useEffect(() => {
    if (googleToken) void fetchCalendar(googleToken, week);
  }, [googleToken, week]);
  const connectGoogle = () => {
    if (!clientId) {
      setCalendarError(
        "Set VITE_GOOGLE_CLIENT_ID in .env.local and restart Vite. See README.",
      );
      return;
    }
    if (!window.google) {
      setCalendarError("Google sign-in is still loading. Try again.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
      callback: (result) => {
        if (result.access_token) {
          setGoogleToken(result.access_token);
          setCalendarError("");
        } else setCalendarError(result.error || "Google sign-in failed.");
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  };
  const disconnectGoogle = () => {
    setEditingGoogle(null);
    if (googleToken && window.google)
      window.google.accounts.oauth2.revoke(googleToken, () => {});
    setGoogleToken(null);
    setEvents([]);
  };
  const saveGoogleEvent = async (form: React.FormEvent) => {
    form.preventDefault();
    if (!editingGoogle || !googleToken || googleSaving || !editingGoogle.editable) return;
    if (!googleDraft.title.trim() || !googleDraft.start || !googleDraft.end || googleDraft.end <= googleDraft.start) {
      setGoogleSaveError("Enter a title and an end time after the start time."); return;
    }
    setGoogleSaving(true);
    setGoogleSaveError("");
    try {
      const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(editingGoogle.calendarId)}/events/${encodeURIComponent(editingGoogle.eventId)}?sendUpdates=all`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json", ...(editingGoogle.etag ? { "If-Match": editingGoogle.etag } : {}) },
        body: JSON.stringify({ summary: googleDraft.title.trim(),
          start: editingGoogle.allDay ? { date: googleDraft.start } : { dateTime: new Date(googleDraft.start).toISOString() },
          end: editingGoogle.allDay ? { date: googleDraft.end } : { dateTime: new Date(googleDraft.end).toISOString() },
        }),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error("Reconnect Google Calendar to grant editing permission. You also need edit access to this calendar.");
        if (response.status === 412) throw new Error("This event changed in Google Calendar. Close this editor, refresh, and try again.");
        const detail = await response.json();
        throw new Error(detail.error?.message || "Could not update Google Calendar.");
      }
      const updated = await response.json();
      setEvents((current) => current.map((event) => event.id === editingGoogle.id ? { ...event,
        summary: updated.summary, start: updated.start.dateTime || updated.start.date,
        end: updated.end.dateTime || updated.end.date, etag: updated.etag,
      } : event));
      setEditingGoogle(null);
      void fetchCalendar(googleToken, week);
    } catch (error) {
      setGoogleSaveError(error instanceof Error ? error.message : "Could not save this event.");
    } finally { setGoogleSaving(false); }
  };
  const renderCalendarItem = (item: {
    id: string;
    start: string;
    end: string;
    day: string;
    title: string;
    color?: string;
    textColor?: string;
    kind: "study" | "google";
    status?: string;
    href?: string;
    onEdit?: () => void;
    lane: number;
    laneCount: number;
  }) => {
    const startDate = new Date(item.start);
    const endDate = new Date(item.end);
    const startMinute =
      iso(startDate) < item.day
        ? 0
        : startDate.getHours() * 60 + startDate.getMinutes();
    const endMinute =
      iso(endDate) > item.day
        ? GRID_END * 60
        : endDate.getHours() * 60 + endDate.getMinutes();
    const visibleStart = Math.max(startMinute, GRID_START * 60);
    const visibleEnd = Math.min(endMinute, GRID_END * 60);
    if (visibleEnd <= visibleStart) return null;
    const cardHeight = Math.max(28, ((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT - 2);
    const formatTime = (date: Date) => date.toLocaleTimeString("en-US", {
      hour: "numeric", minute: date.getMinutes() ? "2-digit" : undefined,
    }).replace(" AM", "am").replace(" PM", "pm");
    const timeLabel = `${formatTime(iso(startDate) < item.day ? new Date(`${item.day}T00:00:00`) : startDate)}–${formatTime(endDate)}`;
    const eventLabel = `${item.title} · ${timeLabel}${item.kind === "study" ? ` · ${item.status === "submitted" ? "Submitted" : "Draft"}` : ""}`;
    const style = {
      left: `calc(${(item.lane / item.laneCount) * 100}% + 3px)`,
      width: `calc(${Math.min(1.5 / item.laneCount, 1 - item.lane / item.laneCount) * 100}% - 6px)`,
      right: "auto",
      zIndex: 2 + item.lane,
      top: `${((visibleStart - GRID_START * 60) / 60) * HOUR_HEIGHT}px`,
      height: `${cardHeight}px`,
      ...(item.color
        ? {
            backgroundColor: item.color,
            borderLeftColor: item.color,
            color: item.textColor || readableText(item.color),
          }
        : {}),
    };
    const className = `calendar-event ${item.kind === "study" ? "study-event" : "google-event"} ${item.status === "submitted" ? "is-submitted" : ""} ${cardHeight < 40 ? "event-compact" : ""}`;
    const content = (
      <>
        <b>{item.title}</b>
        {cardHeight >= 40 && <span className="event-time">{timeLabel}</span>}
        {item.kind === "study" && cardHeight >= 56 && (
          <small className="event-status">
            {item.status === "submitted" && <Check size={9} aria-hidden="true" />}
            {item.status === "submitted" ? "Submitted" : "Draft"}
          </small>
        )}
      </>
    );
    if (item.onEdit)
      return (
        <button
          key={item.id}
          type="button"
          className={className}
          style={style}
          title={eventLabel}
          aria-label={`Edit ${eventLabel}`}
          onClick={item.onEdit}
        >
          {content}
        </button>
      );
    return item.href ? (
      <a
        key={item.id}
        className={className}
        style={style}
        href={item.href}
        target="_blank"
        rel="noreferrer"
        title={eventLabel}
      >
        {content}
      </a>
    ) : (
      <div key={item.id} className={className} style={style} title={eventLabel}>
        {content}
      </div>
    );
  };
  const chartColor = bannerColor || palette.sidebar;
  const chartGoalColor = `color-mix(in srgb, ${chartColor} 65%, #263247)`;
  const appStyle = {
    "--sidebar-bg": bannerColor || palette.sidebar,
    "--sidebar-fg": readableText(bannerColor || palette.sidebar),
    "--sidebar-active": `color-mix(in srgb, ${bannerColor || palette.sidebar} 80%, ${readableText(bannerColor || palette.sidebar)})`,
    "--sidebar-muted": `color-mix(in srgb, ${readableText(bannerColor || palette.sidebar)} 72%, transparent)`,
    "--primary": bannerColor || palette.sidebar,
    "--primary-text": readableText(bannerColor || palette.sidebar),
    "--primary-hover": `color-mix(in srgb, ${bannerColor || palette.sidebar} 94%, ${readableText(bannerColor || palette.sidebar)})`,
    "--highlight": palette.highlight,
    "--logo-bg": "#ffffff",
    "--logo-fg": "#171b1e",
    "--study-bg": palette.studyBackground,
    "--study-border": palette.studyBorder,
    "--study-text": palette.studyText,
    "--submitted-bg": palette.submittedBackground,
    "--submitted-border": palette.submittedBorder,
    "--submitted-text": palette.submittedText,
    backgroundImage: `linear-gradient(${hexWithAlpha(wallpaperTint, wallpaperTintStrength / 100)}, ${hexWithAlpha(wallpaperTint, Math.min(0.96, wallpaperTintStrength / 100 + 0.08))}), url("${wallpaper || palette.background}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  } as React.CSSProperties;
  if (supabase && !authUser) return (
    <main className="welcome-page" style={{ "--logo-bg": "#ffffff", "--logo-fg": "#171b1e" } as React.CSSProperties}>
      <div className="welcome-shell">
        <header className="welcome-header">
          <StudydayBrand />
        </header>
        <div className="welcome-body">
          <section className="welcome-account" aria-labelledby="account-title">
            <div className="welcome-tabs" aria-label="Account options">
              <button type="button" aria-pressed={welcomeMode === "signin"} onClick={() => setWelcomeMode("signin")}>Sign in</button>
              <button type="button" aria-pressed={welcomeMode === "signup"} onClick={() => setWelcomeMode("signup")}>Create account</button>
            </div>
            <h2 id="account-title">{welcomeMode === "signin" ? "Welcome to Studyday" : "Create your Studyday account"}</h2>
            <p>Study hours tracked like work ones</p>
            <button className="welcome-google" type="button" disabled={authLoading || authActionLoading} onClick={() => void signInWithGoogle()}>
              <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H3.06v2.6A10 10 0 0 0 12 22ZM6.41 13.91A6 6 0 0 1 6.1 12c0-.66.11-1.3.31-1.91v-2.6H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.51l3.35-2.6ZM12 5.96c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.6C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>
              {authLoading ? "Restoring your session…" : authActionLoading ? "Opening Google…" : "Continue with Google"}
            </button>
        {cloudError && <p className="error" role="alert">{cloudError}</p>}
            <small>{welcomeMode === "signin" ? "Use the Google account you study with." : "Your Google account is all you need. No new password."}</small>

          </section>
        </div>
        <footer className="welcome-footer">Your study sessions stay saved across devices.</footer>
      </div>
    </main>
  );
  if (supabase && authUser && !workspaceSync.ready) return <main className="welcome-page">
    <StudydayBrand /><section className="panel" style={{ maxWidth: 600, margin: "60px auto" }}>
      <h1>Loading your workspace</h1><p>{workspaceSync.error || workspaceSync.status}</p>
      <button className="secondary" onClick={() => void signOut()}>Sign out</button>
      {workspaceSync.error && <button className="secondary" onClick={workspaceSync.retry}>Retry account sync</button>}
    </section>
  </main>;
  return (
    <div className="app-shell" style={appStyle}>
      <aside className="sidebar">
        <StudydayBrand />
        <div className="sidebar-heading">WORKSPACE</div>
        <nav>
          <button
            className={view === "timesheet" ? "active" : ""}
            onClick={() => setView("timesheet")}
          >
            <CalendarDays size={18} /> Timesheet
          </button>
          <button
            className={view === "analytics" ? "active" : ""}
            onClick={() => setView("analytics")}
          >
            <ChartColumn size={18} /> Analytics
          </button>
          <button
            className={view === "tasks" ? "active" : ""}
            onClick={() => setView("tasks")}
          >
            <BookOpen size={18} /> To-do
          </button>
          <button className={view === "appearance" ? "active" : ""} onClick={() => {
            setAppearanceError("");
            setView("appearance");
          }}>
            <Palette size={18} /> Appearance
          </button>
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          {authUser
            ? "Study sessions sync to Supabase"
            : supabase
              ? "Local sessions"
              : "Local-only mode"}
          <small>
            {authUser
              ? "Account settings sync across devices"
              : cloudStatus ||
                (supabase ? "Sign in to sync sessions" : "Supabase is not configured")}
          </small>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>
              {view === "timesheet"
                ? "Study Planner"
                : view === "analytics"
                  ? "Study Analytics"
                  : view === "appearance" ? "Appearance" : "To-do"}
            </h1>
            <p>
              {view === "timesheet"
                ? "Schedule sessions, track your hours, and submit your week because your hours studying count too."
                : view === "analytics"
                  ? "See where your study time goes."
                  : view === "appearance" ? "Choose your wallpaper, banner color, and saved appearances." : "Keep track of what you want to get done."}
            </p>
          </div>
          <div className="top-actions">
            {authUser ? (
              <button
                className="secondary small"
                onClick={() => void signOut()}
                disabled={authActionLoading || workspaceSync.pending}
              >
                <LogOut size={14} /> {authActionLoading ? "Signing out…" : "Sign out"}
              </button>
            ) : (
              <button
                className="secondary small"
                onClick={() => void signInWithGoogle()}
                disabled={!supabase || authLoading || authActionLoading}
              >
                <Cloud size={14} />
                {authLoading
                  ? "Restoring session…"
                  : !supabase
                    ? "Supabase not configured"
                    : authActionLoading
                      ? "Opening Google…"
                      : "Sign in with Google"}
              </button>
            )}
          </div>
        </header>
        <div className="workspace-sync-status" role="status">{workspaceSync.status}</div>
        {workspaceSync.error && <p className="error" role="alert">{workspaceSync.error} <button className="secondary small" onClick={workspaceSync.retry}>Retry sync</button></p>}
        {cloudError && <p className="error cloud-error" role="alert">{cloudError}</p>}
        {sessionsLoading && <p className="helper cloud-message" role="status">Loading your Supabase sessions…</p>}
        {view === "analytics" && <section className="stats">
          <div className="stat">
            <span>HOURS THIS WEEK</span>
            <strong>{formatHours(total)}</strong>
            <small>Recorded study time</small>
          </div>
          <div className="stat">
            <span>STUDY SESSIONS</span>
            <strong>{weekEntries.length}</strong>
            <small>
              {draftEntries.length} draft{draftEntries.length === 1 ? "" : "s"} to submit
            </small>
          </div>
          <div className="stat">
            <span>WEEKLY GOAL</span>
            <strong>{Math.round((total / Math.max(goal, 1)) * 100)}%</strong>
            <div className="progress">
              <div
                style={{
                  width: `${Math.min(100, (total / Math.max(goal, 1)) * 100)}%`,
                }}
              />
            </div>
            <small>
              {formatHours(total)} of {goal}h target
            </small>
          </div>
        </section>}
        {view === "timesheet" && (
          <>
            <div className="schedule-layout">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Weekly schedule</h2>
                  <p>Click a time slot to add a study session</p>
                </div>
                <div className="week-nav">
                  <button
                    className="today-button"
                    onClick={() => setWeek(monday(new Date()))}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => moveWeek(-1)}
                    aria-label="Previous week"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <strong>
                    {days[0].toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    –{" "}
                    {days[6].toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </strong>
                  <button onClick={() => moveWeek(1)} aria-label="Next week">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="calendar-toolbar">
                <label>
                  <input
                    type="checkbox"
                    checked={showCalendar}
                    onChange={(e) => setShowCalendar(e.target.checked)}
                  />{" "}
                  Google events
                </label>
                <div className="calendar-buttons">
                  {googleToken ? (
                    <>
                      <button
                        className="secondary small"
                        onClick={() => void fetchCalendar(googleToken, week)}
                        disabled={calendarLoading}
                      >
                        <RefreshCw size={14} /> Refresh
                      </button>
                      <button
                        className="secondary small"
                        onClick={disconnectGoogle}
                      >
                        <LogOut size={14} /> Disconnect
                      </button>

                      {!useGoogleColors && <button className="secondary small" type="button"
                        onClick={() => { setUseGoogleColors(true); setGoogleColorOverrides({}); }}>Use Google colors</button>}

                    </>
                  ) : (
                    <button className="secondary small" onClick={connectGoogle}>
                      <CalendarDays size={14} /> Connect Google Calendar
                    </button>
                  )}
                  <button className="secondary small" type="button" onClick={() => setCalendarThemesOpen(true)}>
                    <Palette size={14} /> Theme
                  </button>
                  <button
                    className="secondary small"
                    onClick={() => setCategoryManagerOpen(true)}
                  >
                    <Tags size={14} /> Categories
                  </button>

                </div>
              </div>
              {calendarError && <p className="error">{calendarError}</p>}
              {!googleToken && (
                <p className="helper">
                  Google Calendar is optional. Connect it to see events alongside your study time.
                </p>
              )}
              <div className="calendar-scroll" ref={calendarScrollRef}>
              <div className="calendar-week">
                <div className="calendar-corner" />
                {days.map((day) => {
                  const key = iso(day);
                  return (
                    <div
                      className={`day-heading ${key === iso(new Date()) ? "today" : ""}`}
                      key={key}
                    >
                      <span>{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <strong>{day.getDate()}</strong>
                    </div>
                  );
                })}
                <div className="all-day-label">All day</div>
                {days.map((day) => {
                  const key = iso(day);
                  const allDayEvents = showCalendar
                    ? events.filter(
                        (event) =>
                          event.allDay &&
                          event.start.slice(0, 10) <= key &&
                          event.end.slice(0, 10) > key,
                      )
                    : [];
                  return (
                    <div className="all-day-cell" key={key}>
                      {allDayEvents.map((event) => (
                        <a
                          key={event.id}
                          className="all-day-event"
                          onClick={(click) => { click.preventDefault(); openGoogleEditor(event); }}
                          style={googleAppearance(event)}
                          href={event.htmlLink || "https://calendar.google.com"}
                          target="_blank"
                          rel="noreferrer"
                          title={event.summary}
                        >
                          {event.summary}
                        </a>
                      ))}
                    </div>
                  );
                })}
                <div className="time-rail">
                  {Array.from({ length: GRID_END - GRID_START }, (_, index) => (
                    <span key={index}>{clockLabel(GRID_START + index)}</span>
                  ))}
                </div>
                {days.map((day) => {
                  const key = iso(day);
                  const dayEntries = weekEntries
                    .filter((entry) => entry.date === key)
                    .map((entry) => ({
                      id: entry.id,
                      start: `${key}T${entry.start}:00`,
                      end: `${key}T${entry.end}:00`,
                      day: key,
                      title: entry.course,
                      color:
                        categoryColors[entry.course] ||
                        COLORS[
                          Math.max(0, categories.indexOf(entry.course)) %
                            COLORS.length
                        ],
                      kind: "study" as const,
                      status: entry.status,
                      onEdit: () => openEditEntry(entry),
                    }));
                  const dayStart = new Date(`${key}T00:00:00`);
                  const dayEnd = new Date(dayStart);
                  dayEnd.setDate(dayEnd.getDate() + 1);
                  const dayEvents = showCalendar
                    ? events
                        .filter((event) => {
                          if (event.allDay) return false;
                          return (
                            new Date(event.start) < dayEnd &&
                            new Date(event.end) > dayStart
                          );
                        })
                        .map((event) => ({
                          id: event.id,
                          start: event.start,
                          end: event.end,
                          day: key,
                          title: event.summary,
                          kind: "google" as const,
                          color: googleAppearance(event).backgroundColor,
                          textColor: googleAppearance(event).color,
                          href: event.htmlLink,
                          onEdit: () => openGoogleEditor(event),
                        }))
                    : [];
                  return (
                    <div className="day-column" key={key}>
                      <div className="slot-stack">
                        {Array.from({ length: GRID_END - GRID_START }, (_, index) => (
                          <button
                            key={index}
                            className="time-slot"
                            aria-label={`Add study time ${clockLabel(GRID_START + index)} on ${key}`}
                            onClick={() => openEntryForm(key, GRID_START + index)}
                          />
                        ))}
                      </div>
                      {layoutCalendarItems([...dayEvents, ...dayEntries]).map(renderCalendarItem)}
                    </div>
                  );
                })}
              </div>
              </div>
              <div className="submit-bar">
                <div>
                  <strong>
                    {draftEntries.length
                      ? `${draftEntries.length} draft ${draftEntries.length === 1 ? "entry" : "entries"}`
                      : "Week is up to date"}
                  </strong>
                  <span>
                    {draftEntries.length
                      ? "Ready to submit for this week"
                      : "All entries for this week are submitted"}
                  </span>
                </div>
                <button
                  className="primary"
                  disabled={draftEntries.length === 0 || submittingWeek || Boolean(supabase && !sessionsLoaded)}
                  onClick={() => void submitWeek()}
                >
                  <Check size={16} /> {submittingWeek ? "Submitting…" : "Submit week"}
                </button>
              </div>
              <p className="submission-note">
                Submitted sessions stay saved to your account. This does not send hours to Workday.
              </p>
            </section>
            <div className="schedule-sidebar">
            <aside className="panel summary-panel">
              <div className="summary-heading">
                <h2>Summary</h2>
                <p>
                  {days[0].toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })} – {days[6].toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <dl className="summary-list">
                <div><dt>Study hours</dt><dd>{formatHours(total)}</dd></div>
                <div>
                  <dt>Draft hours</dt>
                  <dd>{formatHours(draftEntries.reduce((sum, entry) => sum + hours(entry), 0))}</dd>
                </div>
                <div>
                  <dt>Submitted hours</dt>
                  <dd>{formatHours(weekEntries.filter((entry) => entry.status === "submitted").reduce((sum, entry) => sum + hours(entry), 0))}</dd>
                </div>
                <div><dt>Sessions</dt><dd>{weekEntries.length}</dd></div>
                <div><dt>Weekly goal</dt><dd>{goal}h</dd></div>
                <div className="summary-total"><dt>Total hours</dt><dd>{formatHours(total)}</dd></div>
              </dl>
            </aside>
            <InspirationNote key={authUser?.id || "local"}
              note={inspirationNote} setNote={setInspirationNote}
              background={bannerColor || palette.sidebar} />
            </div>
            </div>
          </>
        )}
        <div className="focus-section" hidden={view !== "timesheet"}>
          <FocusTimer key={authUser?.id || "local"} categories={categories} preferences={focusPreferences} onPreferencesChange={setFocusPreferences} onSave={async (start, end, timerCourse) => {
            const saved = await saveStudySession({ id: crypto.randomUUID(), date: iso(start), course: timerCourse,
              start: hhmm(start), end: hhmm(end), notes: "Timed study session", status: "draft" }, false);
            if (saved) setWeek(monday(start));
            return saved;
          }} />
        </div>
        {view === "analytics" && (
          <div className="analytics-grid">
            <section className="panel progress-chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Study hours by day</h2>
                  <p>Daily totals with your average goal pace</p>
                </div>
                <ChartColumn size={20} />
              </div>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={progressData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#e8ede9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={34} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}h`} />
                    <Bar dataKey="actual" name="Study hours" fill={chartColor} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="target" name="Daily goal" stroke={chartGoalColor} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-key">
                <span><i className="key-actual" style={{ background: chartColor }} /> Study hours</span>
                <span><i className="key-target" style={{ background: chartGoalColor }} /> Daily goal</span>
              </div>
            </section>
            <div className="analytics-side">
              <section className="panel category-chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Hours by category</h2>
                    <p>{categoryRange === "day" ? dateFrom(categoryDay).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}</p>
                  </div>
                </div>
                <div className="category-chart-controls">
                  <div role="group" aria-label="Category chart period">
                    {(["day", "week"] as const).map((range) => <button key={range} type="button" aria-pressed={categoryRange === range} className={categoryRange === range ? "primary small" : "secondary small"} onClick={() => setCategoryRange(range)}>{range === "day" ? "Day" : "Week"}</button>)}
                  </div>
                  <button className="icon-button" aria-label={`Previous ${categoryRange}`} onClick={() => {
                    if (categoryRange === "week") moveWeek(-1);
                    else { const day = dateFrom(categoryDay); day.setDate(day.getDate() - 1); setCategoryDay(iso(day)); }
                  }}><ChevronLeft size={16} /></button>
                  <input type="date" aria-label={categoryRange === "day" ? "Day to show category hours" : "Choose a week for category hours"} value={categoryRange === "day" ? categoryDay : iso(week)} onChange={(event) => {
                    if (!event.target.value) return;
                    if (categoryRange === "day") setCategoryDay(event.target.value);
                    else setWeek(monday(dateFrom(event.target.value)));
                  }} />
                  <button className="icon-button" aria-label={`Next ${categoryRange}`} onClick={() => {
                    if (categoryRange === "week") moveWeek(1);
                    else { const day = dateFrom(categoryDay); day.setDate(day.getDate() + 1); setCategoryDay(iso(day)); }
                  }}><ChevronRight size={16} /></button>
                </div>
                {grouped.length === 0 ? (
                  <p className="empty">No study time recorded {categoryRange === "day" ? "on this day" : "this week"}.</p>
                ) : (
                  <div className="category-chart-frame">
                    <ResponsiveContainer width="100%" height={Math.max(190, grouped.length * 40)}>
                      <BarChart data={grouped} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                        <CartesianGrid stroke="#e8ede9" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} />
                        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}h`} />
                        <Bar dataKey="value" name="Study hours" radius={[0, 4, 4, 0]}>
                          {grouped.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
              <section className="panel goal-panel">
                <div className="goal-label">
                  <label htmlFor="goal-input">Weekly goal</label>
                  <div className="goal-input-wrap">
                    <input
                      id="goal-input"
                      type="number"
                      min="1"
                      max="200"
                      step="1"
                      value={goalInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        setGoalInput(value);
                        const numericValue = Number(value);
                        if (value && numericValue >= 1 && numericValue <= 200)
                          setGoal(numericValue);
                      }}
                      onBlur={() => {
                        const numericValue = Number(goalInput);
                        if (!goalInput || numericValue < 1) {
                          setGoalInput(String(goal));
                        } else if (numericValue > 200) {
                          setGoal(200);
                          setGoalInput("200");
                        }
                      }}
                    />
                    <span>hours</span>
                  </div>
                </div>
                <input
                  className="goal-slider"
                  id="goal-slider"
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  value={goal}
                  aria-label="Adjust weekly goal"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setGoal(value);
                    setGoalInput(String(value));
                  }}
                />
                <div className="progress large">
                  <div style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} />
                </div>
                <p className="helper">
                  {formatHours(total)} studied · {formatHours(Math.max(0, goal - total))} remaining
                </p>
                <button
                  className="secondary"
                  onClick={() => setView("timesheet")}
                >
                  Back to calendar
                </button>
              </section>
            </div>
          </div>
        )}
        {view === "tasks" && <StudyTasks key={authUser?.id || "local"} data={taskData} setData={setTaskData} />}
        {view === "appearance" && <section className="panel appearance-page" aria-label="Appearance settings">
            <fieldset className="theme-fieldset">
              <legend>Color scheme</legend>
              <div className="theme-options">
                {Object.entries(THEMES).map(([key, option]) => (
                  <button
                    key={key}
                    type="button"
                    className={`theme-option ${theme === key ? "selected" : ""}`}
                    aria-pressed={theme === key}
                    onClick={() => {
                      setTheme(key as ThemeName); setWallpaper(""); setBannerColor("");
                      setBannerColorInput(option.sidebar); setEditingAppearanceId(null); setAppearanceName("");
                    }}
                  >
                    <span
                      className="theme-swatch"
                      style={{
                        backgroundColor: option.sidebar,
                        backgroundImage: `linear-gradient(rgba(18, 30, 34, .28), rgba(18, 30, 34, .28)), url("${option.background}")`,
                      }}
                    >
                      <i style={{ background: option.primary }} />
                      <i style={{ background: option.highlight }} />
                    </span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="banner-color-controls">
              <label htmlFor="banner-color">Sidebar/banner color</label>
              <div className="banner-color-input-row">
                <input
                  id="banner-color"
                  type="color"
                  value={bannerColor || palette.sidebar}
                  onChange={(event) => {
                    setBannerColor(event.target.value);
                    setBannerColorInput(event.target.value);
                  }}
                  aria-label="Choose any banner color"
                />
                <input
                  className="banner-hex-input"
                  type="text"
                  value={bannerColorInput}
                  maxLength={7}
                  aria-label="Banner color hex code"
                  placeholder="#RRGGBB"
                  onChange={(event) => {
                    const value = event.target.value;
                    setBannerColorInput(value);
                    if (/^#[0-9a-fA-F]{6}$/.test(value))
                      setBannerColor(value.toLowerCase());
                  }}
                  onBlur={() => {
                    if (!/^#[0-9a-fA-F]{6}$/.test(bannerColorInput))
                      setBannerColorInput(bannerColor || palette.sidebar);
                  }}
                />
                <button
                  className="secondary small"
                  type="button"
                  disabled={!bannerColor}
                  onClick={() => setBannerColor("")}
                >
                  Use theme color
                </button>
              </div>
            </div>
            <div className="wallpaper-controls">
              <label htmlFor="wallpaper-file">Wallpaper</label>
              <input
                id="wallpaper-file"
                type="file"
                accept="image/*"
                onChange={uploadWallpaper}
              />
              <p className="helper">Saved to your account. Images are resized before saving.</p>
              <div className="wallpaper-tint-control">
                <label htmlFor="wallpaper-banner-color">Wallpaper banner color</label>
                <div className="wallpaper-tint-row">
                  <ColorField id="wallpaper-banner-color" label="Wallpaper banner color"
                    value={bannerColor || palette.sidebar}
                    onChange={(color) => { setBannerColor(color); setBannerColorInput(color); }} />
                </div>
                <label htmlFor="wallpaper-overlay">Wallpaper overlay strength</label>
                <div className="wallpaper-tint-row">
                  <input
                    id="wallpaper-overlay"
                    type="range"
                    min="10"
                    max="95"
                    step="5"
                    value={wallpaperTintStrength}
                    onChange={(event) =>
                      setWallpaperTintStrength(Number(event.target.value))
                    }
                    aria-label="Wallpaper tint strength"
                  />
                  <output>{wallpaperTintStrength}%</output>
                </div>
              </div>
              {wallpaper && (
                <button
                  className="secondary small"
                  onClick={() => {
                    setWallpaper("");
                    setAppearanceError("");
                  }}
                >
                  Remove wallpaper
                </button>
              )}
              <div className="saved-appearance-section">
                <h3>{editingAppearanceId ? "Edit saved appearance" : "Save this appearance"}</h3>
                <p className="helper">Saves the wallpaper, banner color, and overlay together to your account.</p>
                <form className="calendar-theme-save" onSubmit={saveCurrentAppearance}>
                  <input aria-label="Appearance theme name" placeholder="Name this appearance" maxLength={40} value={appearanceName} onChange={(event) => setAppearanceName(event.target.value)} />
                  <button className="primary small" disabled={appearanceBusy || !appearancesLoaded} type="submit">{appearanceBusy ? "Saving…" : editingAppearanceId ? "Save changes" : "Save appearance"}</button>
                  {editingAppearanceId && <button className="secondary small" type="button" onClick={() => { setEditingAppearanceId(null); setAppearanceName(""); }}>Done editing</button>}
                </form>
                {savedAppearances.length > 0 && <h3>Your appearances</h3>}
                {savedAppearances.map((item) => <div className="saved-appearance-row" key={item.id}>
                  <button type="button" className="secondary saved-appearance-apply" onClick={() => { applyAppearance(item); setEditingAppearanceId(null); setAppearanceName(""); }}>
                    <span className="saved-appearance-preview" aria-hidden="true" style={{ backgroundImage: `url("${item.wallpaper || THEMES[item.theme].background}")` }}><i style={{ backgroundColor: item.bannerColor }} /></span>
                    {item.name}
                  </button>
                  <button className="icon-button" type="button" disabled={appearanceBusy} aria-label={`Edit ${item.name} appearance`} onClick={() => { applyAppearance(item); setEditingAppearanceId(item.id); setAppearanceName(item.name); setAppearanceError(""); }}><Pencil size={15} /></button>
                  <button className="icon-button" type="button" disabled={appearanceBusy} aria-label={`Delete ${item.name} appearance`} onClick={() => void removeAppearance(item.id)}><Trash2 size={15} /></button>
                </div>)}
              </div>
              {appearanceError && <p className="error" role="alert">{appearanceError}</p>}
            </div>
        </section>}
        <footer>
          Studyday
          <span>
            {authUser
              ? "Study sessions, tasks, notes, and settings sync to your account"
              : supabase
                ? "Sign in to sync sessions"
                : "Sessions saved in this browser · Supabase is not configured"}
          </span>
        </footer>
      </main>
      {calendarThemesOpen && <div className="modal-backdrop">
        <section className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-theme-title">
          <div className="modal-heading"><div><span className="eyebrow">STUDYDAY COLORS</span><h2 id="calendar-theme-title">Calendar themes</h2></div>
            <button className="icon-button" aria-label="Close calendar themes" onClick={() => setCalendarThemesOpen(false)}><X size={18} /></button>
          </div>
          <p className="helper">Themes color your study entries, categories, analytics, and Google events together. Each Google event series gets its own color. Recurring occurrences keep the same color across weeks. Applying a theme replaces local event color overrides; Google Calendar stays unchanged.</p>
          <div className="category-theme-options">
            <button className="secondary small" type="button" onClick={() => { setUseGoogleColors(true); setGoogleColorOverrides({}); }}>Use Google colors</button>
            {Object.entries(CATEGORY_THEMES).map(([id, option]) => <button type="button" className="secondary category-theme-option" key={id} onClick={() => applyCalendarTheme(option.colors)}>
              {option.label}<span className="category-theme-swatches" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span>
            </button>)}
          </div>
          <h3 className="calendar-theme-section">{editingThemeId ? "Edit saved theme" : "Make your own"}</h3>
          <div className="calendar-palette-editor">{(editingThemeId ? editingThemeColors : calendarPalette).map((color, index) => <ColorField key={index} value={color} label={`Theme color ${index + 1}`} onChange={(nextColor) => {
            if (editingThemeId) {
              setEditingThemeColors((current) => current.map((value, slot) => slot === index ? nextColor : value));
            } else {
              applyCalendarTheme(calendarPalette.map((value, slot) => slot === index ? nextColor : value));
            }
          }} />)}</div>
          <form className="calendar-theme-save" onSubmit={(event) => {
            event.preventDefault(); const label = calendarThemeName.trim();
            if (!label) { setCalendarThemeError("Give your theme a name."); return; }
            if (savedCalendarThemes.some((theme) => theme.id !== editingThemeId && theme.label.toLowerCase() === label.toLowerCase())) { setCalendarThemeError("Choose a different name for this theme."); return; }
            if (editingThemeId) {
              const original = savedCalendarThemes.find((theme) => theme.id === editingThemeId);
              if (!original) { setCalendarThemeError("This theme no longer exists."); return; }
              const updated = { ...original, label, colors: [...editingThemeColors],
                categoryColors: Object.fromEntries(Object.entries(original.categoryColors || {}).map(([name, color]) => {
                  const slot = original.colors.indexOf(color);
                  return [name, slot >= 0 ? editingThemeColors[slot] : color];
                })),
              };
              setSavedCalendarThemes((current) => current.map((theme) => theme.id === editingThemeId ? updated : theme));
              applyCalendarTheme(updated.colors, updated.overrides, updated.categoryColors);
            } else {
              setSavedCalendarThemes((current) => [...current, { id: crypto.randomUUID(), label, colors: [...calendarPalette], overrides: { ...googleColorOverrides }, categoryColors: { ...categoryColors } }]);
            }
            setEditingThemeId(null); setCalendarThemeName(""); setCalendarThemeError("");
          }}>
            <input aria-label="Theme name" placeholder="Name your theme" maxLength={40} value={calendarThemeName} onChange={(event) => setCalendarThemeName(event.target.value)} />
            <button className="primary small" type="submit">{editingThemeId ? "Save changes" : "Save theme"}</button>
            {editingThemeId && <button className="secondary small" type="button" onClick={() => { setEditingThemeId(null); setCalendarThemeName(""); setCalendarThemeError(""); }}>Cancel</button>}
          </form>
          {calendarThemeError && <p className="error" role="alert">{calendarThemeError}</p>}
          <p className="helper">Saves this palette, category colors, and individual event colors to your account.</p>
          {savedCalendarThemes.length > 0 && <><h3 className="calendar-theme-section">Your themes</h3>
            {savedCalendarThemes.map((theme) => <div className="calendar-saved-theme" key={theme.id}>
              <button className="secondary category-theme-option" type="button" onClick={() => applyCalendarTheme(theme.colors, theme.overrides, theme.categoryColors)}>{theme.label}
                <span className="category-theme-swatches" aria-hidden="true">{theme.colors.map((color, index) => <i key={index} style={{ backgroundColor: color }} />)}</span>
              </button>
              <button className="icon-button" type="button" aria-label={`Edit ${theme.label} theme`} title="Edit theme" onClick={() => {
                setEditingThemeId(theme.id); setCalendarThemeName(theme.label); setEditingThemeColors([...theme.colors]); setCalendarThemeError("");
              }}><Pencil size={15} /></button>
              <button className="icon-button" type="button" aria-label={`Delete ${theme.label} theme`} onClick={() => {
                setSavedCalendarThemes((current) => current.filter((item) => item.id !== theme.id));
                if (editingThemeId === theme.id) { setEditingThemeId(null); setCalendarThemeName(""); setCalendarThemeError(""); }
              }}><Trash2 size={15} /></button>
            </div>)}
          </>}
        </section>
      </div>}
      {editingGoogle && <div className="modal-backdrop">
        <section className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="google-edit-title">
          <div className="modal-heading"><div><span className="eyebrow">{editingGoogle.calendarName}</span><h2 id="google-edit-title">Edit Google Calendar event</h2></div>
            <button className="icon-button" disabled={googleSaving} onClick={() => setEditingGoogle(null)} aria-label="Close Google event editor"><X size={18} /></button>
          </div>
          <div className="google-local-color">
            <label htmlFor="google-series-color">Color in Studyday</label>
            <div className="google-local-color-controls">
              <ColorField id="google-series-color" label="Event color" value={googleAppearance(editingGoogle).backgroundColor}
                onChange={(color) => setGoogleColorOverrides((current) => ({ ...current, [googleColorKey(editingGoogle)]: color }))} />
              <button type="button" className="secondary small"
                onClick={() => setGoogleColorOverrides((current) => ({ ...current, [googleColorKey(editingGoogle)]: "google" }))}>Use Google color</button>
            </div>
            {usedEventColors.length > 0 && <div className="used-event-colors">
              <span>Colors already in use</span>
              <div className="used-event-swatches" role="group" aria-label="Colors used by other events">
                {usedEventColors.map((color) => {
                  const selected = googleAppearance(editingGoogle).backgroundColor.toLowerCase() === color;
                  return <button key={color} type="button" aria-label={`Use event color ${color}`} aria-pressed={selected}
                    title={color.toUpperCase()} style={{ backgroundColor: color, color: readableText(color) }}
                    onClick={() => setGoogleColorOverrides((current) => ({ ...current, [googleColorKey(editingGoogle)]: color }))}>
                    {selected && <Check size={15} aria-hidden="true" />}
                  </button>;
                })}
              </div>
            </div>}
            <p className="helper">{editingGoogle.recurring ? "Applies to every occurrence in this series." : "Applies to this event."} Color changes sync automatically to your account and do not change Google Calendar.</p>
          </div>
          <form onSubmit={saveGoogleEvent}>
            <fieldset disabled={googleSaving || !editingGoogle.editable} style={{ border: 0, padding: 0, margin: 0 }}>
              <div className="field"><label htmlFor="google-event-title">Title</label><input id="google-event-title" required value={googleDraft.title} onChange={(event) => setGoogleDraft((current) => ({ ...current, title: event.target.value }))} /></div>
              <div className="field"><label htmlFor="google-event-start">Start</label><input id="google-event-start" required type={editingGoogle.allDay ? "date" : "datetime-local"} value={googleDraft.start} onChange={(event) => setGoogleDraft((current) => ({ ...current, start: event.target.value }))} /></div>
              <div className="field"><label htmlFor="google-event-end">{editingGoogle.allDay ? "End date (exclusive)" : "End"}</label><input id="google-event-end" required type={editingGoogle.allDay ? "date" : "datetime-local"} value={googleDraft.end} onChange={(event) => setGoogleDraft((current) => ({ ...current, end: event.target.value }))} /></div>
            </fieldset>
            <p className="helper">{editingGoogle.editable ? "Saves directly to Google Calendar. Guests will be notified of updates." : "You have read-only access to this calendar."}{editingGoogle.recurring ? " Only this occurrence will change." : ""}</p>
            {googleSaveError && <p className="error" role="alert">{googleSaveError}</p>}
            <div className="form-footer">
              {editingGoogle.htmlLink && <a href={editingGoogle.htmlLink} target="_blank" rel="noreferrer">Open in Google Calendar</a>}
              <button className="primary" type="submit" disabled={googleSaving || !editingGoogle.editable}>{googleSaving ? "Saving…" : "Save to Google Calendar"}</button>
            </div>
          </form>
        </section>
      </div>}
      {showEntryForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowEntryForm(false);
          }}
        >
          <section
            className="entry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">NEW STUDY TIME</span>
                <h2 id="entry-title">
                  {editingEntryId ? "Edit study entry" : "Add calendar entry"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setShowEntryForm(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addEntry}>
              <div className="field">
                <label htmlFor="course">Course / activity</label>
                <select
                  id="course"
                  value={course}
                  onChange={(event) => setCourse(event.target.value)}
                >
                  {!categories.includes(course) && (
                    <option value={course}>{course} (archived)</option>
                  )}
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <button
                  className="manage-categories-link"
                  type="button"
                  onClick={() => setCategoryManagerOpen(true)}
                >
                  <Tags size={13} /> Manage categories
                </button>
              </div>
              <div className="field">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  required
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="two-fields">
                <div className="field">
                  <label htmlFor="start">Start</label>
                  <input
                    id="start"
                    type="time"
                    required
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="end">End</label>
                  <input
                    id="end"
                    type="time"
                    required
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What did you work on?"
                  rows={3}
                />
              </div>
              {formError && <p className="error">{formError}</p>}
              <div className="form-footer">
                <span>
                  {Math.max(0, (minutes(end) - minutes(start)) / 60).toFixed(2)}
                  {" "}hours · {editingEntryId ? "will be a draft" : "saved as draft"}
                </span>
                {editingEntryId && (
                  <button
                    className="danger small"
                    type="button"
                    onClick={() => deleteEntry(editingEntryId)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <button className="primary" type="submit">
                  {editingEntryId ? "Save changes" : <><Plus size={16} /> Add entry</>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {categoryManagerOpen && (
        <div
          className="modal-backdrop category-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCategoryManagerOpen(false);
              setEditingCategory(null);
              setCategoryError("");
            }
          }}
        >
          <section
            className="entry-modal category-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">STUDY ORGANIZATION</span>
                <h2 id="category-title">Manage categories</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close category manager"
                onClick={() => {
                  setCategoryManagerOpen(false);
                  setEditingCategory(null);
                  setCategoryError("");
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="category-theme-controls">
              <button className="secondary small" type="button"
                aria-expanded={categoryThemesOpen} aria-controls="category-theme-options"
                onClick={() => setCategoryThemesOpen((open) => !open)}>
                <Palette size={14} /> Category theme
              </button>
              {categoryThemesOpen && <div id="category-theme-options" className="category-theme-options">
                <p className="helper">Apply colors to all categories and Google Calendar events. You can still change individual colors.</p>
                {Object.entries(CATEGORY_THEMES).map(([key, option]) => (
                  <button className="secondary category-theme-option" type="button" key={key}
                    onClick={() => {
                      setCategoryColors((current) => ({ ...current,
                        ...Object.fromEntries(categories.map((category, index) => [category, option.colors[index % option.colors.length]])),
                      }));
                      applyCalendarTheme(option.colors);
                    }}>
                    {option.label}
                    <span className="category-theme-swatches" aria-hidden="true">
                      {option.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                    </span>
                  </button>
                ))}
              </div>}
            </div>
            <form className="category-create-form" onSubmit={saveCategory}>
              <label htmlFor="new-category">New category</label>
              <div className="category-create-controls">
                <input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="e.g. Research lab"
                  maxLength={40}
                />
                <button className="primary" type="submit">
                  <Plus size={15} /> Add
                </button>
              </div>
            </form>
            {categoryError && <p className="error">{categoryError}</p>}
            <div className="category-list">
              {categories.map((category) => (
                <div className="category-row" key={category}>
                  {editingCategory === category ? (
                    <form className="category-edit-form" onSubmit={saveCategory}>
                      <input
                        aria-label="Category name"
                        value={categoryNameDraft}
                        onChange={(event) => setCategoryNameDraft(event.target.value)}
                        maxLength={40}
                        autoFocus
                      />
                      <button
                        className="icon-button"
                        type="submit"
                        title="Save category name"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        title="Cancel rename"
                        onClick={() => {
                          setEditingCategory(null);
                          setCategoryError("");
                        }}
                      >
                        <X size={15} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="category-name">{category}</span>
                      <div className="category-actions">
                        <ColorField label={`${category} color`}
                          value={categoryColors[category] || COLORS[categories.indexOf(category) % COLORS.length]}
                          onChange={(color) => setCategoryColors((current) => ({ ...current, [category]: color }))} />
                        <button
                          className="icon-button"
                          title={`Rename ${category}`}
                          aria-label={`Rename ${category}`}
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryNameDraft(category);
                            setCategoryError("");
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-button"
                          title={`Remove ${category}`}
                          aria-label={`Remove ${category}`}
                          onClick={() => deleteCategory(category)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}


    </div>
  );
}
