const express = require('express');
const { auth } = require('../middleware/auth.js');
const { Message, User } = require('../models/index.js');
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

// Получить список сообщений с пользователем
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            fromUserId: req.user.userId,
            toUserId: req.params.userId
          },
          {
            fromUserId: req.params.userId,
            toUserId: req.user.userId
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'role', 'avatarUrl']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'role', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json(messages);
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить список диалогов
router.get('/conversations', auth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { fromUserId: req.user.userId },
          { toUserId: req.user.userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'role', 'avatarUrl']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'role', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Группируем сообщения по собеседникам
    const conversations = messages.reduce((acc, message) => {
      const otherUser = message.fromUserId === req.user.userId ? message.toUser : message.fromUser;
      if (!acc[otherUser.id]) {
        acc[otherUser.id] = {
          user: otherUser,
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            hasAttachment: message.hasAttachment,
            attachmentType: message.attachmentType,
            attachmentName: message.attachmentName
          },
          unreadCount: message.toUserId === req.user.userId && !message.isRead ? 1 : 0
        };
      } else if (!message.isRead && message.toUserId === req.user.userId) {
        acc[otherUser.id].unreadCount++;
      }
      return acc;
    }, {});

    res.json(Object.values(conversations));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Отправка сообщения
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { content, toUserId } = req.body;
    
    if (!toUserId) {
      return res.status(400).json({ message: 'Не указан получатель' });
    }

    const recipient = await User.findByPk(toUserId);
    if (!recipient) {
      return res.status(404).json({ message: 'Получатель не найден' });
    }

    // Проверяем роли (студент может писать только учителю и наоборот)
    const sender = await User.findByPk(req.user.userId);
    if (!sender) {
      return res.status(404).json({ message: 'Отправитель не найден' });
    }

    if ((sender.role === 'student' && recipient.role === 'student') ||
        (sender.role === 'teacher' && recipient.role === 'teacher')) {
      return res.status(403).json({ message: 'Недопустимый получатель' });
    }

    const messageData = {
      content,
      fromUserId: req.user.userId,
      toUserId: parseInt(toUserId),
      hasAttachment: !!req.file,
      attachmentType: req.file?.mimetype,
      attachmentUrl: req.file ? `/uploads/${req.file.filename}` : null,
      attachmentName: req.file?.originalname
    };

    const message = await Message.create(messageData);
    
    // Получаем сообщение с информацией об отправителе
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'role', 'avatarUrl']
        }
      ]
    });

    // Отправляем уведомление получателю через Socket.IO
    if (global.sendSocketMessage) {
      global.sendSocketMessage(parseInt(toUserId), {
        type: 'NEW_MESSAGE',
        message: messageWithSender
      });
    }

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: 'Ошибка при создании сообщения' });
  }
});

// Отметить сообщения как прочитанные
router.put('/read/:fromUserId', auth, async (req, res) => {
  try {
    await Message.update(
      { isRead: true },
      {
        where: {
          fromUserId: req.params.fromUserId,
          toUserId: req.user.userId,
          isRead: false
        }
      }
    );
    
    // Уведомляем отправителя о прочтении сообщений через Socket.IO
    if (global.sendSocketMessage) {
      global.sendSocketMessage(parseInt(req.params.fromUserId), {
        type: 'MESSAGES_READ',
        fromUserId: req.user.userId
      });
    }
    
    res.status(200).json({ message: 'Сообщения отмечены как прочитанные' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Удаление сообщения
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId, {
      include: [
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'role', 'avatarUrl']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'role', 'avatarUrl']
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }

    // Проверяем, что пользователь является отправителем сообщения
    if (message.fromUserId !== req.user.userId) {
      return res.status(403).json({ message: 'Нет прав на удаление этого сообщения' });
    }

    // Сохраняем ID получателя перед удалением
    const recipientId = message.toUserId;

    // Удаляем файл вложения, если он есть
    if (message.hasAttachment && message.attachmentUrl) {
      const filePath = path.join(__dirname, '..', message.attachmentUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await message.destroy();

    // Отправляем уведомление получателю через Socket.IO
    if (global.sendSocketMessage) {
      global.sendSocketMessage(recipientId, {
        type: 'MESSAGE_DELETED',
        messageId: parseInt(req.params.messageId)
      });
    }

    res.status(200).json({ message: 'Сообщение удалено' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Ошибка при удалении сообщения' });
  }
});

module.exports = router; 