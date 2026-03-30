import 'dotenv/config';
import express from "express";
import path from "path";
import cors from "cors";
import layouts from "express-ejs-layouts";
import cookieParser from 'cookie-parser';
import { fileURLToPath } from "url";
import { Staark, StaarkError } from '@staark-inc/node';
import router from "./routes/dashboard.js";
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3005;

if (!process.env.STAARK_API_KEY) {
  console.error('[FATAL] STAARK_API_KEY is not set in environment');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const api = new Staark({
  apiKey: process.env.STAARK_API_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  const token = req.cookies?.accessToken;
  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      const decoded = secret ? jwt.verify(token, secret) : jwt.decode(token);
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        displayName: decoded.display_name,
        firstName: decoded.display_name?.split(' ')[0] ?? '',
        lastName: decoded.display_name?.split(' ').slice(1).join(' ') ?? '',
        plan: decoded.plan,
        workspaceId: decoded.workspace_id,
      };
    } catch (_) {
      req.user = null;
    }
  }
  next();
});

// EJS Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(layouts);
app.set("layout", "layout");

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), code: 200 });
});

app.get("/", async (req, res) => {
  try {
    const status = await api.status.get?.();

    res.render("home", {
      title: "Staark Dashboard",
      message: "Dashboard rulează din container Docker",
      status: status?.services ?? [],
      generatedAt: status?.generatedAt,
      ok: status?.ok
    });
  } catch (error) {
    const message =
      error instanceof StaarkError ? error.message : "Unknown error";

    res.status(500).send(message);
  }
});

app.get('/list', async (req, res) => {
  try {
    const projects = await api.projects.list?.();

    res.json({ data: projects });

  } catch (error) {
    if (error instanceof StaarkError) {
      return res.status(error.status || 500).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: "Unexpected error"
    });
  }
});

app.get('/features', (req, res) => {
  res.render('features');
});

app.get('/pricing', (req, res) => {
  res.render('pricing');
});

// ── AUTH ROUTES ────────────────────────────────────────────
app.use("/dashboard", router);

app.get('/login', (req, res) => {
  res.render('login', { layout: false });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', {
      layout: false,
      error: 'Email și parola sunt obligatorii.'
    });
  }

  try {
    const resp = await fetch('https://api.staark-app.cloud/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STAARK_API_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw { message: err.error?.message ?? 'Email sau parolă incorectă.' };
    }
    const result = await resp.json();

    // Salvează tokens în cookie-uri httpOnly
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000 // 15 minute
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 zile
    });

    res.cookie('userId', result.user.id, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect('/dashboard');

  } catch (error) {
    const message = error instanceof StaarkError ? error.message : (error?.message ?? 'Email sau parolă incorectă.');
    res.render('login', { layout: false, error: message });
  }
});

app.get('/register', (req, res) => {
  res.render('register', { layout: false });
});

app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('register', {
      layout: false,
      error: 'Parolele nu coincid.',
      fields: { firstName, lastName, email }
    });
  }

  try {
    const resp = await fetch('https://api.staark-app.cloud/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STAARK_API_KEY}`,
      },
      body: JSON.stringify({ firstName, lastName, email, password, confirmPassword }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw { message: err.error?.message ?? 'Eroare la înregistrare.' };
    }

    res.render('login', {
      layout: false,
      success: 'Cont creat! Verifică emailul, apoi autentifică-te.'
    });

  } catch (error) {
    const message = error?.message ?? 'Eroare la înregistrare.';
    res.render('register', {
      layout: false,
      error: message,
      fields: { firstName, lastName, email }
    });
  }
});

app.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  try {
    if (refreshToken) await fetch('https://api.staark-app.cloud/v1/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STAARK_API_KEY}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (_) {
    // ignorăm eroarea — oricum ștergem cookie-urile
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Dashboard running on port ${PORT}`);
  console.log(`Dashboard running ! Access it at http://localhost:${PORT}`);
});