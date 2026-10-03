const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const OpenAI = require("openai");

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "kokand-cyber-campus-development-secret";

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "kokand_cyber.db");

const db = new Database(DB_PATH);

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "12mb" }));

app.post("/api/ai/chat", auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Savol yuborilmadi.",
      });
    }

    const user = req.user;

    // Studentning guruhiga tegishli jadval
    const schedule = db
      .prepare(`
        SELECT
          date,
          day,
          start_time,
          end_time,
          subject,
          teacher,
          room,
          group_name
        FROM schedules
        WHERE group_name = 'ALL'
           OR group_name = ?
        ORDER BY date ASC, start_time ASC
        LIMIT 100
      `)
      .all(user.group_name);

    // Studentning guruhiga tegishli vazifalar
    const tasks = db
      .prepare(`
        SELECT
          title,
          description,
          subject,
          deadline,
          group_name
        FROM tasks
        WHERE group_name = 'ALL'
           OR group_name = ?
        ORDER BY deadline ASC
        LIMIT 100
      `)
      .all(user.group_name);

    // Student ko‘rishi mumkin bo‘lgan e'lonlar
    const announcements = db
      .prepare(`
        SELECT
          title,
          content,
          priority,
          target_group,
          created_at
        FROM announcements
        WHERE target_group = 'ALL'
           OR target_group = ?
        ORDER BY created_at DESC
        LIMIT 50
      `)
      .all(user.group_name);

    // Studentning CTF ballari
    const ctfScore = db
      .prepare(`
        SELECT COALESCE(SUM(points), 0) AS points
        FROM ctf_submissions
        WHERE user_id = ?
          AND correct = 1
      `)
      .get(user.id);

    const campusContext = {
      student: {
        id: user.id,
        student_id: user.student_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        group: user.group_name,
        faculty: user.faculty,
      },

      schedule,
      tasks,
      announcements,

      ctf: {
        points: ctfScore?.points || 0,
      },
    };

    const response = await openai.responses.create({
      model: "gpt-6-luna",

      instructions: `
Sen Kokand Cyber Campus platformasining AI Assistant'isan.

Sen login qilgan studentga universitet platformasi bo‘yicha yordam berasan.

MUHIM QOIDALAR:

1. Quyidagi CAMPUS DATA haqiqiy platforma ma'lumotidir.
2. Jadval, vazifa, e'lon yoki CTF ballari haqida savol berilsa,
   javobni CAMPUS DATA asosida ber.
3. CAMPUS DATA'da ma'lumot bo‘lmasa, "platformada bu ma'lumot topilmadi"
   deb ayt. Ma'lumotni o‘ylab topma.
4. Student faqat o‘ziga tegishli ma'lumotlarni ko‘rishi mumkin.
5. Boshqa studentlarning shaxsiy ma'lumotlarini oshkor qilma.
6. Umumiy cybersecurity, programming, Linux, networking, CTF va
   o‘quv savollariga bilimlaring asosida yordam ber.
7. Javoblarni asosan o‘zbek tilida ber.
8. Foydalanuvchi rus yoki ingliz tilida yozsa, shu tilda javob ber.
9. Javoblarni tushunarli, amaliy va imkon qadar qisqa qil.

CAMPUS DATA:
${JSON.stringify(campusContext, null, 2)}
`,

      input: message.trim(),
    });

    return res.json({
      success: true,
      reply: response.output_text,
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "AI Assistant bilan bog‘lanishda xatolik yuz berdi.",
    });
  }
});


/* =========================================================
   DATABASE
========================================================= */

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE,
  student_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  avatar TEXT,
  group_name TEXT DEFAULT 'Cybersecurity 2026',
  faculty TEXT DEFAULT 'Kiberxavfsizlik',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  date TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher TEXT,
  room TEXT,
  group_name TEXT DEFAULT 'Cybersecurity 2026',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'NORMAL',
  target_group TEXT DEFAULT 'ALL',
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  deadline TEXT NOT NULL,
  attachment_url TEXT,
  group_name TEXT DEFAULT 'Cybersecurity 2026',
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  github_url TEXT,
  status TEXT DEFAULT 'ACTIVE',
  progress INTEGER DEFAULT 0,
  deadline TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ctf_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  points INTEGER DEFAULT 100,
  flag_hash TEXT NOT NULL,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ctf_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  correct INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES ctf_challenges(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vulnerability_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'OPEN',
  admin_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

/* =========================================================
   HELPERS
========================================================= */

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function getUserById(id) {
  return db
    .prepare(
      `
      SELECT id, google_id, student_id, first_name, last_name,
             email, role, avatar, group_name, faculty, created_at
      FROM users
      WHERE id = ?
    `
    )
    .get(id);
}

function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
}

function audit(req, action, entity, entityId = null, details = "") {
  try {
    db.prepare(
      `
      INSERT INTO audit_logs
      (user_id, action, entity, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      req.user?.id || null,
      action,
      entity,
      entityId,
      details,
      req.ip || ""
    );
  } catch (error) {
    console.error("Audit error:", error.message);
  }
}

/* =========================================================
   INITIAL USERS
========================================================= */

function seedUsers() {
  const passwordHash = bcrypt.hashSync("ChangeMe_2026!", 12);

  const adminCount = db
    .prepare("SELECT COUNT(*) count FROM users WHERE role = 'ADMIN'")
    .get().count;

  const studentCount = db
    .prepare("SELECT COUNT(*) count FROM users WHERE role = 'STUDENT'")
    .get().count;

  if (adminCount < 2) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users
      (student_id, first_name, last_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'ADMIN')
    `);

    stmt.run(
      "ADMIN001",
      "System",
      "Admin",
      "admin1@kokandcyber.local",
      passwordHash
    );

    stmt.run(
      "ADMIN002",
      "Security",
      "Admin",
      "admin2@kokandcyber.local",
      passwordHash
    );
  }

  if (studentCount < 100) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users
      (student_id, first_name, last_name, email, password_hash, role, group_name)
      VALUES (?, ?, ?, ?, ?, 'STUDENT', ?)
    `);

    for (let i = 1; i <= 100; i++) {
      const n = String(i).padStart(3, "0");

      stmt.run(
        `KC2026${n}`,
        "Student",
        n,
        `student${n}@kokandcyber.local`,
        passwordHash,
        "Cybersecurity 2026"
      );
    }
  }
}

seedUsers();

/* =========================================================
   REAL-TIME CHAT / SOCKET.IO
========================================================= */

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUserById(decoded.id);

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

function onlineList() {
  const unique = new Map();

  for (const user of onlineUsers.values()) {
    unique.set(user.id, user);
  }

  return [...unique.values()].map((user) => ({
    id: user.id,
    student_id: user.student_id,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    avatar: user.avatar,
  }));
}

io.on("connection", (socket) => {
  const user = socket.user;

  onlineUsers.set(socket.id, user);

  socket.join(`group:${user.group_name}`);

  io.to(`group:${user.group_name}`).emit(
    "chat:online-users",
    onlineList()
  );

  socket
    .to(`group:${user.group_name}`)
    .emit("chat:user-online", {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    });

  socket.on("chat:typing", (isTyping) => {
    socket
      .to(`group:${user.group_name}`)
      .emit("chat:typing", {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        isTyping: Boolean(isTyping),
      });
  });

  socket.on("chat:send", (payload) => {
    try {
      const text =
        typeof payload === "string"
          ? payload
          : payload?.message;

      if (!text || !text.trim()) {
        return;
      }

      const result = db
        .prepare(
          `
          INSERT INTO messages (user_id, message)
          VALUES (?, ?)
        `
        )
        .run(user.id, text.trim());

      const message = db
        .prepare(
          `
          SELECT
            m.id,
            m.message,
            m.created_at,
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.role,
            u.avatar
          FROM messages m
          JOIN users u ON m.user_id = u.id
          WHERE m.id = ?
        `
        )
        .get(result.lastInsertRowid);

      io.to(`group:${user.group_name}`).emit(
        "chat:new-message",
        message
      );
    } catch (error) {
      socket.emit("chat:error", {
        message: "Xabar yuborishda xato",
      });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);

    io.to(`group:${user.group_name}`).emit(
      "chat:online-users",
      onlineList()
    );

    socket
      .to(`group:${user.group_name}`)
      .emit("chat:user-offline", {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
      });
  });
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Kokand Cyber Campus API",
    status: "online",
    time: new Date().toISOString(),
  });
});

/* =========================================================
   AUTH
========================================================= */

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email va password kerak",
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.toLowerCase().trim());

    if (
      !user ||
      !user.password_hash ||
      !bcrypt.compareSync(password, user.password_hash)
    ) {
      return res.status(401).json({
        success: false,
        message: "Login yoki parol noto‘g‘ri",
      });
    }

    const safeUser = {
      id: user.id,
      student_id: user.student_id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      group_name: user.group_name,
      faculty: user.faculty,
    };

    res.json({
      success: true,
      token: createToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login error",
    });
  }
});

app.get("/api/auth/me", auth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/* =========================================================
   USERS
========================================================= */

app.get("/api/users", auth, adminOnly, (req, res) => {
  const users = db
    .prepare(
      `
      SELECT
        id,
        student_id,
        first_name,
        last_name,
        email,
        role,
        group_name,
        faculty,
        created_at
      FROM users
      ORDER BY role DESC, id ASC
    `
    )
    .all();

  res.json({
    success: true,
    users,
  });
});

app.get("/api/users/students", auth, adminOnly, (req, res) => {
  const students = db
    .prepare(
      `
      SELECT
        id,
        student_id,
        first_name,
        last_name,
        email,
        group_name,
        faculty,
        created_at
      FROM users
      WHERE role = 'STUDENT'
      ORDER BY id ASC
    `
    )
    .all();

  res.json({
    success: true,
    students,
  });
});

/* =========================================================
   SCHEDULE
========================================================= */

app.get("/api/schedule", auth, (req, res) => {
  const schedule = db
    .prepare(
      `
      SELECT
        s.*,
        u.first_name || ' ' || u.last_name AS creator_name
      FROM schedules s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.group_name = 'ALL'
         OR s.group_name = ?
      ORDER BY s.date ASC, s.start_time ASC
    `
    )
    .all(req.user.group_name);

  res.json({
    success: true,
    schedule,
  });
});

app.post("/api/schedule", auth, adminOnly, (req, res) => {
  const {
    day,
    date,
    start_time,
    end_time,
    subject,
    teacher,
    room,
    group_name,
  } = req.body;

  if (!day || !start_time || !end_time || !subject) {
    return res.status(400).json({
      success: false,
      message: "Majburiy maydonlar to‘ldirilmagan",
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO schedules
      (
        day,
        date,
        start_time,
        end_time,
        subject,
        teacher,
        room,
        group_name,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      day,
      date || null,
      start_time,
      end_time,
      subject,
      teacher || "",
      room || "",
      group_name || "Cybersecurity 2026",
      req.user.id
    );

  audit(
    req,
    "CREATE",
    "SCHEDULE",
    result.lastInsertRowid,
    subject
  );

  res.json({
    success: true,
    message: "Raspisaniya qo‘shildi",
    id: result.lastInsertRowid,
  });
});

app.put("/api/schedule/:id", auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);

  const existing = db
    .prepare("SELECT * FROM schedules WHERE id = ?")
    .get(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Dars topilmadi",
    });
  }

  const {
    day,
    date,
    start_time,
    end_time,
    subject,
    teacher,
    room,
    group_name,
  } = req.body;

  db.prepare(
    `
    UPDATE schedules
    SET
      day = ?,
      date = ?,
      start_time = ?,
      end_time = ?,
      subject = ?,
      teacher = ?,
      room = ?,
      group_name = ?
    WHERE id = ?
    `
  ).run(
    day,
    date || null,
    start_time,
    end_time,
    subject,
    teacher || "",
    room || "",
    group_name || "Cybersecurity 2026",
    id
  );

  audit(req, "UPDATE", "SCHEDULE", id, subject);

  res.json({
    success: true,
    message: "Raspisaniya yangilandi",
  });
});

app.delete("/api/schedule/:id", auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);

  db.prepare("DELETE FROM schedules WHERE id = ?").run(id);

  audit(req, "DELETE", "SCHEDULE", id);

  res.json({
    success: true,
    message: "Raspisaniya o‘chirildi",
  });
});

/* =========================================================
   ANNOUNCEMENTS
========================================================= */

app.get("/api/announcements", auth, (req, res) => {
  const announcements = db
    .prepare(
      `
      SELECT
        a.*,
        u.first_name || ' ' || u.last_name AS creator_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.target_group = 'ALL'
         OR a.target_group = ?
      ORDER BY a.created_at DESC
    `
    )
    .all(req.user.group_name);

  res.json({
    success: true,
    announcements,
  });
});

app.post("/api/announcements", auth, adminOnly, (req, res) => {
  const {
    title,
    content,
    priority,
    target_group,
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "Title va content kerak",
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO announcements
      (
        title,
        content,
        priority,
        target_group,
        created_by
      )
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .run(
      title,
      content,
      priority || "NORMAL",
      target_group || "ALL",
      req.user.id
    );

  audit(
    req,
    "CREATE",
    "ANNOUNCEMENT",
    result.lastInsertRowid,
    title
  );

  res.json({
    success: true,
    message: "E'lon yuborildi",
    id: result.lastInsertRowid,
  });
});

app.delete("/api/announcements/:id", auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);

  db.prepare("DELETE FROM announcements WHERE id = ?").run(id);

  audit(req, "DELETE", "ANNOUNCEMENT", id);

  res.json({
    success: true,
    message: "E'lon o‘chirildi",
  });
});

/* =========================================================
   TASKS
========================================================= */

app.get("/api/tasks", auth, (req, res) => {
  const tasks = db
    .prepare(
      `
      SELECT
        t.*,
        u.first_name || ' ' || u.last_name AS creator_name
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.group_name = 'ALL'
         OR t.group_name = ?
      ORDER BY t.deadline ASC
    `
    )
    .all(req.user.group_name);

  res.json({
    success: true,
    tasks,
  });
});

app.post("/api/tasks", auth, adminOnly, (req, res) => {
  const {
    title,
    description,
    subject,
    deadline,
    attachment_url,
    group_name,
  } = req.body;

  if (!title || !deadline) {
    return res.status(400).json({
      success: false,
      message: "Title va deadline kerak",
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO tasks
      (
        title,
        description,
        subject,
        deadline,
        attachment_url,
        group_name,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      title,
      description || "",
      subject || "",
      deadline,
      attachment_url || "",
      group_name || "Cybersecurity 2026",
      req.user.id
    );

  audit(
    req,
    "CREATE",
    "TASK",
    result.lastInsertRowid,
    title
  );

  res.json({
    success: true,
    message: "Vazifa yaratildi",
    id: result.lastInsertRowid,
  });
});

app.delete("/api/tasks/:id", auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);

  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

  audit(req, "DELETE", "TASK", id);

  res.json({
    success: true,
    message: "Vazifa o‘chirildi",
  });
});


/* =========================================================
   ADMIN AI COMMAND CENTER
========================================================= */
function aiJson(text){try{return JSON.parse(text)}catch{const m=String(text||'').match(/\{[\s\S]*\}/);if(!m)throw new Error('AI JSON qaytarmadi');return JSON.parse(m[0])}}
function aiContext(){return{
 tasks:db.prepare(`SELECT id,title,description,subject,deadline,group_name FROM tasks ORDER BY deadline ASC LIMIT 200`).all(),
 schedule:db.prepare(`SELECT id,day,date,start_time,end_time,subject,teacher,room,group_name FROM schedules ORDER BY date ASC,start_time ASC LIMIT 300`).all(),
 groups:db.prepare(`SELECT DISTINCT group_name FROM users WHERE group_name IS NOT NULL AND group_name!=''`).all().map(x=>x.group_name)
}}
async function aiCommand(message){const c=aiContext();const r=await openai.responses.create({model:'gpt-6-luna',instructions:`You are Kokand Cyber Campus Admin AI. Return ONLY valid JSON, no markdown. Allowed actions: CREATE_TASK, UPDATE_TASK_DEADLINE, CREATE_SCHEDULE_BULK, UPDATE_SCHEDULE, CREATE_ANNOUNCEMENT, UNKNOWN. Never invent data. Dates YYYY-MM-DD, times HH:MM. UPDATE_TASK_DEADLINE must use an existing task id or exact title. CREATE_SCHEDULE_BULK returns schedule[]. Unknown/insufficient data => UNKNOWN. Shape: {action,confidence,message,task:{id,title,description,subject,deadline,group_name},schedule:[],schedule_item:{id,day,date,start_time,end_time,subject,teacher,room,group_name},announcement:{title,content,priority,target_group}}. CAMPUS DATA:\n${JSON.stringify(c,null,2)}`,input:message.trim()});return aiJson(r.output_text)}
async function aiScheduleImage(image){const c=aiContext();const r=await openai.responses.create({model:'gpt-6-luna',instructions:`You are a university schedule vision/OCR parser. Return ONLY valid JSON. Do not invent unreadable values. Shape: {action:'CREATE_SCHEDULE_BULK',confidence,message,schedule:[{day,date,start_time,end_time,subject,teacher,room,group_name}]}. Date YYYY-MM-DD or null, time HH:MM. This is PREVIEW only; never write database. Existing groups: ${JSON.stringify(c.groups)}`,input:[{role:'user',content:[{type:'input_text',text:'Extract the timetable from this image into structured JSON.'},{type:'input_image',image_url:image,detail:'high'}]}]});return aiJson(r.output_text)}
app.post('/api/admin-ai/command',auth,adminOnly,async(req,res)=>{try{if(!req.body.message?.trim())return res.status(400).json({success:false,message:'AI buyrug‘i yuborilmadi'});const proposal=await aiCommand(req.body.message);audit(req,'AI_PROPOSAL','ADMIN_AI',null,JSON.stringify({source:'command',proposal}));res.json({success:true,proposal})}catch(e){console.error('ADMIN AI COMMAND ERROR',e);res.status(500).json({success:false,message:'AI buyruqni tahlil qila olmadi'})}});
app.post('/api/admin-ai/schedule-image',auth,adminOnly,async(req,res)=>{try{const image=req.body.image;if(!/^data:image\/(png|jpe?g|webp);base64,/i.test(image||''))return res.status(400).json({success:false,message:'PNG/JPG/WEBP rasm kerak'});if(image.length>11*1024*1024)return res.status(413).json({success:false,message:'Rasm hajmi juda katta'});const proposal=await aiScheduleImage(image);audit(req,'AI_PROPOSAL','ADMIN_AI',null,JSON.stringify({source:'schedule_image',proposal}));res.json({success:true,proposal})}catch(e){console.error('ADMIN AI IMAGE ERROR',e);res.status(500).json({success:false,message:'Jadval rasmini AI tahlil qila olmadi'})}});
app.post('/api/admin-ai/execute',auth,adminOnly,(req,res)=>{const p=req.body.proposal||{};try{const result=db.transaction(()=>{
 if(p.action==='CREATE_TASK'){const t=p.task||{};if(!t.title||!t.deadline)throw new Error('Task title va deadline kerak');const r=db.prepare(`INSERT INTO tasks(title,description,subject,deadline,attachment_url,group_name,created_by) VALUES(?,?,?,?,?,?,?)`).run(t.title,t.description||'',t.subject||'',t.deadline,t.attachment_url||'',t.group_name||'ALL',req.user.id);audit(req,'AI_EXECUTE_CREATE','TASK',r.lastInsertRowid,JSON.stringify(t));return{message:'AI orqali vazifa yaratildi',id:r.lastInsertRowid}}
 if(p.action==='UPDATE_TASK_DEADLINE'){const t=p.task||{};let id=Number(t.id);if(!id&&t.title){const m=db.prepare(`SELECT id,title FROM tasks WHERE lower(title)=lower(?) ORDER BY id DESC LIMIT 2`).all(t.title);if(m.length!==1)throw new Error(m.length?'Bir xil nomli bir nechta task bor':'Task topilmadi');id=m[0].id}if(!id||!t.deadline)throw new Error('Task ID/title va deadline kerak');const r=db.prepare('UPDATE tasks SET deadline=? WHERE id=?').run(t.deadline,id);if(!r.changes)throw new Error('Task topilmadi');audit(req,'AI_EXECUTE_UPDATE','TASK',id,JSON.stringify({deadline:t.deadline}));return{message:'Deadline AI orqali o‘zgartirildi',id}}
 if(p.action==='CREATE_SCHEDULE_BULK'){const rows=Array.isArray(p.schedule)?p.schedule:[];const ins=db.prepare(`INSERT INTO schedules(day,date,start_time,end_time,subject,teacher,room,group_name,created_by) VALUES(?,?,?,?,?,?,?,?,?)`);let n=0;for(const x of rows){if(!x.day||!x.start_time||!x.end_time||!x.subject)continue;ins.run(x.day,x.date||null,x.start_time,x.end_time,x.subject,x.teacher||'',x.room||'',x.group_name||'Cybersecurity 2026',req.user.id);n++}if(!n)throw new Error('Valid dars topilmadi');audit(req,'AI_EXECUTE_CREATE_BULK','SCHEDULE',null,JSON.stringify({count:n}));return{message:`${n} ta dars jadvalga qo‘shildi`,count:n}}
 if(p.action==='UPDATE_SCHEDULE'){const x=p.schedule_item||p.schedule?.[0]||{};const id=Number(x.id);const old=db.prepare('SELECT * FROM schedules WHERE id=?').get(id);if(!old)throw new Error('Schedule topilmadi');const u={day:x.day??old.day,date:x.date??old.date,start_time:x.start_time??old.start_time,end_time:x.end_time??old.end_time,subject:x.subject??old.subject,teacher:x.teacher??old.teacher,room:x.room??old.room,group_name:x.group_name??old.group_name};db.prepare(`UPDATE schedules SET day=?,date=?,start_time=?,end_time=?,subject=?,teacher=?,room=?,group_name=? WHERE id=?`).run(u.day,u.date,u.start_time,u.end_time,u.subject,u.teacher,u.room,u.group_name,id);audit(req,'AI_EXECUTE_UPDATE','SCHEDULE',id,JSON.stringify(u));return{message:'Jadval AI orqali yangilandi',id}}
 if(p.action==='CREATE_ANNOUNCEMENT'){const a=p.announcement||{};if(!a.title||!a.content)throw new Error('E’lon title va content kerak');const r=db.prepare(`INSERT INTO announcements(title,content,priority,target_group,created_by) VALUES(?,?,?,?,?)`).run(a.title,a.content,a.priority||'NORMAL',a.target_group||'ALL',req.user.id);audit(req,'AI_EXECUTE_CREATE','ANNOUNCEMENT',r.lastInsertRowid,JSON.stringify(a));return{message:'AI orqali e’lon yaratildi',id:r.lastInsertRowid}}
 throw new Error('Noma’lum AI action')})();res.json({success:true,result})}catch(e){console.error('ADMIN AI EXECUTE ERROR',e);res.status(400).json({success:false,message:e.message})}});

/* =========================================================
   PROJECTS
========================================================= */

app.get("/api/projects", auth, (req, res) => {
  const projects = db
    .prepare(
      `
      SELECT
        p.*,
        u.first_name || ' ' || u.last_name AS creator_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `
    )
    .all();

  res.json({
    success: true,
    projects,
  });
});

app.post("/api/projects", auth, adminOnly, (req, res) => {
  const {
    name,
    description,
    github_url,
    status,
    progress,
    deadline,
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Project name kerak",
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO projects
      (
        name,
        description,
        github_url,
        status,
        progress,
        deadline,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      name,
      description || "",
      github_url || "",
      status || "ACTIVE",
      Number(progress) || 0,
      deadline || null,
      req.user.id
    );

  audit(
    req,
    "CREATE",
    "PROJECT",
    result.lastInsertRowid,
    name
  );

  res.json({
    success: true,
    message: "Project yaratildi",
    id: result.lastInsertRowid,
  });
});

/* =========================================================
   CHAT REST API
========================================================= */

function getRecentMessages() {
  return db
    .prepare(
      `
      SELECT
        m.id,
        m.message,
        m.created_at,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.role,
        u.avatar
      FROM messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at ASC
      LIMIT 200
    `
    )
    .all();
}

app.get("/api/chat/messages", auth, (req, res) => {
  res.json({
    success: true,
    messages: getRecentMessages(),
  });
});

app.post("/api/chat/messages", auth, (req, res) => {
  const message = String(req.body.message || "").trim();

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Xabar bo‘sh bo‘lishi mumkin emas",
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO messages (user_id, message)
      VALUES (?, ?)
    `
    )
    .run(req.user.id, message);

  const newMessage = db
    .prepare(
      `
      SELECT
        m.id,
        m.message,
        m.created_at,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.role,
        u.avatar
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `
    )
    .get(result.lastInsertRowid);

  io.to(`group:${req.user.group_name}`).emit(
    "chat:new-message",
    newMessage
  );

  res.json({
    success: true,
    message: newMessage,
  });
});

/* =========================================================
   SECURITY REPORTS
========================================================= */

app.post("/api/security-reports", auth, (req, res) => {
  const {
    title,
    category,
    description,
    severity,
  } = req.body;

  if (!title || !category || !description) {
    return res.status(400).json({
      success: false,
      message: "Report maydonlari to‘liq emas",
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO vulnerability_reports
      (
        user_id,
        title,
        category,
        description,
        severity
      )
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .run(
      req.user.id,
      title,
      category,
      description,
      severity || "MEDIUM"
    );

  audit(
    req,
    "CREATE",
    "VULNERABILITY_REPORT",
    result.lastInsertRowid,
    title
  );

  res.json({
    success: true,
    message: "Maxfiy security report yuborildi",
    id: result.lastInsertRowid,
  });
});

app.get("/api/security-reports", auth, adminOnly, (req, res) => {
  const reports = db
    .prepare(
      `
      SELECT
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        u.student_id
      FROM vulnerability_reports r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `
    )
    .all();

  res.json({
    success: true,
    reports,
  });
});

app.put("/api/security-reports/:id", auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);

  const {
    status,
    severity,
    admin_note,
  } = req.body;

  db.prepare(
    `
    UPDATE vulnerability_reports
    SET
      status = ?,
      severity = ?,
      admin_note = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `
  ).run(
    status || "OPEN",
    severity || "MEDIUM",
    admin_note || "",
    id
  );

  audit(
    req,
    "UPDATE",
    "VULNERABILITY_REPORT",
    id,
    `Status: ${status || "OPEN"}`
  );

  res.json({
    success: true,
    message: "Report yangilandi",
  });
});

/* =========================================================
   CTF
========================================================= */

app.get("/api/ctf/challenges", auth, (req, res) => {
  const challenges = db
    .prepare(
      `
      SELECT
        id,
        title,
        category,
        description,
        points,
        created_at
      FROM ctf_challenges
      ORDER BY points ASC
    `
    )
    .all();

  res.json({
    success: true,
    challenges,
  });
});

app.post("/api/ctf/challenges", auth, adminOnly, (req, res) => {
  const {
    title,
    category,
    description,
    points,
    flag,
  } = req.body;

  if (!title || !category || !description || !flag) {
    return res.status(400).json({
      success: false,
      message: "CTF ma'lumotlari to‘liq emas",
    });
  }

  const flagHash = bcrypt.hashSync(flag, 12);

  const result = db
    .prepare(
      `
      INSERT INTO ctf_challenges
      (
        title,
        category,
        description,
        points,
        flag_hash,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      title,
      category,
      description,
      Number(points) || 100,
      flagHash,
      req.user.id
    );

  audit(
    req,
    "CREATE",
    "CTF_CHALLENGE",
    result.lastInsertRowid,
    title
  );

  res.json({
    success: true,
    message: "CTF challenge yaratildi",
    id: result.lastInsertRowid,
  });
});

app.post("/api/ctf/submit", auth, (req, res) => {
  const {
    challenge_id,
    flag,
  } = req.body;

  if (!challenge_id || !flag) {
    return res.status(400).json({
      success: false,
      message: "Challenge va flag kerak",
    });
  }

  const challenge = db
    .prepare("SELECT * FROM ctf_challenges WHERE id = ?")
    .get(challenge_id);

  if (!challenge) {
    return res.status(404).json({
      success: false,
      message: "Challenge topilmadi",
    });
  }

  const alreadySolved = db
    .prepare(
      `
      SELECT id
      FROM ctf_submissions
      WHERE challenge_id = ?
        AND user_id = ?
        AND correct = 1
    `
    )
    .get(challenge_id, req.user.id);

  if (alreadySolved) {
    return res.json({
      success: true,
      correct: false,
      alreadySolved: true,
      message: "Bu challenge allaqachon yechilgan",
    });
  }

  const correct = bcrypt.compareSync(
    flag,
    challenge.flag_hash
  );

  db.prepare(
    `
    INSERT INTO ctf_submissions
    (
      challenge_id,
      user_id,
      correct,
      points
    )
    VALUES (?, ?, ?, ?)
    `
  ).run(
    challenge_id,
    req.user.id,
    correct ? 1 : 0,
    correct ? challenge.points : 0
  );

  res.json({
    success: true,
    correct,
    points: correct ? challenge.points : 0,
    message: correct
      ? "To‘g‘ri flag!"
      : "Flag noto‘g‘ri",
  });
});

app.get("/api/ctf/leaderboard", auth, (req, res) => {
  const leaderboard = db
    .prepare(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.student_id,
        COALESCE(
          SUM(
            CASE
              WHEN s.correct = 1 THEN s.points
              ELSE 0
            END
          ),
          0
        ) AS points
      FROM users u
      LEFT JOIN ctf_submissions s
        ON u.id = s.user_id
      WHERE u.role = 'STUDENT'
      GROUP BY u.id
      ORDER BY points DESC, u.id ASC
      LIMIT 100
    `
    )
    .all();

  res.json({
    success: true,
    leaderboard,
  });
});

/* =========================================================
   AUDIT LOGS
========================================================= */

app.get("/api/audit-logs", auth, adminOnly, (req, res) => {
  const logs = db
    .prepare(
      `
      SELECT
        a.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role
      FROM audit_logs a
      LEFT JOIN users u
        ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 500
    `
    )
    .all();

  res.json({
    success: true,
    logs,
  });
});

/* =========================================================
   DASHBOARD
========================================================= */

app.get("/api/dashboard", auth, (req, res) => {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const todaySchedule = db
    .prepare(
      `
      SELECT COUNT(*) count
      FROM schedules
      WHERE
        (group_name = 'ALL' OR group_name = ?)
        AND
        (date = ? OR date IS NULL)
    `
    )
    .get(
      req.user.group_name,
      today
    ).count;

  const tasks = db
    .prepare(
      `
      SELECT COUNT(*) count
      FROM tasks
      WHERE group_name = 'ALL'
         OR group_name = ?
    `
    )
    .get(req.user.group_name).count;

  const announcements = db
    .prepare(
      `
      SELECT COUNT(*) count
      FROM announcements
      WHERE target_group = 'ALL'
         OR target_group = ?
    `
    )
    .get(req.user.group_name).count;

  const projects = db
    .prepare(
      "SELECT COUNT(*) count FROM projects"
    )
    .get().count;

  const ctf = db
    .prepare(
      "SELECT COUNT(*) count FROM ctf_challenges"
    )
    .get().count;

  const students = db
    .prepare(
      "SELECT COUNT(*) count FROM users WHERE role = 'STUDENT'"
    )
    .get().count;

  res.json({
    success: true,

    today_schedule_count: todaySchedule,

    tasks_count: tasks,

    announcements_count: announcements,

    projects_count: projects,

    ctf_count: ctf,

    students_count: students,

    statistics: {
      tasks,
      projects,
      announcements,
      students,
    },
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* =========================================================
   START SERVER
========================================================= */

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("");

  console.log(
    "=============================================="
  );

  console.log(
    "     KOKAND CYBER CAMPUS API"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `Server: http://0.0.0.0:${PORT}`
  );

  console.log(
    `Health: http://0.0.0.0:${PORT}/api/health`
  );

  console.log(
    `Database: ${DB_PATH}`
  );

  console.log(
    "Status: ONLINE"
  );

  console.log(
    "Real-time Chat: Socket.IO ENABLED"
  );

  console.log(
    "=============================================="
  );

  console.log("");
});

