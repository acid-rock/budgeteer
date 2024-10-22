const express = require("express");
const sequelize = require("./database/config");
const transactionRoutes = require("./routes/transaction_routes");
const cors = require("cors");

const app = express();
const PORT = 8126;

// Middleware
app.use(cors()); // Fix CORS to protect routes.
app.use(express.json());

// Routes
app.use("/transactions", transactionRoutes);

const db_start = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to database.");

    await sequelize.sync();
    console.log("Models synced successfully.");
  } catch (error) {
    console.error("Error occurred in database.", error);
  }
};

// Listener
app.listen(PORT, (error) => {
  if (error) {
    console.error("Error starting server.", error);
  }

  db_start();
  console.clear();
  console.log(`Server started at http://localhost:${PORT}/`);
});

/**
 * NOTE TO SELF:
 *
 * "sync({ force: true })" and "sync({ alter: true })" can be destructive for production.
 * Instead, synchronization should be done with the advanced concept of Migrations, with the help of the Sequelize CLI.
 *
 */
