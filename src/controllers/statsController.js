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

// GET /stats/summary?month=YYYY-MM
exports.getSummary = async (req, res, next) => {
  try {
    const month = getMonthOrDefault(req.query.month);
    const monthDate = month + '-01';

    // 1. total income & expense
    const summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS total_expense
      FROM transactions
      WHERE date_trunc('month', tx_date) = date_trunc('month', $1::date);
    `;
    const summaryResult = await db.query(summaryQuery, [monthDate]);
    const summaryRow = summaryResult.rows[0];

    const totalIncome = parseFloat(summaryRow.total_income);
    const totalExpense = parseFloat(summaryRow.total_expense);
    const balance = totalIncome - totalExpense;

    // 2. daily expense untuk avg_daily_expense
    const dailyExpenseQuery = `
      SELECT tx_date, 
             COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS daily_expense
      FROM transactions
      WHERE date_trunc('month', tx_date) = date_trunc('month', $1::date)
      GROUP BY tx_date
      ORDER BY tx_date;
    `;
    const dailyExpenseResult = await db.query(dailyExpenseQuery, [monthDate]);

    let daysWithExpense = dailyExpenseResult.rows.length || 1;
    let sumDailyExpense = 0;

    dailyExpenseResult.rows.forEach((row) => {
      sumDailyExpense += parseFloat(row.daily_expense);
    });

    const avgDailyExpense = sumDailyExpense / daysWithExpense;

    // 3. daily trend income & expense
    const dailyTrendQuery = `
      SELECT tx_date,
             COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
             COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
      FROM transactions
      WHERE date_trunc('month', tx_date) = date_trunc('month', $1::date)
      GROUP BY tx_date
      ORDER BY tx_date;
    `;
    const dailyTrendResult = await db.query(dailyTrendQuery, [monthDate]);

    // Hitung saldo kumulatif per hari
    let runningBalance = 0;
    const dailyTrend = dailyTrendResult.rows.map((row) => {
      const income = parseFloat(row.income);
      const expense = parseFloat(row.expense);
      runningBalance += income - expense;

      return {
        date: row.tx_date,
        income,
        expense,
        balance: runningBalance,
      };
    });

    res.json({
      month,
      total_income: totalIncome,
      total_expense: totalExpense,
      balance,
      avg_daily_expense: avgDailyExpense,
      daily_trend: dailyTrend,
    });
  } catch (err) {
    console.error('Error getSummary:', err);
    next(err);
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
