const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trimester = sequelize.define('Trimester', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3'),
      allowNull: false,
      comment: 'Тип триместра'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Дата начала триместра'
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Дата окончания триместра'
    },
    academicYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Учебный год (год начала учебного года)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Активен ли триместр в текущем учебном году'
    }
  });

  return Trimester;
}; 