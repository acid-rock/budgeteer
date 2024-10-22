const { Sequelize } = require("sequelize")

module.exports = new Sequelize("database", "username", "password", {
  dialect: "sqlite",
  storage: "database.sqlite",
  host: "localhost",
  logging: false
})