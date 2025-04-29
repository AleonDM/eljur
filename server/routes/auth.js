const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index.js');
const { auth } = require('../middleware/auth.js');

const router = express.Router();

// Маршрут для входа в систему
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Проверяем, существует ли пользователь
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }

    // Проверяем пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }

    // Создаем токен
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Формируем данные пользователя без пароля
    const userData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      classId: user.classId,
      avatarUrl: user.avatarUrl
    };

    res.json({
      user: userData,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для получения данных текущего пользователя
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для проверки валидности токена
router.get('/validate', auth, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.userId,
      username: req.user.username,
      role: req.user.role
    }
  });
});

module.exports = router; 