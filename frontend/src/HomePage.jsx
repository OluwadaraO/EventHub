import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("token");

function NotificationsBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) return [];

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error("Failed to fetch notifications");
        setIsLoading(false);
        return [];
      }

      const data = await res.json();
      const list = data.notifications || [];
      setNotifications(list);
      setIsLoading(false);
      return list;
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setIsLoading(false);
      return [];
    }
  };

  const markAllUnreadAsRead = async (list) => {
    const token = getToken();
    if (!token) return;

    const unread = (list || notifications).filter((n) => !n.readAt);
    if (unread.length === 0) return;

    try {
      await Promise.all(
        unread.map((notif) =>
          fetch(`${API_BASE}/notifications/${notif.id}/read`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.readAt ? n : { ...n, readAt: new Date().toISOString() }
        )
      );
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const toggleDropdown = async () => {
    const opening = !isOpen;
    setIsOpen(opening);

    if (opening) {
      const list = await fetchNotifications();
      await markAllUnreadAsRead(list);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="notifications-wrapper">
      <button
        type="button"
        onClick={toggleDropdown}
        className="notifications-bell"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">Notifications</div>

          {isLoading && (
            <div className="notifications-empty">Loading...</div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="notifications-empty">
              No notifications yet.
            </div>
          )}

          {!isLoading &&
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={
                  "notifications-item" +
                  (notif.readAt ? "" : " notifications-item-unread")
                }
              >
                <div className="notifications-message">
                  {notif.message}
                </div>

                {notif.event?.title && (
                  <div className="notifications-event">
                    Event: <strong>{notif.event.title}</strong>
                  </div>
                )}

                <div className="notifications-time">
                  {formatDateTime(notif.createdAt)}
                </div>
              </div>
            ))}
            <div className="notifications-footer">
              <button
                type="button"
                className="notifications-view-all-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notifications");
                }}
              >
                View all notifications →
              </button>
            </div>
        </div>
      )}
    </div>
  );
}

function SavedEventsCalendar({ savedEvents }) {
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const eventsByDate = savedEvents.reduce((acc, ev) => {
    if (!ev.startTime) return acc;
    const d = new Date(ev.startTime);
    const key = d.toISOString().split("T")[0];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(ev);
    return acc;
  }, {});

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = startOfMonth.getDay();

  const todayKey = new Date().toISOString().split("T")[0];

  const dayCells = [];
  for (let i = 0; i < startWeekday; i += 1) {
    dayCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(year, month, day);
    const key = dateObj.toISOString().split("T")[0];
    dayCells.push({ day, key });
  }
  while (dayCells.length < 42) {
    dayCells.push(null);
  }

  const handlePrevMonth = () => {
    setMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setMonthDate(new Date(year, month + 1, 1));
  };

  const monthLabel = monthDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      <div className="calendar-wrapper">
        <div className="calendar-header">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
          >
            ‹
          </button>
          <div className="calendar-month-label">{monthLabel}</div>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
          >
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="calendar-day-header">
              {d}
            </div>
          ))}

          {dayCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="calendar-day empty" />;
            }

            const dayEvents = eventsByDate[cell.key] || [];
            const isToday = cell.key === todayKey;
            const displayEvents = dayEvents.slice(0, 3);
            const hasMore = dayEvents.length > 3;

            let className = "calendar-day";
            if (isToday) className += " today";

            return (
              <div key={cell.key} className={className}>
                <span className="calendar-day-number">{cell.day}</span>
                
                {displayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="calendar-event-item-inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(ev);
                    }}
                  >
                    {ev.startTime && (
                      <span className="calendar-event-time">
                        {formatTime(ev.startTime)}
                      </span>
                    )}
                    <span className="calendar-event-title-inline">
                      {ev.title}
                    </span>
                  </div>
                ))}
                
                {hasMore && (
                  <div className="calendar-more-events">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedEvent && (
        <div
          className="event-detail-modal"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="event-detail-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="event-detail-header">
              <h3>{selectedEvent.title}</h3>
              <button
                type="button"
                className="event-detail-close"
                onClick={() => setSelectedEvent(null)}
              >
                ×
              </button>
            </div>

            <div className="event-detail-body">
              {selectedEvent.startTime && (
                <div className="event-detail-row">
                  <div className="event-detail-icon">🕐</div>
                  <div className="event-detail-info">
                    <div className="event-detail-label">Date & Time</div>
                    <div className="event-detail-value">
                      {new Date(selectedEvent.startTime).toLocaleString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.venue?.name && (
                <div className="event-detail-row">
                  <div className="event-detail-icon">📍</div>
                  <div className="event-detail-info">
                    <div className="event-detail-label">Location</div>
                    <div className="event-detail-value">
                      {selectedEvent.venue.name}
                      {selectedEvent.venue.city && ` — ${selectedEvent.venue.city}`}
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.url && (
                <div className="event-detail-row">
                  <div className="event-detail-icon">🔗</div>
                  <div className="event-detail-info">
                    <div className="event-detail-label">Event Link</div>
                    <div className="event-detail-value">
                      <a
                        href={selectedEvent.url}
                        target="_blank"
                        rel="noreferrer"
                        className="event-detail-link"
                      >
                        View original event page →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.imageUrl && (
                <div className="event-detail-row">
                  <div className="event-detail-info">
                    <img
                      src={selectedEvent.imageUrl}
                      alt={selectedEvent.title}
                      className="event-detail-image"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HomePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewEvent, setPreviewEvent] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  const fetchMe = async () => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        console.error("Failed to load user");
        return;
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const fetchSavedEvents = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/events/saved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error("Failed to load saved events");
        return;
      }

      const data = await res.json();
      setSavedEvents(data);
    } catch (err) {
      console.error("Error loading saved events:", err);
    }
  };

  useEffect(() => {
    fetchMe();
    fetchSavedEvents();
  }, []);

const handleFetchDetails = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccess("");
  setPreviewEvent(null);

  const token = getToken();
  if (!token) {
    setError("You must be logged in to add events.");
    setLoading(false);
    return;
  }

  try {
    const scrapeRes = await fetch(`${API_BASE}/events/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!scrapeRes.ok) {
      const errData = await scrapeRes.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to scrape event");
    }

    const scraped = await scrapeRes.json();
    setPreviewEvent(scraped);
  } catch (err) {
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};

const handleConfirmSave = async () => {
  if (!previewEvent) return;

  const token = getToken();
  if (!token) {
    setError("You must be logged in to save events.");
    return;
  }

  setLoading(true);
  setError("");
  setSuccess("");

  try {
    const saveRes = await fetch(`${API_BASE}/events/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ eventId: previewEvent.id }), // 👈 use preview id
    });

    if (!saveRes.ok) {
      const errData = await saveRes.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to save event");
    }

    setSuccess("Event added to your dashboard!");
    setUrl("");
    setPreviewEvent(null);
    setShowForm(false);
    await fetchSavedEvents();
  } catch (err) {
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};


  const handleRemove = async (eventId) => {
    const token = getToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE}/events/save/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchSavedEvents();
    } catch (err) {
      console.error("Failed to remove event", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const closeModal = () => {
    setShowForm(false);
    setError("");
    setSuccess("");
    setUrl("");
  };
  const now = new Date();
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(now.getDate() + 7);

  const upcomingCount = savedEvents.filter((ev) => {
    if (!ev.startTime) return false;
    const start = new Date(ev.startTime);
    return start >= now && start <= oneWeekFromNow;
  }).length;


  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-center">
          <h1>
            Welcome{user && user.name ? `, ${user.name}` : " to EventHub!"}
          </h1>
          <p>Say bye to forgetting events</p>
        </div>

        <div className="header-right">
          <NotificationsBell />
          <button onClick={handleLogout} className="secondary-btn">
            Logout
          </button>
        </div>
      </header>


      <div className="home-actions">
        <button onClick={() => setShowForm(true)} className="primary-btn">
          + Add event from link
        </button>
      </div>
{showForm && (
  <div className="modal-backdrop" onClick={closeModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Add an Event</h2>
        <button
          type="button"
          className="modal-close"
          onClick={closeModal}
        >
          ×
        </button>
      </div>

      <p className="modal-subtitle">
        Paste a link to an event page you found online.
      </p>
      <form onSubmit={handleFetchDetails}>
        <label className="field">
          <span>Event URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/event-page"
            required
          />
        </label>

        {error && <div className="error-text">{error}</div>}
        {success && <div className="success-text">{success}</div>}

        <div className="form-buttons">
          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Fetching..." : "Fetch details"}
          </button>
          <button
            type="button"
            onClick={closeModal}
            className="secondary-btn"
          >
            Cancel
          </button>
        </div>
      </form>
      {previewEvent && (
        <div className="preview-card">
          <h3>{previewEvent.title}</h3>
          {previewEvent.startTime && (
            <p>
              {new Date(previewEvent.startTime).toLocaleString()}
            </p>
          )}
          {previewEvent.venue?.name && (
            <p>
              {previewEvent.venue.name}
              {previewEvent.venue.city ? ` — ${previewEvent.venue.city}` : ""}
            </p>
          )}
          <a
            href={previewEvent.url}
            target="_blank"
            rel="noreferrer"
            className="preview-link"
          >
            View original page
          </a>

          <div className="preview-actions">
            <button
              onClick={handleConfirmSave}
              disabled={loading}
              className="primary-btn"
            >
              {loading ? "Saving..." : "Save to my events"}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}

    <section className="saved-events-section">
      <div className="saved-events-header">
        <h2>Saved Events</h2>
        {upcomingCount > 0 && (
        <span className="saved-events-badge">
          {upcomingCount} event{upcomingCount > 1 ? "s" : ""} in the next week
        </span>
        )}

        <button
          type="button"
          className="secondary-btn view-toggle-btn"
          onClick={() =>
            setViewMode(viewMode === "list" ? "calendar" : "list")
          }
        >
        {viewMode === "list" ? "Calendar view" : "List view"}
        </button>
      </div>

      {savedEvents.length === 0 ? (
        <p className="empty-state">
          You don’t have any saved events yet. Click{" "}
          <strong>“Add event from link”</strong> to get started.
        </p>
      ) : viewMode === "list" ? (
        <ul className="saved-events-list">
          {savedEvents.map((ev) => (
            <li key={ev.id} className="event-card">
            {ev.imageUrl && (
              <img
                src={ev.imageUrl}
                alt={ev.title}
                className="event-image"
              />
            )}
            <div className="event-info">
              <h3 className="event-title">
                <a href={ev.url} target="_blank" rel="noreferrer">
                  {ev.title}
                </a>
              </h3>
              {ev.startTime && (
                <p className="event-meta">
                  {new Date(ev.startTime).toLocaleString()}
                </p>
              )}
              {ev.venue?.name && (
                <p className="event-meta">
                  {ev.venue.name}
                  {ev.venue.city ? ` — ${ev.venue.city}` : ""}
                </p>
              )}
              <button
                onClick={() => handleRemove(ev.id)}
                className="secondary-btn small"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      ) : (
      <SavedEventsCalendar savedEvents={savedEvents} />
      )}
    </section>
  </div>
  );
}

export default HomePage;
