const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'director', 'teacher', 'student'),
      allowNull: false
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  User.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };

  // Добавляем валидацию для предотвращения назначения класса не-ученикам
  User.addHook('beforeSave', async (user) => {
    if (user.classId && user.role !== 'student') {
      throw new Error('Только ученики могут быть назначены в класс');
    }
  });

  User.associate = function(models) {
    User.belongsTo(models.Class, { as: 'class', foreignKey: 'classId' });
    User.hasMany(models.Grade, { as: 'studentGrades', foreignKey: 'studentId' });
    User.hasMany(models.Grade, { as: 'teacherGrades', foreignKey: 'teacherId' });
    User.hasMany(models.FinalGrade, { as: 'studentFinalGrades', foreignKey: 'studentId' });
    User.hasMany(models.FinalGrade, { as: 'teacherFinalGrades', foreignKey: 'teacherId' });
    User.hasMany(models.Homework, { as: 'homeworks', foreignKey: 'teacherId' });
    User.hasMany(models.Schedule, { as: 'lessons', foreignKey: 'teacherId' });
    User.hasMany(models.Message, { as: 'sentMessages', foreignKey: 'fromUserId' });
    User.hasMany(models.Message, { as: 'receivedMessages', foreignKey: 'toUserId' });
  };

  return User;
}; 