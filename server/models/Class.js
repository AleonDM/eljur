const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Class = sequelize.define('Class', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    grade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 11
      }
    },
    letter: {
      type: DataTypes.STRING(1),
      allowNull: false,
      validate: {
        isUppercase: true,
        len: [1, 1]
      }
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['grade', 'letter']
      }
    ]
  });

  Class.associate = function(models) {
    Class.hasMany(models.User, { as: 'students', foreignKey: 'classId' });
    Class.hasMany(models.Schedule, { foreignKey: 'classId' });
    Class.hasMany(models.Homework, { foreignKey: 'classId' });
  };

  return Class;
}; 