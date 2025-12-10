// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const transactionsRouter = require('./routes/transactions');
const statsRouter = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: "*", // sementara dibuka full, nanti bisa dipersempit
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Finance Tracker API is running' });
});

app.use('/transactions', transactionsRouter);
app.use('/stats', statsRouter);

// Error handler sederhana
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
