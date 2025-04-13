const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index.js');
const router = express.Router();

// Маршрут для входа в систему
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Находим пользователя
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }

    // Проверяем пароль
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        ...(user.classId && { classId: user.classId })
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Отправляем ответ
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        classId: user.classId,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Ошибка при входе в систему:', error);
    res.status(500).json({ message: 'Ошибка сервера при входе в систему' });
  }
});

// Маршрут для проверки токена
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        classId: user.classId,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Недействительный токен' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Срок действия токена истек' });
    }
    res.status(500).json({ message: 'Ошибка сервера при проверке токена' });
  }
});

module.exports = router; 