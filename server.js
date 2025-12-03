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
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  GOOGLE_REDIRECT_URI = "http://localhost:8081/auth/google/callback",
  // GitHub OAuth
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI = "http://localhost:8081/auth/github/callback",
  // Zoom OAuth
  ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET,
  ZOOM_REDIRECT_URI = "http://localhost:8081/auth/zoom/callback"
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
    googleRefreshToken: { type: String },
    // GitHub Integration
    githubAccessToken: { type: String },
    githubUsername: { type: String },
    // Zoom Integration
    zoomAccessToken: { type: String },
    zoomRefreshToken: { type: String }
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
    difficulty: { type: String, default: 'Normal' },
    brief: { type: String }, // Short description
    description: { type: String }, // Full description
    published: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Game Specific Data
    duration: { type: Number, default: 10 },
    totalPoints: { type: Number, default: 100 },
    questions: { type: Array, default: [] }, // For Quiz
    items: { type: Array, default: [] }, // For Sorter
    categories: { type: Array, default: [] }, // For Sorter
    blanks: { type: Array, default: [] }, // For Fill-in
    content: { type: String }, // For Fill-in
    perfectCode: { type: String }, // For Debug
    buggyCode: { type: String }, // For Debug
    bugCount: { type: Number }, // For Debug
    bugs: { type: Array, default: [] }, // For Debug
    explanation: { type: String }, // For Debug
    language: { type: String }, // For Debug
    blocks: { type: Array, default: [] }, // For SQL
    distractors: { type: Array, default: [] }, // For SQL
    correctQuery: { type: String } // For SQL
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

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  audience: { type: String, default: 'All Students' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Announcement = mongoose.model("Announcement", announcementSchema);

// Community Feature Schemas
const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 300 },
  content: { type: String, required: true, maxlength: 5000 },
  postType: { type: String, enum: ['text', 'image', 'video', 'project'], default: 'text' },
  mediaUrl: { type: String }, // For images/videos
  projectUrl: { type: String }, // For project links
  tags: [{ type: String }], // Hashtags or category tags
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  isReported: { type: Boolean, default: false },
  reportCount: { type: Number, default: 0 }
}, { timestamps: true });

const communityCommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2000 },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityComment' }, // For nested replies
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const postReportSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' }
}, { timestamps: true });

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);
const CommunityComment = mongoose.model("CommunityComment", communityCommentSchema);
const PostReport = mongoose.model("PostReport", postReportSchema);


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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://cdnjs.cloudflare.com"],
      "style-src": ["'self'", "https://cdnjs.cloudflare.com", "'unsafe-inline'"]
    }
  }
}));
app.use(express.json());
app.use(cookieParser());
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files (HTML, CSS, JS, images) from the root directory
app.use(express.static(__dirname, { index: false }));

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
  res.redirect("/login.html");
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
  const body = req.body || {};
  const { title, type } = body;

  if (!title || !type) {
    return res.status(400).json({ ok: false, message: "Title and Type are required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can create games" });
  }

  try {
    console.log('Received game creation request:', { title, type, body });

    const gameData = {
      ...body,
      brief: body.brief || body.description || 'No description',
      description: body.description || body.brief || 'No description',
      difficulty: body.difficulty || 'Normal',
      published: body.published || body.status === 'active' || false,
      createdBy: req.user.sub
    };

    // Remove _id and id if present to let Mongo generate it
    delete gameData._id;
    delete gameData.id;

    console.log('Creating game with data:', gameData);
    const game = await Game.create(gameData);
    console.log('Game created successfully:', game._id);
    res.status(201).json({ ok: true, game });
  } catch (error) {
    console.error("Game creation error:", error);
    res.status(500).json({ ok: false, message: "Server error: " + error.message });
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

app.delete("/api/games/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can delete games" });
  }
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ ok: false, message: "Game not found" });
    }
    if (game.createdBy.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only delete your own games" });
    }
    await Game.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Game deleted successfully" });
  } catch (error) {
    console.error("Delete game error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Announcement Endpoints
app.post("/api/announcements", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can create announcements" });
  }
  const { title, body, audience } = req.body;
  if (!title || !body) {
    return res.status(400).json({ ok: false, message: "Title and body are required" });
  }
  try {
    const announcement = await Announcement.create({
      title,
      body,
      audience,
      createdBy: req.user.sub
    });

    // Create notification for students
    await Notification.create({
      recipientRole: 'student',
      title: `New Announcement: ${title}`,
      message: body.substring(0, 50) + (body.length > 50 ? '...' : ''),
      type: 'info',
      link: '/student-dashboard.html'
    });

    res.status(201).json({ ok: true, announcement });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.get("/api/announcements", async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(20);
    res.json({ ok: true, announcements });
  } catch (error) {
    console.error("Get announcements error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.delete("/api/announcements/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Only admins can delete announcements" });
  }
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: "Announcement deleted" });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ============================================
// Community Feature Endpoints
// ============================================

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

// Create a new community post
app.post("/api/community/posts", authMiddleware, uploadWithExt.single('media'), async (req, res) => {
  try {
    const { title, content, postType, projectUrl, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ ok: false, message: "Title and content are required" });
    }

    const postData = {
      author: req.user.sub,
      title,
      content,
      postType: postType || 'text',
      projectUrl: projectUrl || null,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : []
    };

    // Add media URL if file was uploaded
    if (req.file) {
      postData.mediaUrl = `/uploads/${req.file.filename}`;
    }

    const post = await CommunityPost.create(postData);
    const populatedPost = await CommunityPost.findById(post._id).populate('author', 'name email');

    // Create notification for all students
    await Notification.create({
      recipientRole: 'student',
      title: 'New Community Post',
      message: `${req.user.name} shared: ${title}`,
      type: 'info',
      link: '/student-community.html'
    });

    res.status(201).json({ ok: true, post: populatedPost });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get all community posts with pagination and filters
app.get("/api/community/posts", async (req, res) => {
  try {
    const { sort = 'recent', tag, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};

    // Filter by tag if provided
    if (tag) {
      query.tags = tag;
    }

    // Search in title and content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { likeCount: -1, createdAt: -1 };
        break;
      case 'trending':
        sortOption = { viewCount: -1, likeCount: -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortOption = { isPinned: -1, createdAt: -1 };
    }

    const posts = await CommunityPost.find(query)
      .populate('author', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CommunityPost.countDocuments(query);

    res.json({
      ok: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get single post with comments
app.get("/api/community/posts/:id", async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('author', 'name email');

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    const comments = await CommunityComment.find({ postId: req.params.id, parentComment: null })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json({ ok: true, post, comments });
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Update post (author only)
app.put("/api/community/posts/:id", authMiddleware, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    if (post.author.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only edit your own posts" });
    }

    const { title, content, tags } = req.body;

    if (title) post.title = title;
    if (content) post.content = content;
    if (tags) post.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

    await post.save();
    const updatedPost = await CommunityPost.findById(post._id).populate('author', 'name email');

    res.json({ ok: true, post: updatedPost });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Delete post (author or admin)
app.delete("/api/community/posts/:id", authMiddleware, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    if (post.author.toString() !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Unauthorized" });
    }

    // Delete associated media file if exists
    if (post.mediaUrl) {
      const filePath = path.join(process.cwd(), post.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete all comments associated with this post
    await CommunityComment.deleteMany({ postId: req.params.id });

    await CommunityPost.findByIdAndDelete(req.params.id);

    res.json({ ok: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Toggle like on post
app.post("/api/community/posts/:id/like", authMiddleware, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    const userId = req.user.sub;
    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      // Like
      post.likes.push(userId);
      post.likeCount += 1;
    }

    await post.save();

    res.json({ ok: true, liked: likeIndex === -1, likeCount: post.likeCount });
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Increment view count
app.post("/api/community/posts/:id/view", async (req, res) => {
  try {
    await CommunityPost.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch (error) {
    console.error("View post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Add comment to post
app.post("/api/community/posts/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { content, parentComment } = req.body;

    if (!content) {
      return res.status(400).json({ ok: false, message: "Content is required" });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    const comment = await CommunityComment.create({
      postId: req.params.id,
      author: req.user.sub,
      content,
      parentComment: parentComment || null
    });

    // Increment comment count on post
    post.commentCount += 1;
    await post.save();

    const populatedComment = await CommunityComment.findById(comment._id)
      .populate('author', 'name email');

    res.status(201).json({ ok: true, comment: populatedComment });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get comments for a post
app.get("/api/community/posts/:id/comments", async (req, res) => {
  try {
    const comments = await CommunityComment.find({
      postId: req.params.id,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CommunityComment.find({
          parentComment: comment._id,
          isDeleted: false
        })
          .populate('author', 'name email')
          .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    res.json({ ok: true, comments: commentsWithReplies });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Update comment (author only)
app.put("/api/community/comments/:id", authMiddleware, async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ ok: false, message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user.sub) {
      return res.status(403).json({ ok: false, message: "You can only edit your own comments" });
    }

    const { content } = req.body;
    if (content) {
      comment.content = content;
      await comment.save();
    }

    const updatedComment = await CommunityComment.findById(comment._id)
      .populate('author', 'name email');

    res.json({ ok: true, comment: updatedComment });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Delete comment (author or admin)
app.delete("/api/community/comments/:id", authMiddleware, async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ ok: false, message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: "Unauthorized" });
    }

    // Mark as deleted instead of actually deleting
    comment.isDeleted = true;
    comment.content = "[This comment has been deleted]";
    await comment.save();

    // Decrement comment count on post
    await CommunityPost.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });

    res.json({ ok: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Toggle like on comment
app.post("/api/community/comments/:id/like", authMiddleware, async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ ok: false, message: "Comment not found" });
    }

    const userId = req.user.sub;
    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      comment.likes.push(userId);
      comment.likeCount += 1;
    }

    await comment.save();

    res.json({ ok: true, liked: likeIndex === -1, likeCount: comment.likeCount });
  } catch (error) {
    console.error("Like comment error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Report a post
app.post("/api/community/posts/:id/report", authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ ok: false, message: "Reason is required" });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    // Check if user already reported this post
    const existingReport = await PostReport.findOne({
      postId: req.params.id,
      reportedBy: req.user.sub
    });

    if (existingReport) {
      return res.status(400).json({ ok: false, message: "You have already reported this post" });
    }

    await PostReport.create({
      postId: req.params.id,
      reportedBy: req.user.sub,
      reason
    });

    // Update post report count
    post.isReported = true;
    post.reportCount += 1;
    await post.save();

    res.json({ ok: true, message: "Post reported successfully" });
  } catch (error) {
    console.error("Report post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get all reports (admin only)
app.get("/api/community/reports", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  try {
    const reports = await PostReport.find({ status: 'pending' })
      .populate('postId')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ ok: true, reports });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Resolve report (admin only)
app.put("/api/community/reports/:id/resolve", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  try {
    const report = await PostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ ok: false, message: "Report not found" });
    }

    report.status = 'resolved';
    await report.save();

    res.json({ ok: true, message: "Report resolved" });
  } catch (error) {
    console.error("Resolve report error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Pin/unpin post (admin only)
app.put("/api/community/posts/:id/pin", authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.json({ ok: true, isPinned: post.isPinned });
  } catch (error) {
    console.error("Pin post error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get posts by specific user
app.get("/api/community/users/:userId/posts", async (req, res) => {
  try {
    const posts = await CommunityPost.find({ author: req.params.userId })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ ok: true, posts });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get trending tags
app.get("/api/community/tags/trending", async (req, res) => {
  try {
    const posts = await CommunityPost.find({}).select('tags');
    const tagCounts = {};

    posts.forEach(post => {
      post.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const trendingTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ ok: true, tags: trendingTags });
  } catch (error) {
    console.error("Get trending tags error:", error);
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

// GitHub Integration
app.get("/auth/github", (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(500).send("GitHub Credentials not configured.");
  }
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo,user&state=${req.cookies.mindwave_token}`;
  res.redirect(redirectUri);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    // Verify user from state
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

    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description);
    }

    user.githubAccessToken = tokenData.access_token;

    // Fetch GitHub username
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'Mindwave-App'
      }
    });
    const userData = await userResponse.json();
    if (userData.login) {
      user.githubUsername = userData.login;
    }

    await user.save();
    res.redirect("/student-github.html");
  } catch (error) {
    console.error("GitHub Auth Error:", error);
    res.status(500).send("GitHub Authentication failed");
  }
});

app.get("/api/github/repos", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.githubAccessToken) {
      return res.json({ ok: true, connected: false, repos: [] });
    }

    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
      headers: {
        'Authorization': `token ${user.githubAccessToken}`,
        'User-Agent': 'Mindwave-App'
      }
    });

    if (response.status === 401) {
      return res.json({ ok: true, connected: false, repos: [], error: "Token expired" });
    }

    const repos = await response.json();
    res.json({ ok: true, connected: true, repos });
  } catch (error) {
    console.error("GitHub Repos Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch repos" });
  }
});

app.get("/api/github/commits/:owner/:repo", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.githubAccessToken) {
      return res.status(401).json({ ok: false, message: "GitHub not connected" });
    }

    const { owner, repo } = req.params;
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, {
      headers: {
        'Authorization': `token ${user.githubAccessToken}`,
        'User-Agent': 'Mindwave-App'
      }
    });

    const commits = await response.json();
    res.json({ ok: true, commits });
  } catch (error) {
    console.error("GitHub Commits Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch commits" });
  }
});

app.post("/api/github/submit-assignment", authMiddleware, async (req, res) => {
  try {
    const { repoUrl, comments } = req.body;
    // In a real app, this would save to a submission schema
    // For now, we'll just log it and return success
    console.log(`Assignment submitted by ${req.user.sub}: ${repoUrl}`);

    res.json({ ok: true, message: "Assignment submitted successfully via GitHub!" });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Submission failed" });
  }
});

// Zoom Integration
app.get("/auth/zoom", (req, res) => {
  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    return res.status(500).send("Zoom Credentials not configured.");
  }
  const redirectUri = `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${ZOOM_REDIRECT_URI}&state=${req.cookies.mindwave_token}`;
  res.redirect(redirectUri);
});

app.get("/auth/zoom/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
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

    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: ZOOM_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.reason);
    }

    user.zoomAccessToken = tokenData.access_token;
    user.zoomRefreshToken = tokenData.refresh_token;
    await user.save();

    res.redirect("/student-zoom.html");
  } catch (error) {
    console.error("Zoom Auth Error:", error);
    res.status(500).send("Zoom Authentication failed");
  }
});

app.get("/api/zoom/meetings", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.zoomAccessToken) {
      return res.json({ ok: true, connected: false, meetings: [] });
    }

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings?type=upcoming', {
      headers: {
        'Authorization': `Bearer ${user.zoomAccessToken}`
      }
    });

    if (response.status === 401) {
      // Token expired - in a real app we'd use refresh token here
      return res.json({ ok: true, connected: false, meetings: [], error: "Token expired" });
    }

    const data = await response.json();
    res.json({ ok: true, connected: true, meetings: data.meetings || [] });
  } catch (error) {
    console.error("Zoom Meetings Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch meetings" });
  }
});

app.get("/api/zoom/recordings", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user.zoomAccessToken) {
      return res.status(401).json({ ok: false, message: "Zoom not connected" });
    }

    // Get recordings from the last month
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    const fromStr = fromDate.toISOString().split('T')[0];

    const response = await fetch(`https://api.zoom.us/v2/users/me/recordings?from=${fromStr}`, {
      headers: {
        'Authorization': `Bearer ${user.zoomAccessToken}`
      }
    });

    const data = await response.json();
    res.json({ ok: true, recordings: data.meetings || [] });
  } catch (error) {
    console.error("Zoom Recordings Error:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch recordings" });
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

// Get coursework (assignments) for a specific course
app.get("/api/classroom/coursework/:courseId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);

    if (!auth) {
      return res.json({ ok: true, connected: false, coursework: [] });
    }

    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.courseWork.list({
      courseId: req.params.courseId,
      pageSize: 20,
      orderBy: "dueDate desc"
    });

    const coursework = response.data.courseWork || [];
    res.json({ ok: true, connected: true, coursework });
  } catch (error) {
    console.error("Coursework API Error:", error);
    if (error.code === 401) {
      return res.json({ ok: true, connected: false, coursework: [], error: "Token expired" });
    }
    res.status(500).json({ ok: false, message: "Failed to fetch coursework" });
  }
});

// Get materials for a specific course
app.get("/api/classroom/materials/:courseId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const auth = await getGoogleClient(user);

    if (!auth) {
      return res.json({ ok: true, connected: false, materials: [] });
    }

    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.courseWorkMaterials.list({
      courseId: req.params.courseId,
      pageSize: 20
    });

    const materials = response.data.courseWorkMaterial || [];
    res.json({ ok: true, connected: true, materials });
  } catch (error) {
    console.error("Materials API Error:", error);
    if (error.code === 401) {
      return res.json({ ok: true, connected: false, materials: [], error: "Token expired" });
    }
    res.status(500).json({ ok: false, message: "Failed to fetch materials" });
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

// Chatbot Endpoint - Google Gemini
app.post("/api/chat", async (req, res) => {
  try {
    console.log("Chat request received");
    const { message, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error("Gemini API Key missing");
      return res.status(500).json({ ok: false, reply: "I'm not fully configured yet (Missing API Key)." });
    }

    console.log("API Key present:", apiKey.substring(0, 10) + "...");
    console.log("Message:", message);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Convert history to OpenAI format
    let modelToUse = null;

    try {
      const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const listData = await listResponse.json();

      if (listData.models && listData.models.length > 0) {
        console.log("Available models:", listData.models.map(m => m.name));

        // Filter models that support generateContent
        const compatibleModels = listData.models.filter(m =>
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes('generateContent')
        );

        // Prioritize flash models (better free tier quotas) over pro models
        const preferredModelPatterns = [
          /gemini-2\.0-flash(?!-thinking)/,  // gemini-2.0-flash (but not thinking models)
          /gemini-2\.5-flash/,                // gemini-2.5-flash
          /gemini-flash/,                     // generic flash
          /gemini.*flash/,                    // any flash model
          /gemini/                            // any gemini model
        ];

        let selectedModel = null;
        for (const pattern of preferredModelPatterns) {
          selectedModel = compatibleModels.find(m => pattern.test(m.name));
          if (selectedModel) break;
        }

        if (selectedModel) {
          modelToUse = selectedModel.name.replace('models/', '');
          console.log(`Using discovered model: ${modelToUse}`);
        }
      }
    } catch (listError) {
      console.error("Failed to list models:", listError.message);
    }

    // Fallback to common model names if discovery failed
    if (!modelToUse) {
      console.log("Model discovery failed, trying fallback models");
      const fallbackModels = ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash"];
      modelToUse = fallbackModels[0];
    }

    // Try to generate content with the selected model
    const model = genAI.getGenerativeModel({ model: modelToUse });

    // Build conversation history for context
    let prompt = message;

    if (history && Array.isArray(history) && history.length > 0) {
      // Include recent conversation history for context
      const contextMessages = history.slice(-6).map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const text = msg.parts?.[0]?.text || '';
        return `${role}: ${text}`;
      }).join('\n');

      prompt = `Previous conversation:\n${contextMessages}\n\nUser: ${message}`;
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";

    console.log("OpenAI response received");
    return res.json({ ok: true, reply: reply });

  } catch (error) {
    console.error("Chat Error:", error);
    const errorMessage = error.message || "Unknown error";
    res.status(500).json({ ok: false, reply: "I'm having trouble connecting to my brain right now. 🧠💥 Error: " + errorMessage });
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
