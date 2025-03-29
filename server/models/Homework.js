const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Homework = sequelize.define('Homework', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  Homework.associate = function(models) {
    Homework.belongsTo(models.Class, { foreignKey: 'classId' });
    Homework.belongsTo(models.User, { as: 'teacher', foreignKey: 'teacherId' });
  };

  return Homework;
}; 