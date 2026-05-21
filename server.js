const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');

const app = express();
const server = http.createServer(app);

// ================= ENV =================
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// ================= CORS (STABLE FIX) =================
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json());

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ================= DB =================
const ChatSchema = new mongoose.Schema({
  companyGroup: String,
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/novacrm')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB connection error:', err));

// ================= ROUTES =================
app.use('/auth', authRoutes);
app.use('/customers', customerRoutes);

// ================= CHAT =================
app.get('/api/chat/:companyGroup', async (req, res) => {
  try {
    const messages = await Chat.find({ companyGroup: req.params.companyGroup })
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ================= FREE ACCESS (PAYMENT REMOVED) =================
app.post('/api/create-payfast-checkout', (req, res) => {
  res.json({
    success: true,
    freeAccess: true,
    message: "Payment disabled - full access granted"
  });
});

app.post('/api/payfast-notify', (req, res) => {
  res.status(200).send('OK');
});

// ================= SOCKET EVENTS =================
io.on('connection', (socket) => {
  socket.on('join_company_room', (companyGroup) => {
    socket.join(companyGroup);
  });

  socket.on('send_group_message', async (data) => {
    try {
      await Chat.create(data);
      io.to(data.companyGroup).emit('receive_group_message', data);
    } catch (err) {
      console.error(err);
    }
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});