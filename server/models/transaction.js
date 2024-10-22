const { Sequelize, DataTypes } = require("sequelize")
const sequelize = require("../database/config")

const Transaction = sequelize.define(
  "Transaction",
  {
    // Define model fields here,
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING
    }
  }
)

module.exports = Transaction