const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    fromUserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    toUserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    hasAttachment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    attachmentType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  Message.associate = function(models) {
    Message.belongsTo(models.User, { as: 'fromUser', foreignKey: 'fromUserId' });
    Message.belongsTo(models.User, { as: 'toUser', foreignKey: 'toUserId' });
  };

  return Message;
}; 