const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');

const app = express();
const server = http.createServer(app);

/* ================= SAFE CORS SETUP ================= */

const allowedOrigins = [
  "https://frontend-crmnew.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

const corsOptions = {
  origin: function (origin, callback) {

    // allow requests without origin
    if (!origin) return callback(null, true);

    // allow main frontend
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // allow ALL Vercel preview deployments
    if (origin.includes("vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked: " + origin));
  },
  credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());

/* ================= SOCKET.IO ================= */

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

/* ================= DB ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo Error", err));

/* ================= ROUTES ================= */

app.use('/auth', authRoutes);
app.use('/customers', customerRoutes);

/* ================= DEBUG ROUTE ================= */

app.get('/debug-cors', (req, res) => {
  res.json({
    message: "CORS working correctly",
    origin: req.headers.origin || null,
    allowedOrigins,
    frontendEnv: process.env.FRONTEND_URL || null,
    backendEnv: process.env.BACKEND_URL || null
  });
});

/* ================= CHAT ================= */

const ChatSchema = new mongoose.Schema({
  companyGroup: String,
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

app.get('/api/chat/:companyGroup', async (req, res) => {
  const messages = await Chat.find({
    companyGroup: req.params.companyGroup
  }).sort({ timestamp: 1 });

  res.json(messages);
});

/* ================= PAYFAST ================= */

app.post('/api/create-payfast-checkout', (req, res) => {
  try {
    const userId = req.body.userId;

    const baseUrl = process.env.FRONTEND_URL;

    const data = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url: `${baseUrl}/dashboard?payment=cancel`,
      notify_url: `${process.env.BACKEND_URL}/api/payfast-notify`,
      amount: "500.00",
      item_name: "NovaCRM Premium",
      m_payment_id: userId
    };

    let string = Object.keys(data)
      .map(k => `${k}=${encodeURIComponent(data[k])}`)
      .join("&");

    const passphrase = process.env.PAYFAST_PASSPHRASE;

    if (passphrase) {
      string += `&passphrase=${passphrase}`;
    }

    const signature = crypto
      .createHash("md5")
      .update(string)
      .digest("hex");

    const url = `https://www.payfast.co.za/eng/process?${string}&signature=${signature}`;

    res.json({ url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PayFast error" });
  }
});

app.post('/api/payfast-notify', (req, res) => {
  res.status(200).send("OK");
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});