const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinalGrade = sequelize.define('FinalGrade', {
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
    gradeType: {
      type: DataTypes.ENUM('TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3', 'YEAR', 'ATTESTATION'),
      allowNull: false
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2,
        max: 5
      }
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  FinalGrade.associate = function(models) {
    FinalGrade.belongsTo(models.User, { as: 'student', foreignKey: 'studentId' });
    FinalGrade.belongsTo(models.User, { as: 'teacher', foreignKey: 'teacherId' });
  };

  return FinalGrade;
}; 