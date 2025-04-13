'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Проверка существования таблицы и колонки
      // Пробуем с правильным именем таблицы
      const tableNames = await queryInterface.showAllTables();
      
      if (tableNames.includes('Schedules')) {
        const scheduleTable = await queryInterface.describeTable('Schedules');
        
        if (!scheduleTable.classroom) {
          await queryInterface.addColumn('Schedules', 'classroom', {
            type: Sequelize.STRING,
            allowNull: true
          });
          console.log('Колонка classroom добавлена в таблицу Schedules');
        } else {
          console.log('Колонка classroom уже существует в таблице Schedules, пропускаем');
        }
      } else if (tableNames.includes('schedules')) {
        const scheduleTable = await queryInterface.describeTable('schedules');
        
        if (!scheduleTable.classroom) {
          await queryInterface.addColumn('schedules', 'classroom', {
            type: Sequelize.STRING,
            allowNull: true
          });
          console.log('Колонка classroom добавлена в таблицу schedules');
        } else {
          console.log('Колонка classroom уже существует в таблице schedules, пропускаем');
        }
      } else {
        // Если таблица не найдена, просто пропускаем миграцию
        console.log('Таблица расписания не найдена, пропускаем миграцию');
      }
    } catch (error) {
      console.error('Ошибка при выполнении миграции:', error.message);
      // Не выбрасываем ошибку, чтобы миграция не прерывалась
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Проверяем наличие таблицы перед удалением колонки
      const tableNames = await queryInterface.showAllTables();
      
      if (tableNames.includes('Schedules')) {
        const scheduleTable = await queryInterface.describeTable('Schedules');
        
        if (scheduleTable.classroom) {
          await queryInterface.removeColumn('Schedules', 'classroom');
          console.log('Колонка classroom удалена из таблицы Schedules');
        } else {
          console.log('Колонка classroom не существует в таблице Schedules, пропускаем');
        }
      } else if (tableNames.includes('schedules')) {
        const scheduleTable = await queryInterface.describeTable('schedules');
        
        if (scheduleTable.classroom) {
          await queryInterface.removeColumn('schedules', 'classroom');
          console.log('Колонка classroom удалена из таблицы schedules');
        } else {
          console.log('Колонка classroom не существует в таблице schedules, пропускаем');
        }
      } else {
        console.log('Таблица расписания не найдена, пропускаем миграцию');
      }
    } catch (error) {
      console.error('Ошибка при отмене миграции:', error.message);
      // Не выбрасываем ошибку, чтобы миграция не прерывалась
    }
  }
}; 