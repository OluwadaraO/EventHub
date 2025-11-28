import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationsPage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("token");

function formatDateTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString();
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

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
        return;
      }

      const data = await res.json();
      setNotifications(data.notifications || []);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="notifications-page">
      <div className="notifications-page-header">
        <button
          className="secondary-btn"
          onClick={() => navigate("/home")}
        >
          ← Back to dashboard
        </button>
        <h1>Notifications</h1>
      </div>

      <div className="notifications-page-content">
        {isLoading && <p>Loading notifications...</p>}

        {!isLoading && notifications.length === 0 && (
          <p className="notifications-page-empty">
            You don’t have any notifications yet.
          </p>
        )}

        {!isLoading && notifications.length > 0 && (
          <ul className="notifications-page-list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={
                  "notifications-page-item" +
                  (n.readAt ? "" : " notifications-page-item-unread")
                }
              >
                <div className="notifications-page-top">
                  <span className="notifications-page-type">
                    {n.type.replace("EVENT_", "").replace("_", " ")}
                  </span>
                  <span className="notifications-page-time">
                    {formatDateTime(n.createdAt)}
                  </span>
                </div>

                <p className="notifications-page-message">{n.message}</p>

                {n.event?.title && (
                  <p className="notifications-page-event">
                    Event: <strong>{n.event.title}</strong>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
