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
    console.log('Соединение с базой данных установлено.');
    
    // Используем alter: true для обновления существующих таблиц
    console.log('Синхронизация моделей с базой данных...');
    await sequelize.sync({ alter: true });
    console.log('Модели успешно синхронизированы с базой данных.');
    
    return db;
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:');
    console.error(error.name + ': ' + error.message);
    
    if (error.parent) {
      console.error('Детали ошибки:', error.parent.message);
    }
    
    if (error.sql) {
      console.error('SQL запрос, вызвавший ошибку:', error.sql);
    }
    
    throw error;
  }
};

module.exports = {
  ...db,
  sequelize,
  Sequelize,
  initDatabase
}; 