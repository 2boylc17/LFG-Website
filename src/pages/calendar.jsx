import React, { useMemo, useState } from "react";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const storageKey = "lfg-calendar-events";

// Format date to YYYY-MM-DD key
const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Read stored events from localStorage
const readStoredEvents = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
};

const formatMonthYear = (date) =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

// Format date to readable string
const formatReadableDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
};

// Sort events chronologically
const sortEventsByTime = (events) =>
  [...events].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

export default function Calendar() {
  // Date & view state
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  // Event storage
  const [eventsByDate, setEventsByDate] = useState(() => readStoredEvents());
  // Form input state
  const [titleInput, setTitleInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [editingEventId, setEditingEventId] = useState(null);

  // Generate 6-week calendar grid starting from first day
  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const firstGridDay = new Date(year, month, 1 - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstGridDay);
      date.setDate(firstGridDay.getDate() + index);
      return {
        key: toDateKey(date),
        date,
        isCurrentMonth: date.getMonth() === month
      };
    });
  }, [viewDate]);

  const selectedEvents = eventsByDate[selectedDateKey] || [];
  const yearOptions = Array.from({ length: 17 }, (_, index) => now.getFullYear() - 8 + index);

  // Save events to localStorage
  const saveEvents = (nextEventsByDate) => {
    setEventsByDate(nextEventsByDate);
    localStorage.setItem(storageKey, JSON.stringify(nextEventsByDate));
  };

  // Clear form inputs
  const clearForm = () => {
    setTitleInput("");
    setTimeInput("");
    setEditingEventId(null);
  };

  // Add new event or update existing
  const addOrUpdateEvent = (e) => {
    e.preventDefault();
    const title = titleInput.trim();
    if (!title || !selectedDateKey) return;

    let nextEventsForDate;
    if (editingEventId) {
      nextEventsForDate = selectedEvents.map((event) => {
        if (event.id !== editingEventId) return event;
        return { ...event, title, time: timeInput };
      });
    } else {
      nextEventsForDate = [
        ...selectedEvents,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          time: timeInput
        }
      ];
    }

    nextEventsForDate = sortEventsByTime(nextEventsForDate);

    saveEvents({
      ...eventsByDate,
      [selectedDateKey]: nextEventsForDate
    });

    clearForm();
  };

  // Remove event from date
  const removeEvent = (eventId) => {
    const nextEventsForDate = selectedEvents.filter((event) => event.id !== eventId);
    const nextEventsByDate = { ...eventsByDate };

    if (nextEventsForDate.length) {
      nextEventsByDate[selectedDateKey] = nextEventsForDate;
    } else {
      delete nextEventsByDate[selectedDateKey];
    }

    saveEvents(nextEventsByDate);

    if (editingEventId === eventId) clearForm();
  };

  // Load event into editor
  const startEditingEvent = (event) => {
    setEditingEventId(event.id);
    setTitleInput(event.title);
    setTimeInput(event.time || "");
  };

  // Navigate month view
  const moveMonth = (direction) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  // Go to current month & day
  const jumpToToday = () => {
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toDateKey(now));
  };

  // Navigate to specific month/year
  const jumpToMonthYear = (month, year) => {
    setViewDate(new Date(year, month, 1));
  };

  return (
    <section className="calendar-page">
      <div className="calendar-toolbar">
        {/* WCAG 2.4.6 Headings and Labels plus 4.1.2 Name, Role, Value: give the previous-month button a descriptive accessible name beyond its short visible text. */}
        <button type="button" className="calendar-nav-btn" onClick={() => moveMonth(-1)} aria-label="Go to previous month">
          Prev
        </button>
        <h1>{formatMonthYear(viewDate)}</h1>
        {/* WCAG 2.4.6 Headings and Labels plus 4.1.2 Name, Role, Value: give the next-month button a descriptive accessible name beyond its short visible text. */}
        <button type="button" className="calendar-nav-btn" onClick={() => moveMonth(1)} aria-label="Go to next month">
          Next
        </button>
        <div className="calendar-jump-group">
          <select
            aria-label="Select month"
            value={viewDate.getMonth()}
            onChange={(e) => jumpToMonthYear(Number(e.target.value), viewDate.getFullYear())}
          >
            {Array.from({ length: 12 }, (_, monthIndex) => (
              <option key={monthIndex} value={monthIndex}>
                {new Date(2000, monthIndex, 1).toLocaleString(undefined, { month: "long" })}
              </option>
            ))}
          </select>
          <select
            aria-label="Select year"
            value={viewDate.getFullYear()}
            onChange={(e) => jumpToMonthYear(viewDate.getMonth(), Number(e.target.value))}
          >
            {yearOptions.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="calendar-today-btn" onClick={jumpToToday}>
          Today
        </button>
      </div>

      <div className="calendar-grid-wrapper">
        <div className="calendar-grid" role="grid" aria-label="Monthly calendar">
          {weekdays.map((weekday) => (
            <div key={weekday} className="calendar-weekday" role="columnheader">
              {weekday}
            </div>
          ))}

          {monthGrid.map((cell) => {
            const dayEvents = eventsByDate[cell.key] || [];
            const isSelected = selectedDateKey === cell.key;

            return (
              /* WCAG 4.1.2 Name, Role, Value: expose each day cell with a full spoken date, event count, and selected state. */
              <button
                key={cell.key}
                type="button"
                className={`calendar-day ${cell.isCurrentMonth ? "" : "outside-month"} ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedDateKey(cell.key)}
                aria-label={`${formatReadableDate(cell.key)}${dayEvents.length > 0 ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ''}`}
                aria-pressed={isSelected}
              >
                <span className="calendar-day-number">{cell.date.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className="calendar-event-count">{dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="calendar-events-panel">
        <h2>{selectedDateKey ? formatReadableDate(selectedDateKey) : "Choose a date"}</h2>

        <form className="calendar-event-form" onSubmit={addOrUpdateEvent}>
          {/* WCAG 3.3.2 Labels or Instructions: give the event title field a persistent programmatic label. */}
          <input
            className="calendar-event-title-input"
            type="text"
            placeholder="Event title"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            aria-label="Event title"
            required
          />
          {/* WCAG 3.3.2 Labels or Instructions: give the event time field a persistent programmatic label. */}
          <input
            className="calendar-event-time-input"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            aria-label="Event time"
          />
          <button className="calendar-submit-btn" type="submit">{editingEventId ? "Save Event" : "Add Event"}</button>
          {editingEventId && (
            <button type="button" className="calendar-cancel-btn" onClick={clearForm}>
              Cancel
            </button>
          )}
        </form>

        {/* WCAG 4.1.3 Status Messages: announce event-list updates when the selected day changes or events are added and removed. */}
        <div className="calendar-event-list" aria-live="polite">
          {selectedEvents.length === 0 && <p>No events for this date yet.</p>}
          {selectedEvents.map((event) => (
            <article key={event.id} className="calendar-event-item">
              <div className="calendar-event-text">
                <strong>{event.title}</strong>
                <p>{event.time || "Any time"}</p>
              </div>
              <div className="calendar-event-actions">
                <button type="button" onClick={() => startEditingEvent(event)}>
                  Edit
                </button>
                <button type="button" onClick={() => removeEvent(event.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
