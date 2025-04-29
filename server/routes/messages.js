const express = require('express');
const { auth } = require('../middleware/auth.js');
const { Message, User, Sequelize } = require('../models/index.js');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB лимит
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  }
});

// Получить сообщения между текущим пользователем и другим пользователем
router.get('/:userId', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.userId;
    
    // Проверяем, что userId не равен текущему пользователю
    if (parseInt(otherUserId) === currentUserId) {
      return res.status(400).json({ message: 'Нельзя отправить сообщение самому себе' });
    }
    
    // Получаем сообщения между пользователями
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { 
            [Op.and]: [
              { fromUserId: currentUserId },
              { toUserId: otherUserId }
            ]
          },
          { 
            [Op.and]: [
              { fromUserId: otherUserId },
              { toUserId: currentUserId }
            ]
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'avatarUrl', 'role']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'avatarUrl', 'role']
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    // Отмечаем все сообщения от другого пользователя как прочитанные
    await Message.update(
      { read: true },
      {
        where: {
          fromUserId: otherUserId,
          toUserId: currentUserId,
          read: false
        }
      }
    );
    
    // Форматируем ответ
    const formattedMessages = messages.map(message => {
      const msg = message.toJSON();
      // Упрощаем формат для фронтенда
      return {
        id: msg.id,
        text: msg.text,
        createdAt: msg.createdAt,
        fromUserId: msg.fromUserId,
        toUserId: msg.toUserId,
        read: msg.read,
        fromUser: msg.fromUser,
        toUser: msg.toUser,
        fileUrl: msg.fileUrl,
        fileName: msg.fileName
      };
    });
    
    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении сообщений' });
  }
});

// Получить список диалогов
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Получаем последние сообщения для каждого контакта
    const conversations = await Message.findAll({
      attributes: [
        [Sequelize.fn('MAX', Sequelize.col('Message.id')), 'maxId'],
        [Sequelize.literal('CASE WHEN "fromUserId" = :userId THEN "toUserId" ELSE "fromUserId" END'), 'contactId']
      ],
      where: {
        [Op.or]: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      group: [Sequelize.literal('CASE WHEN "fromUserId" = :userId THEN "toUserId" ELSE "fromUserId" END')],
      replacements: { userId },
      raw: true
    });
    
    // Получаем полные данные о сообщениях
    const conversationPromises = conversations.map(async (conv) => {
      const message = await Message.findByPk(conv.maxId, {
        include: [
          {
            model: User,
            as: 'fromUser',
            attributes: ['id', 'name', 'avatarUrl', 'role']
          },
          {
            model: User,
            as: 'toUser',
            attributes: ['id', 'name', 'avatarUrl', 'role']
          }
        ]
      });
      
      // Определяем контакт (другого пользователя)
      const contact = message.fromUserId === userId ? message.toUser : message.fromUser;
      
      // Считаем непрочитанные сообщения
      const unreadCount = await Message.count({
        where: {
          fromUserId: contact.id,
          toUserId: userId,
          read: false
        }
      });
      
      return {
        id: message.id,
        contact,
        lastMessage: {
          id: message.id,
          text: message.text,
          createdAt: message.createdAt,
          fromUserId: message.fromUserId,
          read: message.read,
          fileUrl: message.fileUrl
        },
        unreadCount
      };
    });
    
    const result = await Promise.all(conversationPromises);
    
    // Сортируем по времени последнего сообщения (самые новые вверху)
    result.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении списка диалогов' });
  }
});

// Отправить сообщение
router.post('/', auth, async (req, res) => {
  try {
    const fromUserId = req.user.userId;
    const { toUserId, text, fileUrl, fileName } = req.body;
    
    // Проверяем, что toUserId не равен текущему пользователю
    if (parseInt(toUserId) === fromUserId) {
      return res.status(400).json({ message: 'Нельзя отправить сообщение самому себе' });
    }
    
    // Проверяем существование получателя
    const toUser = await User.findByPk(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: 'Получатель не найден' });
    }
    
    // Создаем сообщение
    const message = await Message.create({
      fromUserId,
      toUserId,
      text,
      read: false,
      fileUrl,
      fileName
    });
    
    // Получаем полное сообщение с данными пользователей
    const fullMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'avatarUrl', 'role']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'avatarUrl', 'role']
        }
      ]
    });
    
    // Отправляем сообщение через Socket.IO если получатель онлайн
    const wasDelivered = global.sendSocketMessage(toUserId, {
      type: 'new_message',
      message: fullMessage
    });
    
    res.status(201).json({
      ...fullMessage.toJSON(),
      delivered: wasDelivered
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при отправке сообщения' });
  }
});

// Отметить сообщения как прочитанные
router.put('/read/:fromUserId', auth, async (req, res) => {
  try {
    const toUserId = req.user.userId;
    const fromUserId = req.params.fromUserId;
    
    // Обновляем статус сообщений
    const result = await Message.update(
      { read: true },
      {
        where: {
          fromUserId,
          toUserId,
          read: false
        }
      }
    );
    
    res.json({ 
      success: true, 
      count: result[0] 
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении статуса сообщений' });
  }
});

// Удалить сообщение
router.delete('/:id', auth, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.userId;
    
    // Проверяем существование сообщения
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }
    
    // Проверяем, что пользователь является отправителем сообщения
    if (message.fromUserId !== userId) {
      return res.status(403).json({ message: 'Недостаточно прав для удаления этого сообщения' });
    }
    
    // Удаляем сообщение
    await message.destroy();
    
    // Уведомляем получателя об удалении сообщения через Socket.IO
    global.sendSocketMessage(message.toUserId, {
      type: 'message_deleted',
      messageId
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении сообщения' });
  }
});

module.exports = router; 