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

// ================= ENV =================
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// ================= CORS FIX =================
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

// ================= SOCKET =================
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"]
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

// ================= PAYFAST =================
app.post('/api/create-payfast-checkout', (req, res) => {
  const buyerEmail = req.body.email || 'info@28daydiet.co.za';
  const buyerId = req.body.userId || 'USER-' + Date.now();

  const payfastData = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: `${FRONTEND_URL}/dashboard?payment=success`,
    cancel_url: `${FRONTEND_URL}/dashboard?payment=cancel`,
    notify_url: `${BACKEND_URL}/api/payfast-notify`,
    name_first: 'CRM',
    name_last: 'Subscriber',
    email_address: buyerEmail.toString().trim(),
    m_payment_id: buyerId.toString().trim(),
    amount: '50.00',
    item_name: 'NovaCRM Monthly Premium Subscription Plan',
    subscription_type: '1',
    billing_cycle: '3',
    frequency: '3',
    cycles: '0'
  };

  let pfParamString = '';
  Object.keys(payfastData).forEach((key) => {
    if (payfastData[key]) {
      pfParamString += `${key}=${encodeURIComponent(payfastData[key])
        .replace(/%20/g, '+')}&`;
    }
  });

  pfParamString = pfParamString.slice(0, -1);

  const passphrase = process.env.PAYFAST_PASSPHRASE;

  if (passphrase) {
    pfParamString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`;
  }

  const signature = crypto.createHash('md5').update(pfParamString).digest('hex');

  const finalCheckoutUrl = `https://payfast.io?${pfParamString}&signature=${signature}`;

  res.json({ url: finalCheckoutUrl });
});

// ================= PAYFAST WEBHOOK =================
app.post('/api/payfast-notify', async (req, res) => {
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