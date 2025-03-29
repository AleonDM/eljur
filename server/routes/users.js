const express = require('express');
const { auth } = require('../middleware/auth.js');
const { User, Class } = require('../models/index.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Op } = require('sequelize');

const router = express.Router();

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    // Используем абсолютный путь вместо относительного
    const uploadDir = path.join(path.resolve(__dirname, '..'), 'uploads', 'avatars');
    console.log('Директория для загрузки аватаров:', uploadDir);
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      console.error('Ошибка при создании директории для загрузки:', err);
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `avatar-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log('Имя файла для загрузки:', filename);
    cb(null, filename);
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Принимаем только изображения
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB макс размер
  fileFilter: fileFilter
});

// Получить список пользователей
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'name', 'role', 'classId', 'avatarUrl']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Поиск пользователей
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Параметр поиска не указан' });
    }
    
    // Поиск по имени пользователя
    const users = await User.findAll({
      where: {
        name: {
          [Op.like]: `%${q}%`
        }
      },
      attributes: ['id', 'name', 'role', 'avatarUrl'],
      limit: 10
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Загрузка аватара пользователя
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    console.log('========== ЗАГРУЗКА АВАТАРА ==========');
    console.log('Пользователь:', req.user.userId);
    
    if (!req.file) {
      console.log('ОШИБКА: Файл не загружен');
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    console.log('Файл загружен:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      console.log('ОШИБКА: Пользователь не найден:', req.user.userId);
      // Удаляем загруженный файл, т.к. пользователь не найден
      await fs.unlink(req.file.path);
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Удаляем предыдущий аватар, если он есть
    if (user.avatarUrl) {
      try {
        const oldAvatarPath = path.join(__dirname, '..', user.avatarUrl.replace(/^\/uploads/, 'uploads'));
        console.log('Удаление старого аватара:', oldAvatarPath);
        
        await fs.access(oldAvatarPath);
        await fs.unlink(oldAvatarPath);
        console.log('Старый аватар успешно удален');
      } catch (err) {
        console.log('Не удалось удалить старый аватар:', err.message);
      }
    }

    // Обновляем путь к аватару в БД
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    console.log('Новый URL аватара:', avatarUrl);
    await user.update({ avatarUrl });

    // Проверяем, создан ли файл и доступен ли он
    const fullPath = path.join(__dirname, '..', 'uploads', 'avatars', req.file.filename);
    try {
      await fs.access(fullPath);
      const stats = await fs.stat(fullPath);
      console.log('Файл аватара проверен:', {
        path: fullPath,
        exists: true,
        size: stats.size,
        isFile: stats.isFile()
      });
    } catch (err) {
      console.error('ОШИБКА при проверке файла аватара:', err);
    }

    console.log('Аватар успешно обновлен');
    console.log('=========================================');
    
    res.json({ 
      avatarUrl,
      success: true 
    });
  } catch (error) {
    console.error('ОШИБКА при загрузке аватара:', error);
    res.status(500).json({ message: error.message });
  }
});

// Маршрут для получения списка учителей
router.get('/teachers', auth, async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: {
        role: 'teacher'
      },
      attributes: ['id', 'name', 'role', 'avatarUrl']
    });
    res.json(teachers);
  } catch (error) {
    console.error('Ошибка при получении списка учителей:', error);
    res.status(500).json({ message: 'Ошибка при получении списка учителей' });
  }
});

// Маршрут для получения списка учеников
router.get('/students', auth, async (req, res) => {
  try {
    const students = await User.findAll({
      where: {
        role: 'student'
      },
      attributes: ['id', 'name', 'role', 'avatarUrl']
    });
    res.json(students);
  } catch (error) {
    console.error('Ошибка при получении списка учеников:', error);
    res.status(500).json({ message: 'Ошибка при получении списка учеников' });
  }
});

// Создать нового пользователя (только для администратора)
router.post('/', auth, async (req, res) => {
  try {
    // Проверяем, что запрос делает администратор
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Недостаточно прав для создания пользователя' });
    }

    const { username, password, name, role } = req.body;

    // Проверяем, существует ли пользователь с таким именем
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
    }

    // Создаем нового пользователя
    const user = await User.create({
      username,
      password, // Хеширование пароля происходит в хуке beforeCreate модели User
      name,
      role
    });

    // Возвращаем данные пользователя без пароля
    res.status(201).json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      classId: user.classId,
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    res.status(500).json({ message: error.message });
  }
});

// Удалить пользователя (только для администратора)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Проверяем, что запрос делает администратор
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Недостаточно прав для удаления пользователя' });
    }

    const userId = req.params.id;
    
    // Проверяем, существует ли пользователь
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Удаляем аватар пользователя, если он есть
    if (user.avatarUrl) {
      try {
        const avatarPath = path.join(__dirname, '..', user.avatarUrl.replace(/^\/uploads/, 'uploads'));
        await fs.access(avatarPath);
        await fs.unlink(avatarPath);
        console.log(`Аватар пользователя ${userId} удален`);
      } catch (err) {
        console.log(`Не удалось удалить аватар пользователя ${userId}:`, err.message);
      }
    }

    // Удаляем пользователя
    await user.destroy();
    res.json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    res.status(500).json({ message: error.message });
  }
});

// Назначить ученика в класс (только для администратора или директора)
router.put('/:id/class', auth, async (req, res) => {
  try {
    // Проверяем, что запрос делает администратор или директор
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Недостаточно прав для назначения класса' });
    }

    const userId = req.params.id;
    const { classId } = req.body;
    
    // Проверяем, существует ли пользователь
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверяем, что пользователь - ученик
    if (user.role !== 'student') {
      return res.status(400).json({ message: 'Только ученики могут быть назначены в класс' });
    }

    // Если classId равен null, то удаляем ученика из класса
    if (classId === null) {
      await user.update({ classId: null });
      return res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        classId: null,
        avatarUrl: user.avatarUrl
      });
    }

    // Проверяем, существует ли класс
    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({ message: 'Класс не найден' });
    }

    // Назначаем ученика в класс
    await user.update({ classId });

    // Возвращаем обновленные данные пользователя
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      classId,
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error('Ошибка при назначении класса:', error);
    res.status(500).json({ message: error.message });
  }
});

// Обработка ошибок multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Размер файла превышает 5MB' });
    }
    return res.status(400).json({ message: 'Ошибка при загрузке файла' });
  }
  if (error.message === 'Разрешены только изображения') {
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

module.exports = router; 