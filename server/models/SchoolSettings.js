const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SchoolSettings = sequelize.define('SchoolSettings', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lessonDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 40,
      comment: 'Длительность урока в минутах'
    },
    breakDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Длительность перемены в минутах'
    },
    longBreakDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      comment: 'Длительность большой перемены в минутах'
    },
    longBreakAfterLesson: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'После какого урока большая перемена'
    },
    firstLessonStart: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '08:00',
      validate: {
        is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      comment: 'Время начала первого урока'
    },
    secondShiftStart: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '14:00',
      validate: {
        is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      comment: 'Время начала второй смены'
    }
  });

  return SchoolSettings;
}; 