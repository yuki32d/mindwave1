import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import fs from "fs";
import multer from "multer";

dotenv.config();

const {
  PORT = 8081,
  MONGODB_URI = "mongodb://127.0.0.1:27017/mindwave",
  JWT_SECRET = "mindwave_demo_secret",
  CLIENT_ORIGIN = "http://localhost:8081",
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = "no-reply@mindwave.local",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = "http://localhost:8081/auth/google/callback"
} = process.env;

let mailer = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendResetCodeEmail(to, code) {
  if (!mailer) return false;
  try {
    const info = await mailer.sendMail({
      from: SMTP_FROM,
      to,
      subject: "Mindwave Password Reset Code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`Email preview: ${preview}`);
    }
    return true;
  } catch {
    return false;
  }
}

// Enable Ethereal test SMTP automatically when no SMTP is configured
if (!mailer) {
  (async () => {
    try {
      const account = await nodemailer.createTestAccount();
      mailer = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass }
      });
      console.log(`Ethereal SMTP enabled: ${account.user}`);
    } catch (error) {
      console.warn('Ethereal SMTP setup failed; will log codes to console only');
    }
  })();
}

mongoose.set("strictQuery", true);
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    seedSubjects();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    googleAccessToken: { type: String },
    googleRefreshToken: { type: String }
  },
  { timestamps: true }
);

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const adminNotificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

const gameSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true },
    difficulty: { type: String, required: true },
    brief: { type: String, required: true },
    published: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetSchema);
const AdminNotification = mongoose.model("AdminNotification", adminNotificationSchema);
const Game = mongoose.model("Game", gameSchema);

const gameSubmissionSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isCorrect: { type: Boolean, required: true },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const timeAttackSessionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
    currentQuestionIndex: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' }
  },
  { timestamps: true }
);

const timeAttackLeaderboardSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    timeTakenMs: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const GameSubmission = mongoose.model("GameSubmission", gameSubmissionSchema);
const TimeAttackSession = mongoose.model("TimeAttackSession", timeAttackSessionSchema);
const TimeAttackLeaderboard = mongoose.model("TimeAttackLeaderboard", timeAttackLeaderboardSchema);

// Custom Course Management Schemas
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  icon: { type: String, default: '📚' },
  description: String
}, { timestamps: true });

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true }, // 'pdf', 'ppt', 'image', etc.
  fileUrl: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pinned: { type: Boolean, default: false },
  folder: { type: String, default: 'General' },
  downloads: { type: Number, default: 0 },
  description: { type: String, default: '' },
  fileSize: { type: Number, default: 0 }
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  recipientRole: { type: String, enum: ['student', 'all'], default: 'student' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' }, // 'material', 'game', 'info'
  read: { type: Boolean, default: false },
  link: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
const Material = mongoose.model("Material", materialSchema);
const Notification = mongoose.model("Notification", notificationSchema);


const app = express();
const allowedOrigins = new Set([
  CLIENT_ORIGIN,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8081',
  'http://127.0.0.1:8081'
]);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.has(origin) ||
        /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/.test(origin) ||
        origin === 'null'
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files (HTML, CSS, JS, images) from the root directory
app.use(express.static(__dirname));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const STUDENT_EMAIL_REGEX = /\.mca25@cmrit\.ac\.in$/i;
const ADMIN_EMAIL_REGEX = /\.mca@cmrit\.ac\.in$/i;

function validateEmail(email, role) {
  if (!email) return false;
  if (role === "admin") {
    return ADMIN_EMAIL_REGEX.test(email);
  }
  if (role === "student") {
    return STUDENT_EMAIL_REGEX.test(email);
  }
  return STUDENT_EMAIL_REGEX.test(email) || ADMIN_EMAIL_REGEX.test(email);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function sanitizeRole(role) {
  return ["student", "admin"].includes(role) ? role : "student";
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.mindwave_token;
  if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Mindwave API running" });
});

async function createAdminNotification(message, meta = {}) {
  try {
    await AdminNotification.create({ message, meta });
  } catch (error) {
    console.error("Failed to create admin notification:", error);
  }
}

app.post("/api/signup", authLimiter, async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, message: "All fields are required" });
  }
  const safeRole = sanitizeRole(role);
  if (!validateEmail(email, safeRole)) {
    return res.status(400).json({ ok: false, message: "Use your campus email" });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: safeRole
    });

    const token = signToken(user);
    res
      .cookie("mindwave_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .status(201)
      .json({
        ok: true,
        user: { name: user.name, email: user.email, role: user.role }
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ ok: false, message: "Email already registered" });
    }
    console.error("Signup error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  const { email, password, role } = req.body || {};
  const safeRole = sanitizeRole(role);
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and password required" });
  }
  if (!validateEmail(email, safeRole)) {
    return res.status(400).json({ ok: false, message: "Use your campus email" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase(), role: safeRole });
    if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const token = signToken(user);
    res
      .cookie("mindwave_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({
        ok: true,
        user: { name: user.name, email: user.email, role: user.role }
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.post("/api/logout", (_req, res) => {
  res
    .clearCookie("mindwave_token", { httpOnly: true, sameSite: "lax", secure: false })
    .json({ ok: true });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.sub).select("-password");
  res.json({ ok: true, user });
});

app.post("/api/password/forgot", authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ ok: false, message: "Email is required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ ok: false, message: "No account found for this email" });
  }

  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const codeHash = await bcrypt.hash(verificationCode, 10);

  await PasswordResetRequest.create({
    email: user.email,
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const sent = await sendResetCodeEmail(user.email, verificationCode);
  if (!sent) {
    console.log(`Password reset code for ${user.email}: ${verificationCode}`);
  }

  res.json({
    ok: true,
    message: sent ? "Password reset code sent to your email." : "Password reset code sent. Please check your email (console log in dev)."
  });
});

app.post("/api/password/reset", authLimiter, async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ ok: false, message: "Email, code, and new password are required" });
  }
  if (!validatePassword(newPassword)) {
    return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
  }

  const requestRecord = await PasswordResetRequest.findOne({
    email: email.toLowerCase(),
    used: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!requestRecord) {
    return res.status(400).json({ ok: false, message: "No valid reset request found" });
  }

  const isValidCode = await bcrypt.compare(code, requestRecord.codeHash);
  if (!isValidCode) {
    return res.status(400).json({ ok: false, message: "Invalid verification code" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ ok: false, message: "User not found" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  requestRecord.used = true;
  await requestRecord.save();

  await createAdminNotification("Password reset completed", {
    email: user.email,
    resetAt: new Date().toISOString()
  });

  res.json({ ok: true, message: "Password updated successfully" });
});

// Game endpoints
app.post("/api/games", authMiddleware, async (req, res) => {
  const { title, type, difficulty, brief } = req.body || {};
  if (!title || !type || !difficulty || !brief) {
    return res.status(400).json({ ok: false, message: "All game fields are required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can create games" });
  }
  try {
    const game = await Game.create({
      title,
      type,
      difficulty,
      brief,
      createdBy: req.user.sub
    });
    res.status(201).json({ ok: true, game });
  } catch (error) {
    console.error("Game creation error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.put("/api/games/:id/publish", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can publish games" });
  }
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ ok: false, message: "Game not found" });
    }
    if (game.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only publish your own games" });
    }
    game.published = true;
    await game.save();
    res.json({ ok: true, game });
  } catch (error) {
    console.error("Game publish error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.get("/api/games/published", async (req, res) => {
  try {
    const games = await Game.find({ published: true }).populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json({ ok: true, games });
  } catch (error) {
    console.error("Get published games error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.get("/api/games/my", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can view their games" });
  }
  try {
    const games = await Game.find({ createdBy: req.user.sub }).sort({ createdAt: -1 });
    res.json({ ok: true, games });
  } catch (error) {
    console.error("Get my games error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Time Attack endpoints
const TIME_ATTACK_QUESTION_COUNT = 5;

app.post("/api/time-attack/start", authMiddleware, async (req, res) => {
  try {
    const { type, difficulty } = req.body || {};
    const query = { published: true };
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;

    const questions = await Game.aggregate([
      { $match: query },
      { $sample: { size: TIME_ATTACK_QUESTION_COUNT } },
      { $project: { _id: 1 } }
    ]);

    if (questions.length < 1) {
      return res.status(404).json({ ok: false, message: "Not enough questions available to start a Time Attack session." });
    }

    const questionIds = questions.map(q => q._id);

    const session = await TimeAttackSession.create({
      studentId: req.user.sub,
      questions: questionIds,
    });

    const firstQuestion = await Game.findById(session.questions[0]).select("-createdBy -published");

    res.json({ ok: true, sessionId: session._id, question: firstQuestion });

  } catch (error) {
    console.error("Time Attack start error:", error);
    res.status(500).json({ ok: false, message: "Server error starting Time Attack session" });
  }
});

app.post("/api/time-attack/submit", authMiddleware, async (req, res) => {
  try {
    const { sessionId, isCorrect } = req.body;
    if (!sessionId || isCorrect === undefined) {
      return res.status(400).json({ ok: false, message: "sessionId and isCorrect are required" });
    }

    const session = await TimeAttackSession.findById(sessionId);
    if (!session || session.studentId.toString() !== req.user.sub || session.status !== 'in-progress') {
      return res.status(404).json({ ok: false, message: "Active session not found" });
    }

    if (isCorrect) {
      session.score += 10; // Add 10 points for a correct answer
    }

    // Log the individual submission
    await GameSubmission.create({
      gameId: session.questions[session.currentQuestionIndex],
      studentId: req.user.sub,
      isCorrect: !!isCorrect
    });

    session.currentQuestionIndex += 1;

    if (session.currentQuestionIndex >= session.questions.length) {
      // Game over
      session.status = 'completed';
      session.endTime = new Date();
      const timeTakenMs = session.endTime - session.startTime;

      await TimeAttackLeaderboard.create({
        studentId: req.user.sub,
        score: session.score,
        timeTakenMs: timeTakenMs
      });

      await session.save();

      return res.json({ ok: true, status: 'completed', finalScore: session.score, timeTakenMs });

    } else {
      // Next question
      await session.save();
      const nextQuestion = await Game.findById(session.questions[session.currentQuestionIndex]).select("-createdBy -published");
      return res.json({ ok: true, status: 'in-progress', question: nextQuestion });
    }

  } catch (error) {
    console.error("Time Attack submit error:", error);
    res.status(500).json({ ok: false, message: "Server error submitting answer" });
  }
});


app.get("/api/leaderboard/time-attack", async (req, res) => {
  try {
    const leaderboard = await TimeAttackLeaderboard.find({})
      .sort({ score: -1, timeTakenMs: 1 })
      .limit(10)
      .populate('studentId', 'name');

    res.json({ ok: true, leaderboard });
  } catch (error) {
    console.error("Get Time Attack leaderboard error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Custom Course Management Endpoints

// Seed Subjects
async function seedSubjects() {
  const subjects = [
    { name: "DBMS", code: "DBMS101", icon: "🗄️", description: "Database Management Systems" },
    { name: "C Programming", code: "CS101", icon: "💻", description: "Introduction to C" },
    { name: "Web Technologies", code: "WEB101", icon: "🌐", description: "HTML, CSS, JS" },
    { name: "Mathematics", code: "MATH101", icon: "📐", description: "Engineering Mathematics" },
    { name: "Operating Systems", code: "OS101", icon: "⚙️", description: "OS Concepts" },
    { name: "TYL", code: "TYL101", icon: "🚀", description: "Tie Your Laces (Soft Skills)" }
  ];
  try {
    for (const s of subjects) {
      await Subject.findOneAndUpdate({ code: s.code }, s, { upsert: true });
    }
    console.log("Subjects seeded successfully");
  } catch (err) {
    console.error("Subject seeding failed:", err);
  }
}

app.get("/api/subjects", async (req, res) => {
  try {
    const subjects = await Subject.find({}).sort({ name: 1 });
    res.json({ ok: true, subjects });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch subjects" });
  }
});

app.get("/api/materials/:subjectId", authMiddleware, async (req, res) => {
  try {
    const materials = await Material.find({ subjectId: req.params.subjectId }).sort({ createdAt: -1 });
    res.json({ ok: true, materials });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch materials" });
  }
});

// Configure Multer for preserving extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const uploadWithExt = multer({ storage: storage });

app.post("/api/materials", authMiddleware, uploadWithExt.single('file'), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can upload" });
  }
  const { subjectId, title, type } = req.body;
  const file = req.file;

  if (!subjectId || !file || !title) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }

  try {
    const material = await Material.create({
      title,
      type: type || 'file',
      fileUrl: `/uploads/${file.filename}`,
      subjectId,
      createdBy: req.user.sub
    });

    // Create Notification
    const subject = await Subject.findById(subjectId);
    const subjectName = subject ? subject.name : 'a subject';

    await Notification.create({
      recipientRole: 'student',
      title: `New Material in ${subjectName}`,
      message: `New ${type} added: ${title}`,
      type: 'material',
      link: `/student-courses.html?subject=${subjectId}`
    });

    res.json({ ok: true, material });
  } catch (error) {
    console.error("Material upload error:", error);
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
});

// Delete material
app.delete("/api/materials/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can delete materials" });
  }

  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ ok: false, message: "Material not found" });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Material deleted successfully" });
  } catch (error) {
    console.error("Delete material error:", error);
    res.status(500).json({ ok: false, message: "Failed to delete material" });
  }
});

// Update material metadata
app.put("/api/materials/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can update materials" });
  }

  const { title, description, pinned, folder } = req.body;

  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { title, description, pinned, folder },
      { new: true }
    );

    if (!material) {
      return res.status(404).json({ ok: false, message: "Material not found" });
    }

    res.json({ ok: true, material });
  } catch (error) {
    console.error("Update material error:", error);
    res.status(500).json({ ok: false, message: "Failed to update material" });
  }
});

// Bulk upload materials
app.post("/api/materials/bulk", authMiddleware, uploadWithExt.array('files', 10), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can upload" });
  }

  const { subjectId, folder } = req.body;
  const files = req.files;

  if (!subjectId || !files || files.length === 0) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }

  try {
    const materials = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      let type = 'file';
      if (ext === '.pdf') type = 'PDF';
      else if (['.ppt', '.pptx'].includes(ext)) type = 'PPT';
      else if (['.doc', '.docx'].includes(ext)) type = 'DOC';
      else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) type = 'Image';
      else if (['.mp4', '.avi', '.mov'].includes(ext)) type = 'Video';

      const material = await Material.create({
        title: file.originalname,
        type,
        fileUrl: `/uploads/${file.filename}`,
        subjectId,
        createdBy: req.user.sub,
        folder: folder || 'General',
        fileSize: file.size
      });

      materials.push(material);
    }

    // Create notification for bulk upload
    const subject = await Subject.findById(subjectId);
    const subjectName = subject ? subject.name : 'a subject';

    await Notification.create({
      recipientRole: 'student',
      title: `New Materials in ${subjectName}`,
      message: `${materials.length} new materials added`,
      type: 'material',
      link: `/student-courses.html?subject=${subjectId}`
    });

    res.json({ ok: true, materials, count: materials.length });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ ok: false, message: "Bulk upload failed" });
  }
});

// Get material analytics for a subject
app.get("/api/materials/:subjectId/stats", authMiddleware, async (req, res) => {
  try {
    const materials = await Material.find({ subjectId: req.params.subjectId });

    const stats = {
      totalMaterials: materials.length,
      totalDownloads: materials.reduce((sum, m) => sum + (m.downloads || 0), 0),
      byType: {},
      byFolder: {},
      mostDownloaded: materials.sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 5),
      recentUploads: materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    };

    // Count by type
    materials.forEach(m => {
      stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;
      stats.byFolder[m.folder] = (stats.byFolder[m.folder] || 0) + 1;
    });

    res.json({ ok: true, stats });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch stats" });
  }
});

// Track material download
app.post("/api/materials/:id/download", authMiddleware, async (req, res) => {
  try {
    await Material.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to track download" });
  }
});

// Send manual notification
app.post("/api/notifications/send", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can send notifications" });
  }

  const { title, message, recipientRole, link } = req.body;

  if (!title || !message) {
    return res.status(400).json({ ok: false, message: "Title and message required" });
  }

  try {
    const notification = await Notification.create({
      recipientRole: recipientRole || 'student',
      title,
      message,
      type: 'info',
      link: link || ''
    });

    res.json({ ok: true, notification });
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({ ok: false, message: "Failed to send notification" });
  }
});

app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientRole: { $in: ['all', req.user.role] }
    }).sort({ createdAt: -1 }).limit(20);
    res.json({ ok: true, notifications });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch notifications" });
  }
});


app.post("/api/logout", (req, res) => {
  res.clearCookie("mindwave_token");
  res.json({ ok: true, message: "Logged out successfully" });
});


// Google Classroom Integration

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const upload = multer({ dest: 'uploads/' });

app.get("/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).send("Google Credentials not configured in server.");
  }
  const scopes = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me",
    "https://www.googleapis.com/auth/drive.file"
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: req.cookies.mindwave_token // Pass user token to link account
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Verify user from state (original token)
    if (!state) return res.status(401).send("Authentication failed: No state returned");

    let userId;
    try {
      const decoded = jwt.verify(state, JWT_SECRET);
      userId = decoded.sub;
    } catch (e) {
      return res.status(401).send("Authentication failed: Invalid state token");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    user.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }
    await user.save();

    res.redirect("/"); // Redirect back to homepage
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

async function getGoogleClient(user) {
  if (!user.googleAccessToken) return null;

  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });

  // Handle token refresh if needed (simplified)
  return client;
}

app.get("/api/classroom/courses", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);

    if (!auth) {
      return res.json({ ok: true, connected: false, courses: [] });
    }

    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.list({
      courseStates: ["ACTIVE"],
      pageSize: 10
    });

    const courses = response.data.courses || [];
    res.json({ ok: true, connected: true, courses });
  } catch (error) {
    console.error("Classroom API Error:", error);
    if (error.code === 401) {
      // Token might be invalid
      return res.json({ ok: true, connected: false, courses: [], error: "Token expired" });
    }
    res.status(500).json({ ok: false, message: "Failed to fetch courses" });
  }
});

app.post("/api/classroom/upload", authMiddleware, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Only admins can upload" });
  }

  const { courseId } = req.body;
  const file = req.file;

  if (!courseId || !file) {
    return res.status(400).json({ ok: false, message: "Course ID and file are required" });
  }

  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);
    if (!auth) return res.status(401).json({ ok: false, message: "Google account not connected" });

    const drive = google.drive({ version: "v3", auth });
    const classroom = google.classroom({ version: "v1", auth });

    // 1. Upload to Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.originalname,
        mimeType: file.mimetype
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path)
      }
    });

    const fileId = driveResponse.data.id;

    // 2. Add to Classroom as CourseWork (Material)
    await classroom.courses.courseWorkMaterials.create({
      courseId: courseId,
      requestBody: {
        title: `New Material: ${file.originalname}`,
        materials: [
          {
            driveFile: {
              driveFile: { id: fileId }
            }
          }
        ],
        state: "PUBLISHED"
      }
    });

    // Cleanup temp file
    fs.unlinkSync(file.path);

    res.json({ ok: true, message: "File uploaded to Classroom successfully" });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
});

app.use(express.static(__dirname));

function listenWithFallback(preferred) {
  let port = Number(preferred) || 8080;
  let attempts = 0;
  function attempt() {
    const server = app.listen(port, () => {
      console.log(`Mindwave API running on http://localhost:${port}`);
    });
    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE" && attempts < 10) {
        attempts += 1;
        port += 1;
        attempt();
      } else {
        console.error(err);
        process.exit(1);
      }
    });
  }
  attempt();
}

listenWithFallback(PORT);
