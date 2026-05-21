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

/* ================= SECURITY CORS ================= */

const allowedOrigins = [
  process.env.FRONTEND_URL,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS blocked"));
  },
  credentials: true
}));

app.use(express.json());

/* ================= SOCKET ================= */

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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

/* ================= PAYFAST (PROD SAFE) ================= */

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
    res.status(500).json({ error: "PayFast error" });
  }
});

app.post('/api/payfast-notify', (req, res) => {
  res.status(200).send("OK");
});

/* ================= START ================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});