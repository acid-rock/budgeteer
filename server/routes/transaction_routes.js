const express = require("express");
const router = express.Router();
const Transaction = require("../models/transaction");
const { Op } = require("sequelize");

// Create "transaction"
router.post("/create", async (req, res) => {
  const { type, amount, category, date, description } = req.body;

  try {
    const newTransaction = await Transaction.create({
      type: type,
      amount: amount,
      category: category,
      date: date,
      description: description,
    });

    if (newTransaction) {
      return res.sendStatus(201);
    } else {
      return res.sendStatus(500);
    }
  } catch (error) {
    console.error("Error creating transaction.", error);
    return res.sendStatus(500);
  }
});

// Show "transactions"
router.get("/getAll", async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      order: [["date", "DESC"]],
    });
    return res.json(transactions);
  } catch (error) {
    console.error("Error fetching data.", error);
    return res.sendStatus(500);
  }
});

// Show income only transactions
router.get("/getIncome", async (req, res) => {
  try {
    const incomeTransactions = await Transaction.findAll({
      where: {
        type: "income",
      },
      order: [["date", "DESC"]],
    });
    return res.json(incomeTransactions);
  } catch (error) {
    console.error("Error fetching data.", error);
    return res.sendStatus(500);
  }
});

// Show expense only transactions
router.get("/getExpense", async (req, res) => {
  try {
    const expenseTransactions = await Transaction.findAll({
      where: {
        type: "expense",
      },
      order: [["date", "DESC"]],
    });
    return res.json(expenseTransactions);
  } catch (error) {
    console.error("Error fetching data.", error);
    return res.sendStatus(500);
  }
});

// Delete transactions
router.delete("/delete/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await Transaction.destroy({ where: { id: id } });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting entry.", error);
    return res.sendStatus(500);
  }
});

// Get specific transaction via ID
router.get("/get/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const transaction = await Transaction.findByPk(id);

    if (!transaction) {
      return res.sendStatus(404);
    }

    return res.json(transaction);
  } catch (error) {
    console.error(`Error getting entry ${id}.`, error);
    return res.sendStatus(500);
  }
});

// Update a transaction
router.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const { type, amount, category, date, description } = req.body;

  try {
    const transaction = await Transaction.update(
      {
        type: type,
        amount: amount,
        category: category,
        date: date,
        description: description,
      },
      { where: { id: id } }
    );
  } catch (error) {
    console.error(`Error getting entry ${id}.`, error);
    return res.sendStatus(500);
  }
});

// Get current day transaction
router.get("/getCurrentTransactions", async (req, res) => {
  // 28800000 represents GMT+08:00
  const date = new Date(Date.now() + 28800000).toISOString().slice(0, 10);

  try {
    const transactions = await Transaction.findAll({
      where: { date: { [Op.startsWith]: date } },
    });

    return res.json(transactions);
  } catch (error) {
    console.error("Error fetching data.", error);
    return res.sendStatus(500);
  }
});

// Get current week transaction
router.get("/getWeeklyTransactions", async (req, res) => {
  // 28800000 represents GMT+08:00
  const currentDate = new Date(Date.now() + 28800000);

  const getWeekSpan = (date) => {
    const sDate = date.toISOString().slice(0, 10);
    const [year, month, day] = sDate.split("-");

    const currentDay = date.getDay();

    const weekStartingDay = Number(day) - currentDay;
    const weekEndingDay = Number(day) + 6 - currentDay;

    return [
      new Date(year, month - 1, weekStartingDay),
      new Date(year, month - 1, weekEndingDay),
    ];
  };

  const [startDate, endDate] = getWeekSpan(currentDate);
  try {
    const transactions = await Transaction.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["date", "DESC"]],
    });

    return res.json(transactions);
  } catch (error) {
    console.error("Error fetching data.", error);
    return res.sendStatus(500);
  }
});

// Get monthly transactions
router.get("/getMonthlyTransactions", async (req, res) => {
  // 28800000 represents GMT+08:00
  const date = new Date(Date.now() + 28800000).toISOString().slice(0, 7);

  try {
    const transactions = await Transaction.findAll({
      where: { date: { [Op.startsWith]: date } },
      order: [["date", "DESC"]],
    });

    return res.json(transactions);
  } catch (error) {
    console.error("Error fetching data.", error);
    return res.sendStatus(500);
  }
});

// Get yearly transactions
router.get("/getYearlyTransactions", async (req, res) => {
  // 28800000 represents GMT+08:00
  const date = new Date(Date.now() + 28800000).toISOString().slice(0, 4);

  try {
    const transactions = await Transaction.findAll({
      where: { date: { [Op.startsWith]: date } },
      order: [["date", "DESC"]],
    });

    return res.json(transactions);
  } catch (error) {
    console.error("Error fetching data.", error);
    return res.sendStatus(500);
  }
});

module.exports = router;
