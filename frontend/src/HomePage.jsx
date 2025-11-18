// HomePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

  const getToken = () => localStorage.getItem("token");

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

// Step 1: just scrape and show preview
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
    setPreviewEvent(scraped);        // 👈 store preview
  } catch (err) {
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};

// Step 2: user confirmed -> save to their dashboard
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

  return (
    <div className="home-page">
      <header className="home-hero">
        <div>
          <h1>
            Welcome{user && user.name ? `, ${user.name}` : " to EventHub!"}
          </h1>
          <p>Say bye to forgetting events</p>
        </div>
        <button onClick={handleLogout} className="secondary-btn">
          Logout
        </button>
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

      {/* Step 1: URL input + "Fetch details" */}
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

      {/* Step 2: show preview if we have one */}
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
        <h2>Saved Events</h2>

        {savedEvents.length === 0 ? (
          <p className="empty-state">
            You don’t have any saved events yet. Click{" "}
            <strong>“Add event from link”</strong> to get started.
          </p>
        ) : (
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
        )}
      </section>
    </div>
  );
}

export default HomePage;
