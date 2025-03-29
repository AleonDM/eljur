const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Grade = sequelize.define('Grade', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isValidGrade(value) {
          if (typeof value === 'number') {
            if (value < 1 || value > 5) {
              throw new Error('Оценка должна быть от 1 до 5');
            }
          } else if (typeof value === 'string') {
            if (!['Н', 'У', 'О'].includes(value)) {
              throw new Error('Недопустимое значение оценки');
            }
          } else {
            throw new Error('Недопустимый тип оценки');
          }
        }
      }
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: true
    },
    trimesterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID триместра, к которому относится оценка'
    }
  });

  Grade.associate = function(models) {
    Grade.belongsTo(models.User, { as: 'student', foreignKey: 'studentId' });
    Grade.belongsTo(models.User, { as: 'teacher', foreignKey: 'teacherId' });
    Grade.belongsTo(models.Trimester, { as: 'trimester', foreignKey: 'trimesterId' });
  };

  return Grade;
}; 