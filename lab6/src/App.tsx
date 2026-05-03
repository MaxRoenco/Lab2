import { FormEvent, useEffect, useMemo, useState } from "react";

type Course = "Acting Fundamentals" | "Scene Study" | "Voice and Movement" | "On-Camera Acting";
type Level = "Beginner" | "Intermediate" | "Advanced";
type Status = "Open" | "Waitlist" | "Closed";
type Theme = "light" | "dark";
type SortMode = "upcoming" | "newest";

type Session = {
  id: string;
  title: string;
  course: Course;
  level: Level;
  date: string;
  time: string;
  mentor: string;
  capacity: number;
  status: Status;
  notes: string;
  liked: boolean;
  createdAt: string;
};

type Filters = {
  search: string;
  course: "All" | Course;
  level: "All" | Level;
  status: "All" | Status;
  favoritesOnly: boolean;
  sort: SortMode;
};

type SessionForm = Omit<Session, "id" | "liked" | "createdAt">;

const SESSION_KEY = "kvadrat_lab6_sessions";
const THEME_KEY = "kvadrat_lab6_theme";
const FILTERS_KEY = "kvadrat_lab6_filters";

const courses: Course[] = [
  "Acting Fundamentals",
  "Scene Study",
  "Voice and Movement",
  "On-Camera Acting",
];
const levels: Level[] = ["Beginner", "Intermediate", "Advanced"];
const statuses: Status[] = ["Open", "Waitlist", "Closed"];

const emptyForm: SessionForm = {
  title: "",
  course: "Acting Fundamentals",
  level: "Beginner",
  date: "",
  time: "",
  mentor: "",
  capacity: 12,
  status: "Open",
  notes: "",
};

const defaultFilters: Filters = {
  search: "",
  course: "All",
  level: "All",
  status: "All",
  favoritesOnly: false,
  sort: "upcoming",
};

const seededSessions: Session[] = [
  {
    id: "seed-scene-study",
    title: "Chekhov Scene Lab",
    course: "Scene Study",
    level: "Intermediate",
    date: "2026-05-08",
    time: "18:30",
    mentor: "Irina Balan",
    capacity: 14,
    status: "Open",
    notes: "Pairs rehearse selected scenes and receive notes on objectives, rhythm, and listening.",
    liked: true,
    createdAt: "2026-04-27T10:00:00.000Z",
  },
  {
    id: "seed-camera",
    title: "Commercial Casting Drill",
    course: "On-Camera Acting",
    level: "Advanced",
    date: "2026-05-11",
    time: "17:00",
    mentor: "Victor Rusu",
    capacity: 10,
    status: "Waitlist",
    notes: "Students record fast audition takes and compare framing, eyeline, and delivery choices.",
    liked: false,
    createdAt: "2026-04-27T10:15:00.000Z",
  },
  {
    id: "seed-voice",
    title: "Breath and Projection Studio",
    course: "Voice and Movement",
    level: "Beginner",
    date: "2026-05-13",
    time: "16:00",
    mentor: "Ana Munteanu",
    capacity: 16,
    status: "Open",
    notes: "Warmups, resonance work, and stage movement exercises for new performers.",
    liked: false,
    createdAt: "2026-04-27T10:30:00.000Z",
  },
  {
    id: "seed-fundamentals",
    title: "First Stage Confidence",
    course: "Acting Fundamentals",
    level: "Beginner",
    date: "2026-05-16",
    time: "11:00",
    mentor: "Mihai Popescu",
    capacity: 18,
    status: "Closed",
    notes: "Group games and short monologues focused on presence, trust, and stage awareness.",
    liked: true,
    createdAt: "2026-04-27T10:45:00.000Z",
  },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getInitialTheme(): Theme {
  const savedTheme = readStorage<Theme | null>(THEME_KEY, null);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function createId() {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

function formatDate(date: string) {
  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function App() {
  const [sessions, setSessions] = useState<Session[]>(() =>
    readStorage<Session[]>(SESSION_KEY, seededSessions),
  );
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [filters, setFilters] = useState<Filters>(() => readStorage<Filters>(FILTERS_KEY, defaultFilters));
  const [form, setForm] = useState<SessionForm>(() => ({
    ...emptyForm,
    date: new Date().toISOString().slice(0, 10),
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  const visibleSessions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const filtered = sessions.filter((session) => {
      const matchesSearch =
        !search ||
        [session.title, session.mentor, session.notes, session.course]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesCourse = filters.course === "All" || session.course === filters.course;
      const matchesLevel = filters.level === "All" || session.level === filters.level;
      const matchesStatus = filters.status === "All" || session.status === filters.status;
      const matchesFavorite = !filters.favoritesOnly || session.liked;

      return matchesSearch && matchesCourse && matchesLevel && matchesStatus && matchesFavorite;
    });

    return filtered.sort((a, b) => {
      if (filters.sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });
  }, [filters, sessions]);

  const favoriteCount = sessions.filter((session) => session.liked).length;
  const openCount = sessions.filter((session) => session.status === "Open").length;
  const totalCapacity = sessions.reduce((sum, session) => sum + session.capacity, 0);

  function updateForm<K extends keyof SessionForm>(key: K, value: SessionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim() || !form.mentor.trim() || !form.date || !form.time) {
      setFormError("Title, mentor, date, and time are required.");
      return;
    }

    if (form.capacity < 1 || form.capacity > 60) {
      setFormError("Capacity must be between 1 and 60 students.");
      return;
    }

    setFormError("");

    if (editingId) {
      setSessions((current) =>
        current.map((session) => (session.id === editingId ? { ...session, ...form } : session)),
      );
      setEditingId(null);
    } else {
      setSessions((current) => [
        {
          ...form,
          id: createId(),
          liked: false,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
    }

    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });
  }

  function editSession(session: Session) {
    const { id: _id, liked: _liked, createdAt: _createdAt, ...editableSession } = session;
    setForm(editableSession);
    setEditingId(session.id);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });
    setFormError("");
  }

  function toggleLike(id: string) {
    setSessions((current) =>
      current.map((session) =>
        session.id === id ? { ...session, liked: !session.liked } : session,
      ),
    );
  }

  function deleteSession(id: string) {
    setSessions((current) => current.filter((session) => session.id !== id));
    if (editingId === id) {
      cancelEdit();
    }
  }

  function resetDemoData() {
    setSessions(seededSessions);
    setFilters(defaultFilters);
    cancelEdit();
  }

  return (
    <main className="app-shell">
      <section className="planner-header" aria-labelledby="app-title">
        <div className="brand-mark" aria-hidden="true">
          K
        </div>
        <div>
          <p className="eyebrow">Lab 6 client app</p>
          <h1 id="app-title">Kvadrat Studio Planner</h1>
          <p className="intro">
            Plan acting academy sessions, keep favorite rehearsals close, and filter the studio calendar
            from a fully client-side React interface.
          </p>
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
          <span aria-hidden="true">{theme === "light" ? "Dark" : "Light"}</span>
        </button>
      </section>

      <section className="stats-grid" aria-label="Planner summary">
        <article className="metric">
          <span>Total sessions</span>
          <strong>{sessions.length}</strong>
        </article>
        <article className="metric">
          <span>Open sessions</span>
          <strong>{openCount}</strong>
        </article>
        <article className="metric">
          <span>Favorite picks</span>
          <strong>{favoriteCount}</strong>
        </article>
        <article className="metric">
          <span>Studio capacity</span>
          <strong>{totalCapacity}</strong>
        </article>
      </section>

      <div className="planner-layout">
        <section className="panel form-panel" aria-labelledby="form-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Session desk</p>
              <h2 id="form-title">{editingId ? "Edit session" : "Add session"}</h2>
            </div>
            {editingId ? (
              <button className="ghost-button" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="session-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Improvisation lab"
              />
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="course">Course</label>
                <select
                  id="course"
                  value={form.course}
                  onChange={(event) => updateForm("course", event.target.value as Course)}
                >
                  {courses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="level">Level</label>
                <select
                  id="level"
                  value={form.level}
                  onChange={(event) => updateForm("level", event.target.value as Level)}
                >
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) => updateForm("date", event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="time">Time</label>
                <input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={(event) => updateForm("time", event.target.value)}
                />
              </div>
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="mentor">Mentor</label>
                <input
                  id="mentor"
                  value={form.mentor}
                  onChange={(event) => updateForm("mentor", event.target.value)}
                  placeholder="Mentor name"
                />
              </div>

              <div className="field">
                <label htmlFor="capacity">Capacity</label>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  max="60"
                  value={form.capacity}
                  onChange={(event) => updateForm("capacity", Number(event.target.value))}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value as Status)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Focus, scene material, rehearsal goals..."
                rows={4}
              />
            </div>

            {formError ? (
              <p className="form-error" role="alert">
                {formError}
              </p>
            ) : null}

            <button className="primary-button" type="submit">
              {editingId ? "Save changes" : "Add session"}
            </button>
          </form>
        </section>

        <section className="sessions-area" aria-labelledby="sessions-title">
          <div className="panel filters-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Filters</p>
                <h2 id="sessions-title">Studio calendar</h2>
              </div>
              <button className="ghost-button" type="button" onClick={resetDemoData}>
                Reset demo
              </button>
            </div>

            <div className="filters-grid">
              <div className="field">
                <label htmlFor="search">Search</label>
                <input
                  id="search"
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  placeholder="Title, mentor, notes..."
                />
              </div>

              <div className="field">
                <label htmlFor="filter-course">Course</label>
                <select
                  id="filter-course"
                  value={filters.course}
                  onChange={(event) =>
                    setFilters({ ...filters, course: event.target.value as Filters["course"] })
                  }
                >
                  <option value="All">All courses</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="filter-level">Level</label>
                <select
                  id="filter-level"
                  value={filters.level}
                  onChange={(event) =>
                    setFilters({ ...filters, level: event.target.value as Filters["level"] })
                  }
                >
                  <option value="All">All levels</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="filter-status">Status</label>
                <select
                  id="filter-status"
                  value={filters.status}
                  onChange={(event) =>
                    setFilters({ ...filters, status: event.target.value as Filters["status"] })
                  }
                >
                  <option value="All">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="sort">Sort</label>
                <select
                  id="sort"
                  value={filters.sort}
                  onChange={(event) => setFilters({ ...filters, sort: event.target.value as SortMode })}
                >
                  <option value="upcoming">Upcoming first</option>
                  <option value="newest">Newest first</option>
                </select>
              </div>

              <label className="check-control">
                <input
                  type="checkbox"
                  checked={filters.favoritesOnly}
                  onChange={(event) =>
                    setFilters({ ...filters, favoritesOnly: event.target.checked })
                  }
                />
                Favorites only
              </label>
            </div>
          </div>

          {visibleSessions.length > 0 ? (
            <div className="session-list" role="list">
              {visibleSessions.map((session) => (
                <article className="session-card" key={session.id} role="listitem">
                  <div className="card-topline">
                    <span className={`status-pill status-${session.status.toLowerCase()}`}>
                      {session.status}
                    </span>
                    <button
                      className={`like-button ${session.liked ? "is-liked" : ""}`}
                      type="button"
                      onClick={() => toggleLike(session.id)}
                      aria-label={`${session.liked ? "Remove" : "Add"} ${session.title} ${
                        session.liked ? "from" : "to"
                      } favorites`}
                    >
                      {session.liked ? "Liked" : "Like"}
                    </button>
                  </div>

                  <h3>{session.title}</h3>
                  <p className="session-notes">{session.notes}</p>

                  <dl className="session-meta">
                    <div>
                      <dt>Course</dt>
                      <dd>{session.course}</dd>
                    </div>
                    <div>
                      <dt>Level</dt>
                      <dd>{session.level}</dd>
                    </div>
                    <div>
                      <dt>Date</dt>
                      <dd>
                        {formatDate(session.date)} at {session.time}
                      </dd>
                    </div>
                    <div>
                      <dt>Mentor</dt>
                      <dd>{session.mentor}</dd>
                    </div>
                    <div>
                      <dt>Capacity</dt>
                      <dd>{session.capacity} students</dd>
                    </div>
                  </dl>

                  <div className="card-actions">
                    <button className="secondary-button" type="button" onClick={() => editSession(session)}>
                      Edit
                    </button>
                    <button className="danger-button" type="button" onClick={() => deleteSession(session.id)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No sessions match these filters</h3>
              <p>Change the search, show all statuses, or reset the demo data to bring sessions back.</p>
              <button className="primary-button" type="button" onClick={() => setFilters(defaultFilters)}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
