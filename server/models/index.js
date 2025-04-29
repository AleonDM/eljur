const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const config = require('../config/database.js');

// Инициализация Sequelize с SQLite
const env = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(config[env]);

const db = {};

// Импортируем все модели
fs.readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize);
    db[model.name] = model;
  });

// Определяем ассоциации после загрузки всех моделей
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Синхронизация с базой данных
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    
    // Используем alter: true для обновления существующих таблиц
    await sequelize.sync({ alter: true });
    
    return db;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  ...db,
  sequelize,
  Sequelize,
  initDatabase
}; 