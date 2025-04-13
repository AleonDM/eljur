const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Schedule = sequelize.define('Schedule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 6,
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Конкретная дата занятия, если расписание привязано к дате, а не дню недели'
    },
    lessonNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 16,
      },
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    startTime: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
    },
    endTime: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
    },
    isTemplate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    classroom: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Номер кабинета, в котором проходит урок'
    },
  });

  Schedule.associate = function(models) {
    Schedule.belongsTo(models.Class, { foreignKey: 'classId' });
    Schedule.belongsTo(models.User, { as: 'teacher', foreignKey: 'teacherId' });
  };

  return Schedule;
}; 