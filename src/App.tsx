import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChartColumn,
  Download,
  Plus,
  Trash2,
  Timer,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Square,
  Play,
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
};
type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay?: boolean;
  htmlLink?: string;
  calendarName: string;
};
type View = "timesheet" | "analytics" | "history";
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
    status: "draft",
  };
};
const localEntryKey = (entry: Entry) =>
  [
    entry.course.trim().toLowerCase(),
    entry.notes.trim().toLowerCase(),
    new Date(`${entry.date}T${entry.start}:00`).toISOString(),
    new Date(`${entry.date}T${entry.end}:00`).toISOString(),
  ].join("|");
const sessionRowKey = (row: StudySessionRow) =>
  [
    row.course.trim().toLowerCase(),
    (row.description || "").trim().toLowerCase(),
    new Date(row.start_time).toISOString(),
    new Date(row.end_time).toISOString(),
  ].join("|");
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
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 155
    ? "#202a3b"
    : "#f6f7f5";
};
const hexWithAlpha = (hex: string, alpha: number) => {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function App() {
  const [entries, setEntries] = useState<Entry[]>(loadEntries);
  const sessionRevision = useRef(0);
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    loadCategoryColors,
  );
  const [view, setView] = useState<View>("timesheet");
  const [week, setWeek] = useState(() => monday(new Date()));
  const [course, setCourse] = useState(DEFAULT_CATEGORIES[0]);
  const [date, setDate] = useState(iso(new Date()));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [goal, setGoal] = useState(() =>
    Number(localStorage.getItem("studyday.goal") || 20),
  );
  const [goalInput, setGoalInput] = useState(() => String(goal));
  const [timerStarted, setTimerStarted] = useState<number | null>(null);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [timerMessage, setTimerMessage] = useState("");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(!supabase);
  const [cloudError, setCloudError] = useState("");
  const [cloudStatus, setCloudStatus] = useState("");
  const [localImportCandidates, setLocalImportCandidates] = useState<Entry[]>([]);
  const [localImportDone, setLocalImportDone] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [showCalendar, setShowCalendar] = useState(true);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
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
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [appearanceError, setAppearanceError] = useState("");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const palette = THEMES[theme];
  useEffect(() => {
    if (!supabase)
      localStorage.setItem("studyday.entries", JSON.stringify(entries));
  }, [entries]);
  useEffect(
    () => localStorage.setItem("studyday.categories", JSON.stringify(categories)),
    [categories],
  );
  useEffect(
    () =>
      localStorage.setItem(
        "studyday.categoryColors",
        JSON.stringify(categoryColors),
      ),
    [categoryColors],
  );
  useEffect(() => localStorage.setItem("studyday.theme", theme), [theme]);
  useEffect(() => {
    if (wallpaper) localStorage.setItem("studyday.wallpaper", wallpaper);
    else localStorage.removeItem("studyday.wallpaper");
  }, [wallpaper]);
  useEffect(
    () => localStorage.setItem("studyday.wallpaperTint", wallpaperTint),
    [wallpaperTint],
  );
  useEffect(
    () =>
      localStorage.setItem(
        "studyday.wallpaperTintStrength",
        String(wallpaperTintStrength),
      ),
    [wallpaperTintStrength],
  );
  useEffect(() => {
    if (bannerColor) localStorage.setItem("studyday.bannerColor", bannerColor);
    else localStorage.removeItem("studyday.bannerColor");
  }, [bannerColor]);
  useEffect(() => {
    if (!bannerColor) setBannerColorInput("#242424");
  }, [bannerColor, theme]);
  useEffect(() => localStorage.setItem("studyday.goal", String(goal)), [goal]);
  useEffect(() => {
    if (timerStarted === null) return;
    const id = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timerStarted]);
  useEffect(() => {
    if (calendarScrollRef.current)
      calendarScrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);
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
    setImportConfirmOpen(false);
    setImportMessage("");
    setLocalImportCandidates([]);
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
          .select("id,user_id,course,description,start_time,end_time,created_at")
          .eq("user_id", authUser.id)
          .order("start_time", { ascending: false });
        if (!active || revision !== sessionRevision.current) return;
        if (error) {
          setCloudError(`Could not load study sessions: ${error.message}`);
          setCloudStatus("Cloud sync needs attention");
          return;
        }
        const rows = (data || []) as StudySessionRow[];
        setEntries((current) => {
          const statuses = new Map(current.map((entry) => [entry.id, entry.status]));
          return rows.map((row) => ({
            ...sessionRowToEntry(row),
            status: statuses.get(row.id) || "draft",
          }));
        });
        const localEntries = loadEntries();
        setLocalImportCandidates(localEntries);
        setLocalImportDone(
          localStorage.getItem(`studyday.imported.${authUser.id}`) === "true",
        );
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
  const grouped = categories.map((name, i) => ({
    name,
    color: categoryColors[name] || COLORS[i % COLORS.length],
    value: weekEntries
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
            .select("id,user_id,course,description,start_time,end_time,created_at")
            .single()
        : await supabase
            .from("study_sessions")
            .insert(row)
            .select("id,user_id,course,description,start_time,end_time,created_at")
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
  const importLocalSessions = async () => {
    if (!supabase || !authUser) {
      setCloudError("Sign in with Google before importing local sessions.");
      return;
    }
    setImportLoading(true);
    setCloudError("");
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("study_sessions")
        .select("id,user_id,course,description,start_time,end_time,created_at")
        .eq("user_id", authUser.id);
      if (existingError)
        throw new Error(`Could not check for duplicate sessions: ${existingError.message}`);
      const seen = new Set(
        ((existingRows || []) as StudySessionRow[]).map(sessionRowKey),
      );
      const uniqueLocalEntries = localImportCandidates.filter((entry) => {
        const key = localEntryKey(entry);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (uniqueLocalEntries.length === 0) {
        localStorage.setItem(`studyday.imported.${authUser.id}`, "true");
        setLocalImportDone(true);
        setImportMessage("All local sessions already exist in Supabase.");
        setImportConfirmOpen(false);
        return;
      }
      const rows = uniqueLocalEntries.map((entry) =>
        entryToSessionRow({ ...entry, id: crypto.randomUUID() }, authUser.id),
      );
      const { data: importedRows, error: importError } = await supabase
        .from("study_sessions")
        .insert(rows)
        .select("id,user_id,course,description,start_time,end_time,created_at");
      if (importError) throw new Error(importError.message);
      const imported = ((importedRows || []) as StudySessionRow[]).map(
        sessionRowToEntry,
      );
      sessionRevision.current += 1;
      setEntries((current) => [...imported, ...current]);
      localStorage.setItem(`studyday.imported.${authUser.id}`, "true");
      setLocalImportDone(true);
      setImportMessage(
        `Imported ${imported.length} session${imported.length === 1 ? "" : "s"}. Your local copy was kept.`,
      );
      setCloudStatus("Synced");
      setImportConfirmOpen(false);
    } catch (error) {
      setCloudError(
        `Could not import local sessions: ${error instanceof Error ? error.message : "Network error."}`,
      );
    } finally {
      setImportLoading(false);
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
  const submitWeek = () => {
    if (draftEntries.length === 0) return;
    setEntries((current) =>
      current.map((entry) =>
        entry.date >= iso(days[0]) &&
        entry.date <= iso(days[6]) &&
        entry.status !== "submitted"
          ? { ...entry, status: "submitted" }
          : entry,
      ),
    );
  };
  const stopTimer = async () => {
    if (timerStarted === null) return;
    const from = new Date(timerStarted),
      to = new Date();
    const d = iso(from);
    if (iso(to) !== d) {
      setTimerMessage("Timer crossed midnight. Enter this session manually.");
      setTimerStarted(null);
      return;
    }
    if (minutes(hhmm(to)) <= minutes(hhmm(from))) {
      setTimerMessage("Keep the timer running for at least one minute.");
      return;
    }
    const saved = await saveStudySession(
      {
        id: crypto.randomUUID(),
        date: d,
        course,
        start: hhmm(from),
        end: hhmm(to),
        notes: notes.trim() || "Timed study session",
        status: "draft",
      },
      false,
    );
    if (!saved) return;
    setTimerStarted(null);
    setNotes("");
    setTimerMessage("");
    setWeek(monday(from));
  };
  const exportCsv = () => {
    const rows = [
      ["Date", "Course", "Start", "End", "Hours", "Notes", "Status"],
      ...entries.map((e) => [
        e.date,
        e.course,
        e.start,
        e.end,
        hours(e).toFixed(2),
        e.notes,
        e.status === "submitted" ? "Submitted" : "Draft",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "studyday-entries.csv";
    a.click();
    URL.revokeObjectURL(url);
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
      const calendars: Array<{ id: string; summary: string }> = [];
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
          items?: Array<{ id: string; summary?: string }>;
          nextPageToken?: string;
        };
        calendars.push(
          ...(data.items || []).map((calendar) => ({
            id: calendar.id,
            summary: calendar.summary || calendar.id,
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
      scope: "https://www.googleapis.com/auth/calendar.readonly",
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
    if (googleToken && window.google)
      window.google.accounts.oauth2.revoke(googleToken, () => {});
    setGoogleToken(null);
    setEvents([]);
  };
  const renderCalendarItem = (item: {
    id: string;
    start: string;
    end: string;
    day: string;
    title: string;
    color?: string;
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
    const style = {
      left: `calc(${(item.lane / item.laneCount) * 100}% + 3px)`,
      width: `calc(${Math.min(1.5 / item.laneCount, 1 - item.lane / item.laneCount) * 100}% - 6px)`,
      right: "auto",
      zIndex: 2 + item.lane,
      top: `${((visibleStart - GRID_START * 60) / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max(28, ((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT - 2)}px`,
      ...(item.color
        ? {
            backgroundColor: `color-mix(in srgb, ${item.color} 20%, white)`,
            borderLeftColor: item.color,
            color: readableText(item.color),
          }
        : {}),
    };
    const className = `calendar-event ${item.kind === "study" ? "study-event" : "google-event"} ${item.status === "submitted" ? "is-submitted" : ""}`;
    const content = (
      <>
        <b>{item.title}</b>
        <span>
          {(iso(startDate) < item.day
            ? new Date(`${item.day}T00:00:00`)
            : startDate
          ).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
          {" – "}
          {endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
        {item.kind === "study" && (
          <small>{item.status === "submitted" ? "Submitted" : "Draft"}</small>
        )}
      </>
    );
    if (item.kind === "study" && item.onEdit)
      return (
        <button
          key={item.id}
          type="button"
          className={className}
          style={style}
          title={`Edit ${item.title}`}
          aria-label={`Edit ${item.title} entry`}
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
        title={item.title}
      >
        {content}
      </a>
    ) : (
      <div key={item.id} className={className} style={style} title={item.title}>
        {content}
      </div>
    );
  };
  const appStyle = {
    "--sidebar-bg": bannerColor || palette.sidebar,
    "--sidebar-fg": readableText(bannerColor || palette.sidebar),
    "--sidebar-active": `color-mix(in srgb, ${bannerColor || palette.sidebar} 80%, ${readableText(bannerColor || palette.sidebar)})`,
    "--sidebar-muted": `color-mix(in srgb, ${readableText(bannerColor || palette.sidebar)} 72%, transparent)`,
    "--primary": palette.primary,
    "--primary-hover": palette.primaryHover,
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
  return (
    <div className="app-shell" style={appStyle}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <CalendarClock size={23} />
          </span>
          <span>
            studyday<small>STUDY MANAGEMENT</small>
          </span>
        </div>
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
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            <BookOpen size={18} /> All entries
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
              ? "Goals, categories and appearance stay local"
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
                  : "Study History"}
            </h1>
            <p>
              {view === "timesheet"
                ? "Schedule sessions, track your hours, and submit your week."
                : view === "analytics"
                  ? "See where your study time goes."
                  : "Review and export your study sessions."}
            </p>
          </div>
          <div className="top-actions">
            {authUser ? (
              <button
                className="secondary small"
                onClick={() => void signOut()}
                disabled={authActionLoading}
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
            {authUser && localImportCandidates.length > 0 && !localImportDone && (
              <button
                className="secondary small"
                onClick={() => {
                  setImportMessage("");
                  setImportConfirmOpen(true);
                }}
              >
                <Download size={14} /> Import local sessions
              </button>
            )}
            <button className="secondary" onClick={exportCsv}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>
        {cloudError && <p className="error cloud-error" role="alert">{cloudError}</p>}
        {sessionsLoading && <p className="helper cloud-message" role="status">Loading your Supabase sessions…</p>}
        {importMessage && <p className="helper cloud-message" role="status">{importMessage}</p>}
        {view !== "timesheet" && <section className="stats">
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
                    </>
                  ) : (
                    <button className="secondary small" onClick={connectGoogle}>
                      <CalendarDays size={14} /> Connect Google Calendar
                    </button>
                  )}
                  <button
                    className="secondary small"
                    onClick={() => setCategoryManagerOpen(true)}
                  >
                    <Tags size={14} /> Categories
                  </button>
                  <button
                    className="secondary small"
                    onClick={() => {
                      setAppearanceError("");
                      setAppearanceOpen(true);
                    }}
                  >
                    <Palette size={14} /> Appearance
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
                          href: event.htmlLink,
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
              <div className="calendar-legend">
                <span>
                  <i className="legend-study" /> Study entry
                </span>
                <span>
                  <i className="legend-submitted" /> Submitted locally
                </span>
                <span>
                  <i className="legend-google" /> Google Calendar
                </span>
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
                  disabled={draftEntries.length === 0}
                  onClick={submitWeek}
                >
                  <Check size={16} /> Submit week
                </button>
              </div>
              <p className="submission-note">
                Submission status is temporary; the Supabase table has no status column and this does not send hours to Workday.
              </p>
            </section>
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
            </div>
            <div className="bottom-grid">
              <section className="panel timer-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Focus timer</h2>
                    <p>Track a session as you study</p>
                  </div>
                  <Timer size={20} />
                </div>
                <div className="timer-face">
                  {timerStarted === null
                    ? "00:00:00"
                    : new Date(timerNow - timerStarted)
                        .toISOString()
                        .slice(11, 19)}
                </div>
                <p
                  className={`timer-hint ${timerMessage ? "timer-error" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  {timerMessage || "Saved study sessions are added to the calendar as drafts."}
                </p>
                <button
                  className={
                    timerStarted === null
                      ? "primary timer-button"
                      : "danger timer-button"
                  }
                  onClick={() => {
                    if (timerStarted === null) {
                      setTimerMessage("");
                      setTimerStarted(Date.now());
                      setTimerNow(Date.now());
                    } else stopTimer();
                  }}
                >
                  {timerStarted === null ? (
                    <>
                      <Play size={16} /> Start studying
                    </>
                  ) : (
                    <>
                      <Square size={16} /> Stop & save draft
                    </>
                  )}
                </button>
              </section>
              <section className="panel week-summary">
                <div className="panel-heading">
                  <div>
                    <h2>This week</h2>
                    <p>Study time by day</p>
                  </div>
                </div>
                {days.map((day) => {
                  const key = iso(day);
                  const dayTotal = weekEntries
                    .filter((entry) => entry.date === key)
                    .reduce((sum, entry) => sum + hours(entry), 0);
                  return (
                    <div className="summary-row" key={key}>
                      <span>
                        {day.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <div className="bar-bg">
                        <div
                          style={{
                            width: `${Math.min(100, (dayTotal / Math.max(1, total)) * 100)}%`,
                          }}
                        />
                      </div>
                      <b>{formatHours(dayTotal)}</b>
                    </div>
                  );
                })}
              </section>
            </div>
          </>
        )}
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
                    <Bar dataKey="actual" name="Study hours" fill={palette.primary} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="target" name="Daily goal" stroke={palette.highlight} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-key">
                <span><i className="key-actual" style={{ background: palette.primary }} /> Study hours</span>
                <span><i className="key-target" style={{ background: palette.highlight }} /> Daily goal</span>
              </div>
            </section>
            <div className="analytics-side">
              <section className="panel category-chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Hours by category</h2>
                    <p>Time recorded in each study category</p>
                  </div>
                </div>
                {grouped.length === 0 ? (
                  <p className="empty">No study time recorded this week.</p>
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
        {view === "history" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>All study entries</h2>
                <p>{entries.length} saved sessions</p>
              </div>
            </div>
            {entries.length === 0 ? (
              <p className="empty">
                Nothing logged yet. Go to Timesheet to add your first session.
              </p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Time</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>{e.course}</td>
                        <td>
                          {e.start}–{e.end}
                        </td>
                        <td>{formatHours(hours(e))}</td>
                        <td>
                          <span
                            className={`status-tag ${e.status === "submitted" ? "submitted" : ""}`}
                          >
                            {e.status === "submitted" ? "Submitted" : "Draft"}
                          </span>
                        </td>
                        <td>{e.notes || "—"}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              title="Edit entry"
                              aria-label={`Edit ${e.course} entry`}
                              onClick={() => openEditEntry(e)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button"
                              title="Delete entry"
                              aria-label={`Delete ${e.course} entry`}
                              onClick={() => deleteEntry(e.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        <footer>
          Studyday
          <span>
            {authUser
              ? "Study sessions sync to Supabase · Goals, categories and appearance stay local"
              : supabase
                ? "Sign in to sync sessions · Local sessions remain available for import"
                : "Sessions saved in this browser · Supabase is not configured"}
          </span>
        </footer>
      </main>
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
                        <input
                          className="category-color-input"
                          type="color"
                          value={
                            categoryColors[category] ||
                            COLORS[categories.indexOf(category) % COLORS.length]
                          }
                          aria-label={`Choose ${category} tag color`}
                          title={`Choose ${category} tag color`}
                          onChange={(event) =>
                            setCategoryColors((current) => ({
                              ...current,
                              [category]: event.target.value,
                            }))
                          }
                        />
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
      {appearanceOpen && (
        <div
          className="modal-backdrop appearance-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAppearanceOpen(false);
          }}
        >
          <section
            className="entry-modal appearance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appearance-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">MAKE IT YOURS</span>
                <h2 id="appearance-title">Appearance</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close appearance settings"
                onClick={() => setAppearanceOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <fieldset className="theme-fieldset">
              <legend>Color scheme</legend>
              <div className="theme-options">
                {Object.entries(THEMES).map(([key, option]) => (
                  <button
                    key={key}
                    type="button"
                    className={`theme-option ${theme === key ? "selected" : ""}`}
                    aria-pressed={theme === key}
                    onClick={() => setTheme(key as ThemeName)}
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
              <p className="helper">Saved in this browser. Images are resized before saving.</p>
              <div className="wallpaper-tint-control">
                <label htmlFor="wallpaper-tint">Wallpaper tint</label>
                <div className="wallpaper-tint-row">
                  <input
                    id="wallpaper-tint"
                    type="color"
                    value={wallpaperTint}
                    onChange={(event) => setWallpaperTint(event.target.value)}
                    aria-label="Choose wallpaper tint color"
                  />
                  <span>{wallpaperTint.toUpperCase()}</span>
                  <input
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
              {appearanceError && <p className="error">{appearanceError}</p>}
            </div>
          </section>
        </div>
      )}
      {importConfirmOpen && (
        <div
          className="modal-backdrop import-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !importLoading)
              setImportConfirmOpen(false);
          }}
        >
          <section
            className="entry-modal import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">ONE-TIME IMPORT</span>
                <h2 id="import-title">Import local sessions?</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close import confirmation"
                disabled={importLoading}
                onClick={() => setImportConfirmOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="import-description">
              Import up to {localImportCandidates.length} sessions from this browser into the signed-in Supabase account. Existing duplicates will be skipped. Your local data will not be changed or deleted.
            </p>
            <div className="form-footer import-actions">
              <button
                className="secondary"
                type="button"
                disabled={importLoading}
                onClick={() => setImportConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="primary"
                type="button"
                disabled={importLoading}
                onClick={() => void importLocalSessions()}
              >
                {importLoading ? "Importing…" : "Import sessions"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
