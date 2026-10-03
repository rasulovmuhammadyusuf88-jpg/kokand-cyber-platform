import { useEffect, useState } from "react";
import "./AdminPanel.css";
import CTFAdmin from "./CTFAdmin";
import AdminAICenter from "./AdminAICenter";
const API_URL = "http://localhost:5000/api";

function AdminPanel({ token, onClose }) {
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);

  const [scheduleForm, setScheduleForm] = useState({
    day: "Dushanba",
    date: "",
    start_time: "09:00",
    end_time: "10:30",
    subject: "",
    teacher: "",
    room: "",
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    priority: "NORMAL",
    target_group: "ALL",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    subject: "",
    deadline: "",
    group_name: "Cybersecurity 2026",
  });

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Server xatosi");
    }

    return data;
  }

  function showMessage(text) {
    setMessage(text);
    setError("");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  function showError(text) {
    setError(text);
    setMessage("");

    setTimeout(() => {
      setError("");
    }, 4000);
  }

  async function loadData(tab = activeTab) {
    try {
      setLoading(true);

      if (tab === "students") {
        const data = await api("/users/students");
        setStudents(data.students);
      }

      if (tab === "schedule") {
        const data = await api("/schedule");
        setSchedule(data.schedule);
      }

      if (tab === "announcements") {
        const data = await api("/announcements");
        setAnnouncements(data.announcements);
      }

      if (tab === "tasks") {
        const data = await api("/tasks");
        setTasks(data.tasks);
      }

      if (tab === "reports") {
        const data = await api("/security-reports");
        setReports(data.reports);
      }

      if (tab === "logs") {
        const data = await api("/audit-logs");
        setLogs(data.logs);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  async function createSchedule(event) {
    event.preventDefault();

    try {
      await api("/schedule", {
        method: "POST",
        body: JSON.stringify(scheduleForm),
      });

      showMessage("Raspisaniya qo‘shildi");

      setScheduleForm({
        day: "Dushanba",
        date: "",
        start_time: "09:00",
        end_time: "10:30",
        subject: "",
        teacher: "",
        room: "",
      });

      loadData("schedule");
    } catch (err) {
      showError(err.message);
    }
  }

  async function deleteSchedule(id) {
    if (!window.confirm("Bu darsni o‘chirmoqchimisiz?")) {
      return;
    }

    try {
      await api(`/schedule/${id}`, {
        method: "DELETE",
      });

      showMessage("Dars o‘chirildi");
      loadData("schedule");
    } catch (err) {
      showError(err.message);
    }
  }

  async function createAnnouncement(event) {
    event.preventDefault();

    try {
      await api("/announcements", {
        method: "POST",
        body: JSON.stringify(announcementForm),
      });

      showMessage("E'lon barcha tanlangan foydalanuvchilarga yuborildi");

      setAnnouncementForm({
        title: "",
        content: "",
        priority: "NORMAL",
        target_group: "ALL",
      });

      loadData("announcements");
    } catch (err) {
      showError(err.message);
    }
  }

  async function deleteAnnouncement(id) {
    if (!window.confirm("E'lonni o‘chirmoqchimisiz?")) {
      return;
    }

    try {
      await api(`/announcements/${id}`, {
        method: "DELETE",
      });

      showMessage("E'lon o‘chirildi");
      loadData("announcements");
    } catch (err) {
      showError(err.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();

    try {
      await api("/tasks", {
        method: "POST",
        body: JSON.stringify(taskForm),
      });

      showMessage("Vazifa yaratildi");

      setTaskForm({
        title: "",
        description: "",
        subject: "",
        deadline: "",
        group_name: "Cybersecurity 2026",
      });

      loadData("tasks");
    } catch (err) {
      showError(err.message);
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Vazifani o‘chirmoqchimisiz?")) {
      return;
    }

    try {
      await api(`/tasks/${id}`, {
        method: "DELETE",
      });

      showMessage("Vazifa o‘chirildi");
      loadData("tasks");
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <header className="admin-header">
          <div>
            <span className="admin-eyebrow">SECURITY CONTROL CENTER</span>
            <h1>Admin Panel</h1>
            <p>Kokand Cyber Campus boshqaruv markazi</p>
          </div>

          <button className="admin-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="admin-body">
          <aside className="admin-sidebar">
            <button
              className={activeTab === "students" ? "admin-nav active" : "admin-nav"}
              onClick={() => setActiveTab("students")}
            >
              👥 Talabalar
            </button>

            <button
              className={activeTab === "schedule" ? "admin-nav active" : "admin-nav"}
              onClick={() => setActiveTab("schedule")}
            >
              📅 Raspisaniya
            </button>

            <button
              className={
                activeTab === "announcements"
                  ? "admin-nav active"
                  : "admin-nav"
              }
              onClick={() => setActiveTab("announcements")}
            >
              📢 E'lonlar
            </button>

            <button
              className={activeTab === "tasks" ? "admin-nav active" : "admin-nav"}
              onClick={() => setActiveTab("tasks")}
            >
              📝 Vazifalar
            </button>

            <button
              className={activeTab === "reports" ? "admin-nav active" : "admin-nav"}
              onClick={() => setActiveTab("reports")}
            >
              🐞 Security Reports
            </button>

           <button
  className={activeTab === "ctf" ? "admin-nav active" : "admin-nav"}
  onClick={() => setActiveTab("ctf")}
>
  ⚡ CTF Arena
</button>

            <button
              className={activeTab === "ai" ? "admin-nav active" : "admin-nav"}
              onClick={() => setActiveTab("ai")}
            >
              🤖 AI Command Center
            </button>
          </aside>

          <main className="admin-content">
            {message && <div className="admin-success">✓ {message}</div>}
{activeTab === "ctf" && (
  <CTFAdmin token={token} />
)}
            {activeTab === "ai" && <AdminAICenter token={token} onDone={() => loadData("schedule")} />}
            {error && <div className="admin-error">! {error}</div>}

            {loading && <div className="admin-loading">Ma'lumot yuklanmoqda...</div>}

            {activeTab === "students" && (
              <StudentsTab students={students} />
            )}

            {activeTab === "schedule" && (
              <ScheduleTab
                schedule={schedule}
                form={scheduleForm}
                setForm={setScheduleForm}
                onSubmit={createSchedule}
                onDelete={deleteSchedule}
              />
            )}

            {activeTab === "announcements" && (
              <AnnouncementsTab
                announcements={announcements}
                form={announcementForm}
                setForm={setAnnouncementForm}
                onSubmit={createAnnouncement}
                onDelete={deleteAnnouncement}
              />
            )}

            {activeTab === "tasks" && (
              <TasksTab
                tasks={tasks}
                form={taskForm}
                setForm={setTaskForm}
                onSubmit={createTask}
                onDelete={deleteTask}
              />
            )}

            {activeTab === "reports" && (
              <ReportsTab reports={reports} />
            )}

            {activeTab === "logs" && (
              <LogsTab logs={logs} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ students }) {
  return (
    <section>
      <div className="admin-title">
        <div>
          <span>USER MANAGEMENT</span>
          <h2>Talabalar</h2>
        </div>

        <div className="admin-counter">
          {students.length} / 100
        </div>
      </div>

      <div className="student-grid">
        {students.map((student) => (
          <div className="student-card" key={student.id}>
            <div className="student-avatar">
              {student.first_name?.charAt(0)}
              {student.last_name?.charAt(0)}
            </div>

            <div>
              <strong>
                {student.first_name} {student.last_name}
              </strong>

              <span>{student.student_id}</span>
              <small>{student.email}</small>
              <small>{student.group_name}</small>
            </div>

            <div className="student-status">ACTIVE</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScheduleTab({
  schedule,
  form,
  setForm,
  onSubmit,
  onDelete,
}) {
  return (
    <section>
      <div className="admin-title">
        <div>
          <span>SCHEDULE MANAGEMENT</span>
          <h2>Raspisaniya</h2>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        <select
          value={form.day}
          onChange={(e) =>
            setForm({ ...form, day: e.target.value })
          }
        >
          <option>Dushanba</option>
          <option>Seshanba</option>
          <option>Chorshanba</option>
          <option>Payshanba</option>
          <option>Juma</option>
          <option>Shanba</option>
        </select>

        <input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm({ ...form, date: e.target.value })
          }
        />

        <input
          type="time"
          value={form.start_time}
          onChange={(e) =>
            setForm({ ...form, start_time: e.target.value })
          }
        />

        <input
          type="time"
          value={form.end_time}
          onChange={(e) =>
            setForm({ ...form, end_time: e.target.value })
          }
        />

        <input
          placeholder="Fan nomi"
          value={form.subject}
          onChange={(e) =>
            setForm({ ...form, subject: e.target.value })
          }
          required
        />

        <input
          placeholder="O‘qituvchi"
          value={form.teacher}
          onChange={(e) =>
            setForm({ ...form, teacher: e.target.value })
          }
        />

        <input
          placeholder="Xona"
          value={form.room}
          onChange={(e) =>
            setForm({ ...form, room: e.target.value })
          }
        />

        <button type="submit">+ Dars qo‘shish</button>
      </form>

      <div className="admin-list">
        {schedule.length === 0 ? (
          <Empty text="Hali raspisaniya kiritilmagan" />
        ) : (
          schedule.map((item) => (
            <div className="admin-list-item" key={item.id}>
              <div className="list-time">
                {item.start_time}
                <span>{item.end_time}</span>
              </div>

              <div className="list-main">
                <strong>{item.subject}</strong>
                <span>
                  {item.day} • {item.teacher || "O‘qituvchi belgilanmagan"} •{" "}
                  {item.room || "Xona belgilanmagan"}
                </span>
              </div>

              <button
                className="danger-button"
                onClick={() => onDelete(item.id)}
              >
                O‘chirish
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AnnouncementsTab({
  announcements,
  form,
  setForm,
  onSubmit,
  onDelete,
}) {
  return (
    <section>
      <div className="admin-title">
        <div>
          <span>ANNOUNCEMENT CENTER</span>
          <h2>E'lon yuborish</h2>
        </div>
      </div>

      <form className="admin-form vertical-form" onSubmit={onSubmit}>
        <input
          placeholder="E'lon sarlavhasi"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
          required
        />

        <textarea
          placeholder="E'lon matni..."
          value={form.content}
          onChange={(e) =>
            setForm({ ...form, content: e.target.value })
          }
          required
        />

        <div className="form-row">
          <select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value })
            }
          >
            <option value="NORMAL">Oddiy</option>
            <option value="IMPORTANT">Muhim</option>
            <option value="URGENT">Juda muhim</option>
          </select>

          <select
            value={form.target_group}
            onChange={(e) =>
              setForm({ ...form, target_group: e.target.value })
            }
          >
            <option value="ALL">Barcha talabalar</option>
            <option value="Cybersecurity 2026">
              Cybersecurity 2026
            </option>
          </select>
        </div>

        <button type="submit">📢 E'lonni yuborish</button>
      </form>

      <div className="admin-list">
        <h3 className="section-label">Yuborilgan e'lonlar</h3>

        {announcements.map((item) => (
          <div className="admin-list-item" key={item.id}>
            <div className="announcement-mark">!</div>

            <div className="list-main">
              <strong>{item.title}</strong>
              <span>{item.content}</span>
              <small>
                {item.priority} • {item.target_group}
              </small>
            </div>

            <button
              className="danger-button"
              onClick={() => onDelete(item.id)}
            >
              O‘chirish
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TasksTab({
  tasks,
  form,
  setForm,
  onSubmit,
  onDelete,
}) {
  return (
    <section>
      <div className="admin-title">
        <div>
          <span>TASK MANAGEMENT</span>
          <h2>Vazifalar</h2>
        </div>
      </div>

      <form className="admin-form vertical-form" onSubmit={onSubmit}>
        <input
          placeholder="Vazifa nomi"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
          required
        />

        <input
          placeholder="Fan"
          value={form.subject}
          onChange={(e) =>
            setForm({ ...form, subject: e.target.value })
          }
        />

        <textarea
          placeholder="Vazifa tavsifi..."
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <div className="form-row">
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) =>
              setForm({ ...form, deadline: e.target.value })
            }
            required
          />

          <select
            value={form.group_name}
            onChange={(e) =>
              setForm({ ...form, group_name: e.target.value })
            }
          >
            <option>Cybersecurity 2026</option>
            <option>ALL</option>
          </select>
        </div>

        <button type="submit">+ Vazifa yaratish</button>
      </form>

      <div className="admin-list">
        {tasks.map((task) => (
          <div className="admin-list-item" key={task.id}>
            <div className="task-mark">✓</div>

            <div className="list-main">
              <strong>{task.title}</strong>
              <span>{task.subject || "Fan belgilanmagan"}</span>
              <small>Deadline: {task.deadline}</small>
            </div>

            <button
              className="danger-button"
              onClick={() => onDelete(task.id)}
            >
              O‘chirish
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportsTab({ reports }) {
  return (
    <section>
      <div className="admin-title">
        <div>
          <span>SECURITY OPERATIONS</span>
          <h2>Vulnerability Reports</h2>
        </div>

        <div className="security-count">
          {reports.length} report
        </div>
      </div>

      <div className="admin-list">
        {reports.length === 0 ? (
          <Empty text="Hali security report kelmagan" />
        ) : (
          reports.map((report) => (
            <div className="report-card" key={report.id}>
              <div className="report-top">
                <strong>{report.title}</strong>

                <span className={`severity ${report.severity}`}>
                  {report.severity}
                </span>
              </div>

              <p>{report.description}</p>

              <div className="report-meta">
                <span>
                  👤 {report.first_name} {report.last_name}
                </span>

                <span>{report.student_id}</span>

                <span>{report.category}</span>

                <span>{report.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function LogsTab({ logs }) {
  return (
    <section>
      <div className="admin-title">
        <div>
          <span>SECURITY AUDIT</span>
          <h2>Audit Logs</h2>
        </div>
      </div>

      <div className="log-list">
        {logs.length === 0 ? (
          <Empty text="Hali audit log yo‘q" />
        ) : (
          logs.map((log) => (
            <div className="log-item" key={log.id}>
              <div className="log-dot"></div>

              <div>
                <strong>
                  {log.action} {log.entity}
                </strong>

                <span>
                  {log.first_name || "System"}{" "}
                  {log.last_name || ""}
                </span>

                <small>
                  {log.details || "—"} • {log.created_at}
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Empty({ text }) {
  return <div className="empty-state">{text}</div>;
}

export default AdminPanel;

