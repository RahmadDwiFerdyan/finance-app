// src/controllers/transactionController.js
const db = require('../db');

// Helper: parsing body request
function parseTransactionBody(body) {
  const { tx_date, type, category, amount, note } = body;

  if (!tx_date || !type || !category || amount == null) {
    throw new Error('tx_date, type, category, and amount are required');
  }

  if (!['income', 'expense'].includes(type)) {
    throw new Error("type must be 'income' or 'expense'");
  }

  return {
    tx_date,
    type,
    category,
    amount,
    note: note || null,
  };
}

// POST /transactions
exports.createTransaction = async (req, res, next) => {
  try {
    const tx = parseTransactionBody(req.body);

    const query = `
      INSERT INTO transactions (tx_date, type, category, amount, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [tx.tx_date, tx.type, tx.category, tx.amount, tx.note];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error createTransaction:', err);
    res.status(400).json({ error: err.message });
  }
};

// GET /transactions
// optional query: ?month=2025-12
exports.getTransactions = async (req, res, next) => {
  try {
    const { month } = req.query;

    let query = 'SELECT * FROM transactions';
    const values = [];

    if (month) {
      query += ' WHERE date_trunc(\'month\', tx_date) = date_trunc(\'month\', $1::date)';
      values.push(month + '-01'); // ex: '2025-12-01'
    }

    query += ' ORDER BY tx_date DESC, id DESC';

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getTransactions:', err);
    next(err);
  }
};

// PUT /transactions/:id
exports.updateTransaction = async (req, res, next) => {
  try {
    const id = req.params.id;
    const tx = parseTransactionBody(req.body);

    const query = `
      UPDATE transactions
      SET tx_date = $1,
          type = $2,
          category = $3,
          amount = $4,
          note = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `;
    const values = [tx.tx_date, tx.type, tx.category, tx.amount, tx.note, id];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updateTransaction:', err);
    res.status(400).json({ error: err.message });
  }
};

// DELETE /transactions/:id
exports.deleteTransaction = async (req, res, next) => {
  try {
    const id = req.params.id;

    const query = 'DELETE FROM transactions WHERE id = $1 RETURNING *;';
    const values = [id];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted', transaction: result.rows[0] });
  } catch (err) {
    console.error('Error deleteTransaction:', err);
    next(err);
  }
};
