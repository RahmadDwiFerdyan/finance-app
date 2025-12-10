// src/controllers/statsController.js
const db = require('../db');

// Helper: ambil month parameter
function getMonthOrDefault(monthParam) {
  // kalau tidak ada, pakai bulan sekarang
  if (!monthParam) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  return monthParam;
}

// Helper: ambil bulan
function getMonth(monthParam) {
  if (!monthParam) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  return monthParam;
}

// GET /stats/summary
exports.getSummary = async (req, res) => {
  try {
    const month = getMonth(req.query.month);
    const monthDate = month + "-01";

    // =========================
    // 1) TOTAL INCOME + EXPENSE
    // =========================
    const summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount END), 0) AS total_expense
      FROM transactions
      WHERE date_trunc('month', tx_date) = date_trunc('month', $1::date)
    `;
    const summaryRes = await db.query(summaryQuery, [monthDate]);

    const total_income = Number(summaryRes.rows[0]?.total_income || 0);
    const total_expense = Number(summaryRes.rows[0]?.total_expense || 0);
    const balance = total_income - total_expense;

    // =========================
    // 2) DAILY TREND
    // =========================
    const trendQuery = `
      SELECT tx_date,
        COALESCE(SUM(CASE WHEN type='income' THEN amount END), 0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount END), 0) AS expense
      FROM transactions
      WHERE date_trunc('month', tx_date) = date_trunc('month', $1::date)
      GROUP BY tx_date
      ORDER BY tx_date
    `;
    const trendRes = await db.query(trendQuery, [monthDate]);

    let running = 0;
    const daily_trend = trendRes.rows.map((row) => {
      const income = Number(row.income || 0);
      const expense = Number(row.expense || 0);
      running += income - expense;

      return {
        date: row.tx_date,
        income,
        expense,
        balance: running,
      };
    });

    // =========================
    // 3) AVG DAILY EXPENSE
    // =========================
    const totalDayExpense = trendRes.rows.reduce((acc, row) => acc + Number(row.expense || 0), 0);
    const days = trendRes.rows.length || 1;
    const avg_daily_expense = totalDayExpense / days;

    return res.json({
      month,
      total_income,
      total_expense,
      balance,
      avg_daily_expense,
      daily_trend,
    });

  } catch (err) {
    console.error(err);
    return res.json({
      month: getMonth(),
      total_income: 0,
      total_expense: 0,
      balance: 0,
      avg_daily_expense: 0,
      daily_trend: [],
    });
  }
};


// GET /stats/by-category?month=YYYY-MM
exports.getByCategory = async (req, res, next) => {
  try {
    const month = getMonthOrDefault(req.query.month);
    const monthDate = month + '-01';

    const query = `
      SELECT category,
             COALESCE(SUM(amount), 0) AS total_expense
      FROM transactions
      WHERE type = 'expense'
        AND date_trunc('month', tx_date) = date_trunc('month', $1::date)
      GROUP BY category
      ORDER BY total_expense DESC;
    `;

    const result = await db.query(query, [monthDate]);

    res.json({
      month,
      categories: result.rows.map((row) => ({
        category: row.category,
        total_expense: parseFloat(row.total_expense),
      })),
    });
  } catch (err) {
    console.error('Error getByCategory:', err);
    next(err);
  }
};
