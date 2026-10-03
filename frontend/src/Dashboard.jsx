import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./Dashboard.css";
import CTFArena from "./CTFArena";
import AIAssistant from "./AIAssistant";

const API = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");

  const [schedule, setSchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem("kokand_token");

  /* =========================================================
     API
  ========================================================= */

  async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Server xatosi");
    }

    return data;
  }

  /* =========================================================
     LOAD DATA
  ========================================================= */

  async function loadData() {
    try {
      setLoading(true);

      const [
        scheduleData,
        announcementsData,
        tasksData,
        dashboardData,
      ] = await Promise.all([
        apiRequest("/schedule"),
        apiRequest("/announcements"),
        apiRequest("/tasks"),
        apiRequest("/dashboard"),
      ]);

      setSchedule(scheduleData.schedule || []);
      setAnnouncements(announcementsData.announcements || []);
      setTasks(tasksData.tasks || []);
      setDashboard(dashboardData);
    } catch (error) {
      console.error("Dashboard yuklash xatosi:", error);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     LOAD CHAT HISTORY
  ========================================================= */

  async function loadChatMessages() {
    try {
      setChatLoading(true);

      const data = await apiRequest("/chat/messages");

      setMessages(data.messages || []);
    } catch (error) {
      console.error("Chat yuklash xatosi:", error);
    } finally {
      setChatLoading(false);
    }
  }

  /* =========================================================
     SOCKET.IO
  ========================================================= */

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket.IO connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO error:", error.message);
    });

    socket.on("chat:new-message", (message) => {
      setMessages((previous) => {
        const exists = previous.some(
          (item) => item.id === message.id
        );

        if (exists) {
          return previous;
        }

        return [...previous, message];
      });
    });

    socket.on("chat:online-users", (users) => {
      setOnlineUsers(users || []);
    });

    socket.on("chat:user-online", () => {
      loadChatMessages();
    });

    socket.on("chat:user-offline", () => {
      // Online users list is updated by chat:online-users.
    });

    socket.on("chat:typing", (data) => {
      if (
        data.user_id === user?.id ||
        !data.isTyping
      ) {
        setTypingUser(null);
        return;
      }

      setTypingUser(data);

      clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser(null);
      }, 2500);
    });

    socket.on("chat:error", (data) => {
      console.error("Chat error:", data?.message);
    });

    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id]);

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadData();
    loadChatMessages();
  }, []);

  /* =========================================================
     AUTO SCROLL CHAT
  ========================================================= */

  useEffect(() => {
    if (activePage === "chat") {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, activePage]);

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  function sendMessage(event) {
    event.preventDefault();

    const text = chatMessage.trim();

    if (!text) return;

    if (!socketRef.current) {
      console.error("Socket ulanmagan");
      return;
    }

    socketRef.current.emit("chat:send", {
      message: text,
    });

    setChatMessage("");

    socketRef.current.emit("chat:typing", false);
  }

  /* =========================================================
     TYPING
  ========================================================= */

  function handleChatInput(event) {
    const value = event.target.value;

    setChatMessage(value);

    if (!socketRef.current) return;

    socketRef.current.emit(
      "chat:typing",
      value.trim().length > 0
    );

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("chat:typing", false);
    }, 1200);
  }

  /* =========================================================
     HELPERS
  ========================================================= */

  const firstName =
    user?.first_name ||
    user?.full_name?.split(" ")[0] ||
    user?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Student";

  const fullName =
    user?.full_name ||
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    firstName;

  const navItems = [
    {
      id: "dashboard",
      icon: "⌂",
      label: "Dashboard",
    },
    {
      id: "schedule",
      icon: "▣",
      label: "Raspisaniya",
    },
    {
      id: "announcements",
      icon: "◉",
      label: "E'lonlar",
    },
    {
      id: "tasks",
      icon: "✓",
      label: "Vazifalar",
    },
    {
      id: "projects",
      icon: "◆",
      label: "Loyihalar",
    },
    {
      id: "chat",
      icon: "☷",
      label: "Guruh",
    },
    {
      id: "ctf",
      icon: "⚡",
      label: "CTF Arena",
    },
    {
      id: "security",
      icon: "♢",
      label: "Security Report",
    },
    {
      id: "ai",
      icon: "✦",
      label: "AI Assistant",
    },
  ];

  function getInitials(first, last) {
    return `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();
  }

  function formatMessageTime(dateString) {
    if (!dateString) return "";

    const date = new Date(
      dateString.includes("T")
        ? dateString
        : dateString.replace(" ", "T") + "Z"
    );

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isOwnMessage(message) {
    return Number(message.user_id) === Number(user?.id);
  }

  /* =========================================================
     PAGE: SCHEDULE
  ========================================================= */

  function renderSchedule() {
    return (
      <section className="content-section">
        <div className="page-title">
          <div>
            <span className="eyebrow">ACADEMIC</span>
            <h1>Raspisaniya</h1>
            <p>Dars jadvali va mashg‘ulotlar</p>
          </div>
        </div>

        <div className="data-card">
          {schedule.length === 0 ? (
            <div className="empty-state">
              <span>▣</span>
              <h3>Hozircha raspisaniya yo‘q</h3>
              <p>
                Admin dars jadvalini kiritgandan keyin shu yerda
                chiqadi.
              </p>
            </div>
          ) : (
            <div className="schedule-list">
              {schedule.map((item) => (
                <div
                  className="schedule-row"
                  key={item.id}
                >
                  <div className="schedule-time">
                    {item.start_time || "--:--"}
                  </div>

                  <div className="schedule-info">
                    <strong>{item.subject}</strong>
                    <span>
                      {item.teacher ||
                        "O‘qituvchi belgilanmagan"}
                    </span>
                  </div>

                  <div className="schedule-room">
                    {item.room || "—"}
                  </div>

                  <div className="schedule-day">
                    {item.day || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  /* =========================================================
     PAGE: ANNOUNCEMENTS
  ========================================================= */

  function renderAnnouncements() {
    return (
      <section className="content-section">
        <div className="page-title">
          <div>
            <span className="eyebrow">CAMPUS</span>
            <h1>E'lonlar</h1>
            <p>Universitet va fakultet yangiliklari</p>
          </div>
        </div>

        <div className="announcement-grid">
          {announcements.length === 0 ? (
            <div className="empty-state">
              <span>◉</span>
              <h3>Hozircha e'lonlar yo‘q</h3>
              <p>
                Yangi e'lonlar admin tomonidan joylashtiriladi.
              </p>
            </div>
          ) : (
            announcements.map((item) => (
              <article
                className="announcement-card"
                key={item.id}
              >
                <div className="announcement-top">
                  <span className="announcement-badge">
                    ANNOUNCEMENT
                  </span>

                  <span>
                    {item.created_at?.slice(0, 10)}
                  </span>
                </div>

                <h3>{item.title}</h3>

                <p>{item.content}</p>

                <div className="announcement-author">
                  Admin • Kokand Cyber Campus
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  /* =========================================================
     PAGE: TASKS
  ========================================================= */

  function renderTasks() {
    return (
      <section className="content-section">
        <div className="page-title">
          <div>
            <span className="eyebrow">ACADEMIC</span>
            <h1>Vazifalar</h1>
            <p>Topshiriqlar va deadline'lar</p>
          </div>
        </div>

        <div className="task-grid">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <span>✓</span>
              <h3>Hozircha vazifalar yo‘q</h3>
              <p>
                Admin yangi topshiriq joylashtirganda shu
                yerda ko‘rinadi.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <article
                className="task-card"
                key={task.id}
              >
                <div className="task-status">
                  OPEN
                </div>

                <h3>{task.title}</h3>

                <p>
                  {task.description ||
                    "Vazifa tavsifi mavjud emas."}
                </p>

                <div className="task-footer">
                  Deadline:{" "}
                  {task.deadline?.slice(0, 16) ||
                    "Belgilanmagan"}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  /* =========================================================
     PAGE: CHAT
  ========================================================= */

  function renderChat() {
    return (
      <section className="content-section chat-section">
        <div className="page-title">
          <div>
            <span className="eyebrow">COMMUNITY</span>

            <h1>Cyber Group</h1>

            <p>
              Cybersecurity fakulteti studentlari bilan
              real-time muloqot
            </p>
          </div>

          <div className="chat-connection-status">
            <span className="chat-live-dot"></span>
            LIVE
          </div>
        </div>

        <div className="chat-layout">
          <div className="chat-main">
            <div className="chat-header">
              <div className="chat-group-avatar">
                K
              </div>

              <div>
                <strong>
                  Cybersecurity 2026
                </strong>

                <span>
                  {onlineUsers.length} online
                </span>
              </div>

              <div className="chat-header-status">
                <span></span>
                SECURE CHAT
              </div>
            </div>

            <div className="messages-area">
              {chatLoading ? (
                <div className="chat-loading">
                  <div className="loader"></div>
                  <span>
                    Xabarlar yuklanmoqda...
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-icon">
                    ☷
                  </div>

                  <h3>
                    Guruh chatiga xush kelibsiz
                  </h3>

                  <p>
                    Birinchi xabarni siz yuboring.
                  </p>
                </div>
              ) : (
                <>
                  <div className="chat-date-divider">
                    <span>
                      BUGUN
                    </span>
                  </div>

                  {messages.map((message) => {
                    const own =
                      isOwnMessage(message);

                    return (
                      <div
                        className={`message-row ${
                          own ? "own" : ""
                        }`}
                        key={message.id}
                      >
                        {!own && (
                          <div
                            className={`message-avatar ${
                              message.role === "ADMIN"
                                ? "admin-avatar"
                                : ""
                            }`}
                          >
                            {getInitials(
                              message.first_name,
                              message.last_name
                            )}
                          </div>
                        )}

                        <div className="message-content">
                          {!own && (
                            <div className="message-author">
                              <strong>
                                {message.first_name}{" "}
                                {message.last_name}
                              </strong>

                              {message.role ===
                                "ADMIN" && (
                                <span className="admin-tag">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            className={`message-bubble ${
                              own
                                ? "own-bubble"
                                : ""
                            }`}
                          >
                            <span>
                              {message.message}
                            </span>

                            <small>
                              {formatMessageTime(
                                message.created_at
                              )}
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="typing-area">
              {typingUser && (
                <div className="typing-indicator">
                  <span>
                    {typingUser.first_name} yozmoqda
                  </span>

                  <i></i>
                  <i></i>
                  <i></i>
                </div>
              )}
            </div>

            <form
              className="chat-input-area"
              onSubmit={sendMessage}
            >
              <button
                type="button"
                className="chat-tool-button"
                title="Emoji"
              >
                ☺
              </button>

              <input
                type="text"
                value={chatMessage}
                onChange={handleChatInput}
                placeholder="Xabar yozing..."
                maxLength={2000}
                autoComplete="off"
              />

              <span className="message-counter">
                {chatMessage.length}/2000
              </span>

              <button
                type="submit"
                className="send-message-button"
                disabled={!chatMessage.trim()}
              >
                ➤
              </button>
            </form>
          </div>

          <aside className="chat-members">
            <div className="members-header">
              <div>
                <span className="eyebrow">
                  MEMBERS
                </span>

                <h3>
                  Online
                </h3>
              </div>

              <span className="online-count">
                {onlineUsers.length}
              </span>
            </div>

            <div className="members-list">
              {onlineUsers.length === 0 ? (
                <div className="no-online">
                  Hozircha online user yo‘q
                </div>
              ) : (
                onlineUsers.map((member) => (
                  <div
                    className="member-item"
                    key={member.id}
                  >
                    <div
                      className={`member-avatar ${
                        member.role === "ADMIN"
                          ? "admin-avatar"
                          : ""
                      }`}
                    >
                      {getInitials(
                        member.first_name,
                        member.last_name
                      )}

                      <span className="member-online"></span>
                    </div>

                    <div className="member-info">
                      <strong>
                        {member.first_name}{" "}
                        {member.last_name}
                      </strong>

                      <span>
                        {member.role === "ADMIN"
                          ? "Administrator"
                          : "Student"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="members-footer">
              <span className="secure-mini-dot"></span>
              End-to-end session security
            </div>
          </aside>
        </div>
      </section>
    );
  }

  /* =========================================================
     OTHER PAGES
  ========================================================= */

  function renderPlaceholder(
    eyebrow,
    title,
    description,
    icon,
    bottom
  ) {
    return (
      <section className="content-section">
        <div className="page-title">
          <div>
            <span className="eyebrow">
              {eyebrow}
            </span>

            <h1>{title}</h1>

            <p>{description}</p>
          </div>
        </div>

        <div className="feature-placeholder">
          <div className="big-icon">
            {icon}
          </div>

          <h2>{title}</h2>

          <p>{description}</p>

          <span>{bottom}</span>
        </div>
      </section>
    );
  }

  /* =========================================================
     AI
  ========================================================= */

  function renderAI() {
    return (
      <section className="content-section">
        <div className="page-title">
          <div>
            <span className="eyebrow">
              INTELLIGENCE
            </span>

            <h1>AI Assistant</h1>

            <p>
              Kokand Cyber Campus uchun AI yordamchi
            </p>
          </div>
        </div>

        <div className="ai-placeholder">
          <div className="ai-orb">✦</div>

          <div>
            <h2>Cyber Campus AI</h2>

            <p>
              Men sizga raspisaniya, vazifalar,
              fakultet qoidalari, cybersecurity
              mavzulari va platformadan foydalanish
              bo‘yicha yordam bera olaman.
            </p>

            <div className="ai-example-list">
              <button type="button">
                Bugungi darslarimni ko‘rsat
              </button>

              <button type="button">
                Menda qanday vazifalar bor?
              </button>

              <button type="button">
                CTF nima?
              </button>

              <button type="button">
                Security report qanday yuboriladi?
              </button>
            </div>

            <div className="ai-coming">
              AI engine integratsiyasi keyingi
              bosqichda ulanadi.
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* =========================================================
     HOME
  ========================================================= */

  function renderHome() {
    return (
      <section className="content-section">
        <div className="hero">
          <div>
            <span className="eyebrow">
              KOKAND CYBER CAMPUS
            </span>

            <h1>
              Salom, <span>{firstName}</span>
            </h1>

            <p>
              Cybersecurity fakultetining raqamli
              akademik platformasiga xush kelibsiz.
            </p>

            <div className="hero-user">
              <div className="avatar">
                {firstName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>{fullName}</strong>

                <small>
                  {user?.role === "ADMIN"
                    ? "Administrator"
                    : "Cybersecurity Student"}
                </small>
              </div>
            </div>
          </div>

          <div className="hero-status">
            <div className="status-dot"></div>
            SYSTEM ONLINE
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">
              ▣
            </span>

            <div>
              <small>
                BUGUNGI DARSLAR
              </small>

              <strong>
                {dashboard?.today_schedule_count ??
                  schedule.length}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">
              ◉
            </span>

            <div>
              <small>E'LONLAR</small>

              <strong>
                {dashboard?.announcements_count ??
                  announcements.length}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">
              ✓
            </span>

            <div>
              <small>VAZIFALAR</small>

              <strong>
                {dashboard?.tasks_count ??
                  tasks.length}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">
              ⚡
            </span>

            <div>
              <small>CTF CHALLENGES</small>

              <strong>
                {dashboard?.ctf_count ?? 0}
              </strong>
            </div>
          </div>
        </div>

        <div className="dashboard-columns">
          <div className="data-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">
                  LATEST
                </span>

                <h2>
                  So‘nggi e'lonlar
                </h2>
              </div>

              <button
                onClick={() =>
                  setActivePage(
                    "announcements"
                  )
                }
              >
                Barchasi →
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="small-empty">
                Hozircha e'lonlar mavjud emas.
              </div>
            ) : (
              announcements
                .slice(0, 4)
                .map((item) => (
                  <div
                    className="mini-announcement"
                    key={item.id}
                  >
                    <div className="mini-icon">
                      ◉
                    </div>

                    <div>
                      <strong>
                        {item.title}
                      </strong>

                      <p>
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="data-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">
                  TASKS
                </span>

                <h2>
                  Vazifalar
                </h2>
              </div>

              <button
                onClick={() =>
                  setActivePage("tasks")
                }
              >
                Barchasi →
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="small-empty">
                Hozircha vazifalar mavjud emas.
              </div>
            ) : (
              tasks.slice(0, 4).map((task) => (
                <div
                  className="mini-task"
                  key={task.id}
                >
                  <div className="task-check">
                    ✓
                  </div>

                  <div>
                    <strong>
                      {task.title}
                    </strong>

                    <p>
                      Deadline:{" "}
                      {task.deadline?.slice(
                        0,
                        16
                      ) ||
                        "Belgilanmagan"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="system-card">
          <div>
            <span className="eyebrow">
              SECURITY STATUS
            </span>

            <h2>
              Campus Security
            </h2>

            <p>
              Platforma autentifikatsiya va
              role-based access control bilan
              ishlamoqda.
            </p>
          </div>

          <div className="secure-badge">
            <span></span>
            SECURE
          </div>
        </div>
      </section>
    );
  }

    /* =========================================================
     PAGE ROUTER
  ========================================================= */

  function renderPage() {
    switch (activePage) {
      case "ctf":
        return <CTFArena />;

      case "security":
        return renderPlaceholder(
          "SECURITY",
          "Security Report",
          "Platformadagi zaifliklarni xavfsiz xabar qilish",
          "◇",
          "Security report backend API tayyor"
        );

      case "ai":
        return  <AIAssistant />;

      case "schedule":
        return renderSchedule();

      case "announcements":
        return renderAnnouncements();

      case "tasks":
        return renderTasks();

      case "chat":
        return renderChat();

      case "dashboard":
      default:
        return renderHome();
    }
  }
  
  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <div className="campus-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            K
          </div>

          <div>
            <strong>KOKAND</strong>
            <span>
              CYBER CAMPUS
            </span>
          </div>
        </div>

        <div className="profile-box">
          <div className="profile-avatar">
            {firstName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {firstName}
            </strong>

            <span>
              {user?.role === "ADMIN"
                ? "Administrator"
                : "Cybersecurity"}
            </span>
          </div>

          <div className="online-dot"></div>
        </div>

        <nav className="navigation">
          <span className="nav-title">
            MAIN MENU
          </span>

          {navItems.map((item) => (
            <button
              key={item.id}
              className={
                activePage === item.id
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActivePage(item.id)
              }
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              {item.label}

              {item.id === "chat" &&
                onlineUsers.length > 0 && (
                  <span className="nav-online-count">
                    {onlineUsers.length}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="role-box">
            <span>ROLE</span>

            <strong>
              {user?.role === "ADMIN"
                ? "ADMINISTRATOR"
                : "STUDENT"}
            </strong>
          </div>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            ↪ Chiqish
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="topbar-label">
              KOKAND UNIVERSITY
            </span>

            <strong>
              Cybersecurity Faculty
            </strong>
          </div>

          <div className="topbar-right">
            <button
              className="refresh-button"
              onClick={loadData}
              title="Yangilash"
            >
              ↻
            </button>

            <div className="date-box">
              <span>
                03 OKT 2026
              </span>

              <small>
                ACADEMIC YEAR 2026/27
              </small>
            </div>
          </div>
        </header>

        <div className="page-container">
          {loading ? (
            <div className="loading-screen">
              <div className="loader"></div>

              <p>
                Campus ma'lumotlari
                yuklanmoqda...
              </p>
            </div>
          ) : (
            renderPage()
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
