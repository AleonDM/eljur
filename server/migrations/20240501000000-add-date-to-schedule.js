'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Проверка существования таблицы и колонки
      const tableNames = await queryInterface.showAllTables();
      
      if (tableNames.includes('Schedules')) {
        const scheduleTable = await queryInterface.describeTable('Schedules');
        
        if (!scheduleTable.date) {
          await queryInterface.addColumn('Schedules', 'date', {
            type: Sequelize.DATEONLY,
            allowNull: true
          });
          console.log('Колонка date добавлена в таблицу Schedules');
        } else {
          console.log('Колонка date уже существует в таблице Schedules, пропускаем');
        }
      } else if (tableNames.includes('schedules')) {
        const scheduleTable = await queryInterface.describeTable('schedules');
        
        if (!scheduleTable.date) {
          await queryInterface.addColumn('schedules', 'date', {
            type: Sequelize.DATEONLY,
            allowNull: true
          });
          console.log('Колонка date добавлена в таблицу schedules');
        } else {
          console.log('Колонка date уже существует в таблице schedules, пропускаем');
        }
      } else {
        console.log('Таблица расписания не найдена, пропускаем миграцию');
      }
    } catch (error) {
      console.error('Ошибка при добавлении колонки date:', error.message);
      // Не выбрасываем ошибку, чтобы миграция не прерывалась
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Проверяем наличие таблицы перед удалением колонки
      const tableNames = await queryInterface.showAllTables();
      
      if (tableNames.includes('Schedules')) {
        const scheduleTable = await queryInterface.describeTable('Schedules');
        
        if (scheduleTable.date) {
          await queryInterface.removeColumn('Schedules', 'date');
          console.log('Колонка date удалена из таблицы Schedules');
        } else {
          console.log('Колонка date не существует в таблице Schedules, пропускаем');
        }
      } else if (tableNames.includes('schedules')) {
        const scheduleTable = await queryInterface.describeTable('schedules');
        
        if (scheduleTable.date) {
          await queryInterface.removeColumn('schedules', 'date');
          console.log('Колонка date удалена из таблицы schedules');
        } else {
          console.log('Колонка date не существует в таблице schedules, пропускаем');
        }
      } else {
        console.log('Таблица расписания не найдена, пропускаем миграцию');
      }
    } catch (error) {
      console.error('Ошибка при удалении колонки date:', error.message);
      // Не выбрасываем ошибку, чтобы миграция не прерывалась
    }
  }
}; 