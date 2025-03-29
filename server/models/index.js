const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Инициализация Sequelize с SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false
});

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
    
    await sequelize.sync({ alter: false });
    console.log('Модели синхронизированы с базой данных.');
    
    return db;
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    throw error;
  }
};

module.exports = {
  ...db,
  sequelize,
  Sequelize,
  initDatabase
}; 