const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subject = sequelize.define('Subject', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    grades: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1,2,3,4,5,6,7,8,9,10,11',
      get() {
        const value = this.getDataValue('grades');
        return value ? value.split(',').map(Number) : [];
      },
      set(value) {
        this.setDataValue('grades', Array.isArray(value) ? value.join(',') : value);
      }
    }
  });

  return Subject;
}; 