const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { initDatabase, sequelize } = require('./models');
const { execSync } = require('child_process');

// Импортируем маршруты
const gradesRouter = require('./routes/grades.js');
const homeworkRouter = require('./routes/homework.js');
const scheduleRouter = require('./routes/schedule.js');
const messagesRouter = require('./routes/messages.js');
const finalGradesRouter = require('./routes/finalGrades.js');
const usersRouter = require('./routes/users.js');
const authRouter = require('./routes/auth.js');
const subjectsRouter = require('./routes/subjects.js');
const classesRouter = require('./routes/classes.js');
const trimestersRouter = require('./routes/trimesters.js');

dotenv.config();

// Инициализируем Express приложение
const app = express();
const PORT = process.env.PORT || 3001;

// Создаем HTTP-сервер на основе Express
const server = http.createServer(app);

// Настройка CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://eljur-client.netlify.app', 'https://eljur-app.netlify.app', 'https://eljur.netlify.app'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

// Инициализируем Socket.IO
const io = new Server(server, {
  cors: corsOptions
});

// Хранилище для активных соединений
const activeConnections = new Map();

// Middleware для аутентификации пользователя в Socket.IO
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Токен не предоставлен'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Ошибка аутентификации'));
  }
});

// Обработка подключений Socket.IO
io.on('connection', (socket) => {
  activeConnections.set(socket.userId, socket);
  
  // Отправляем информацию о подключении самому пользователю
  socket.emit('connect_status', { 
    connected: true, 
    userId: socket.userId,
    userRole: socket.userRole
  });
  
  // Обработка отправки сообщения
  socket.on('send_message', (data) => {
    // Обработка сообщения происходит в роутере
  });
  
  // Обработка изменения статуса "прочитано"
  socket.on('mark_messages_read', async (data) => {
    try {
      const { fromUserId } = data;
      if (!fromUserId) return;
      
      // Обновление статуса происходит в роутере
    } catch (error) {
      // Ошибка обработана
    }
  });
  
  // Обработка отключения
  socket.on('disconnect', () => {
    activeConnections.delete(socket.userId);
  });
});

// Глобальная функция для отправки сообщений через Socket.IO
global.sendSocketMessage = (userId, data) => {
  try {
    const userSocket = activeConnections.get(parseInt(userId));
    if (userSocket) {
      userSocket.emit('message', data);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

// Определяем пути для загрузок
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

let User, Class, Grade, Subject, Homework, Schedule, SchoolSettings, Message;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Создаем директории для загрузок
const createUploadDirs = async () => {
  try {
    // Проверяем существование директории uploads
    try {
      await fs.access(uploadsDir);
    } catch (err) {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Проверяем существование директории avatars
    try {
      await fs.access(avatarsDir);
    } catch (err) {
      await fs.mkdir(avatarsDir, { recursive: true });
    }

    // Проверяем содержимое директории с аватарами
    try {
      await fs.readdir(avatarsDir);
    } catch (err) {
      // Обработка ошибки
    }
  } catch (error) {
    // Обработка ошибки
  }
};

// Настраиваем обработку статических файлов
app.use('/uploads', (req, res, next) => {
  // Проверяем, существует ли файл
  fs.access(path.join(uploadsDir, req.url))
    .then(() => {})
    .catch(() => {});
  
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.jpg' || path.extname(filePath) === '.png') {
      res.setHeader('Content-Type', `image/${path.extname(filePath).substring(1)}`);
    }
  }
}));

// Добавляем простое обслуживание статических файлов
app.use('/uploads', express.static(uploadsDir));

// Подключаем маршруты
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/final-grades', finalGradesRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/trimesters', trimestersRouter);

// Перенаправляем запросы на /api/grades
app.use('/api/grades', require('./routes/grades.js'));

// Перенаправляем запросы на /api/final-grades
app.use('/api/final-grades', require('./routes/finalGrades.js'));

// Перенаправляем запросы на /api/trimesters
app.use('/api/trimesters', require('./routes/trimesters.js'));

// Маршрут для получения рейтинга класса
app.get('/api/ratings/class/:classId', async (req, res) => {
  try {
    const gradesHandler = require('./routes/grades.js');
    await gradesHandler.getClassRatings(req, res);
  } catch (error) {
    console.error('Ошибка при обработке запроса рейтинга:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Тестовый маршрут
app.get('/', (req, res) => {
  res.json({ message: 'API сервер работает' });
});

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Недействительный токен' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Срок действия токена истек' });
    }
    res.status(500).json({ message: 'Ошибка сервера при проверке токена' });
  }
};

// Создание администратора и директора при первом запуске
const initializeDefaultUsers = async () => {
  try {
    const { User } = require('./models/index.js');

    // Проверяем существование администратора
    const adminExists = await User.findOne({ where: { username: process.env.ADMIN_USERNAME } });
    if (!adminExists) {
      await User.create({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        name: process.env.ADMIN_NAME,
        role: 'admin'
      });
    }

    // Проверяем существование директора
    const directorExists = await User.findOne({ where: { username: process.env.DIRECTOR_USERNAME } });
    if (!directorExists) {
      await User.create({
        username: process.env.DIRECTOR_USERNAME,
        password: process.env.DIRECTOR_PASSWORD,
        name: process.env.DIRECTOR_NAME,
        role: 'director'
      });
    }
  } catch (error) {
  }
};

// Маршруты аутентификации
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршруты для пользователей (только для админа)
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { username, password, name, role } = req.body;
    const user = await User.create({ username, password, name, role });
    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
    }
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение списка пользователей (для админа и директора)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (!User || !Class) {
      return res.status(500).json({ message: 'Модели не инициализированы' });
    }

    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [{
        model: Class,
        as: 'class',
        attributes: ['grade', 'letter'],
        required: false
      }],
      order: [
        ['role', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Преобразуем данные для корректного отображения
    const transformedUsers = users.map(user => {
      const userData = user.toJSON();
      if (userData.class) {
        userData.className = `${userData.class.grade}-${userData.class.letter}`;
      }
      delete userData.class;
      return userData;
    });

    res.json(transformedUsers);
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении пользователей' });
  }
});

// Получение списка учеников (для учителей)
app.get('/api/users/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'name', 'role', 'avatarUrl']
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение списка учителей (для учеников)
app.get('/api/users/teachers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'name', 'role', 'avatarUrl'],
      order: [['name', 'ASC']]
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для директора
app.get('/api/director/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'director') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Проверяем, что модели инициализированы
    if (!Class || !SchoolSettings) {
      return res.status(500).json({ message: 'Сервер не готов. Попробуйте позже.' });
    }

    // Получаем данные с обработкой ошибок
    const [classes, settings] = await Promise.all([
      Class.findAll({
        include: [{
          model: User,
          as: 'students',
          attributes: ['id', 'name']
        }],
        order: [
          ['grade', 'ASC'],
          ['letter', 'ASC']
        ]
      }).catch(err => {
        console.error('Error fetching classes:', err);
        return [];
      }),
      SchoolSettings.findOne().catch(err => {
        console.error('Error fetching settings:', err);
        return null;
      })
    ]);

    // Если настройки не найдены, создаем их с значениями по умолчанию
    const finalSettings = settings || await SchoolSettings.create({
      lessonDuration: 40,
      breakDuration: 10,
      longBreakDuration: 20,
      longBreakAfterLesson: 3,
      firstLessonStart: '08:00',
      secondShiftStart: '14:00'
    }).catch(err => {
      console.error('Error creating default settings:', err);
      return null;
    });

    res.json({
      classes: classes || [],
      settings: finalSettings
    });
  } catch (error) {
    console.error('Error in director dashboard:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршруты для оценок
app.post('/api/grades', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { studentId, subject, value, date, comment } = req.body;
    const grade = await Grade.create({
      studentId,
      teacherId: req.user.userId,
      subject,
      value,
      date,
      comment,
    });

    const gradeWithRelations = await Grade.findByPk(grade.id, {
      include: [
        { model: User, as: 'student', attributes: ['name'] },
        { model: User, as: 'teacher', attributes: ['name'] }
      ]
    });

    res.status(201).json(gradeWithRelations);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение оценок (для учителя и ученика)
app.get('/api/grades', authenticateToken, async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'student') {
      where.studentId = req.user.userId;
    } else if (req.user.role === 'teacher') {
      if (req.query.studentId) {
        where.studentId = req.query.studentId;
      }
      where.teacherId = req.user.userId;
    }

    const grades = await Grade.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['name'] },
        { model: User, as: 'teacher', attributes: ['name'] }
      ],
      order: [['date', 'DESC']]
    });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление пользователя (только для админа)
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { userId } = req.params;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.role === 'admin' || user.role === 'director') {
      return res.status(403).json({ message: 'Нельзя удалить администратора или директора' });
    }

    await user.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление оценки (только для учителя, который её выставил)
app.delete('/api/grades/:gradeId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { gradeId } = req.params;
    const grade = await Grade.findByPk(gradeId);

    if (!grade) {
      return res.status(404).json({ message: 'Оценка не найдена' });
    }

    if (grade.teacherId !== req.user.userId) {
      return res.status(403).json({ message: 'Вы можете удалять только свои оценки' });
    }

    await grade.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение списка классов
app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    const classes = await Class.findAll({
      include: [{
        model: User,
        as: 'students',
        attributes: ['id', 'name'],
        where: req.user.role === 'admin' ? undefined : { role: 'student' }
      }],
      order: [
        ['grade', 'ASC'],
        ['letter', 'ASC']
      ]
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создание нового класса
app.post('/api/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { grade, letter } = req.body;
    const newClass = await Class.create({ grade, letter: letter.toUpperCase() });
    res.status(201).json(newClass);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Такой класс уже существует' });
    }
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление класса
app.delete('/api/classes/:classId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { classId } = req.params;
    const classToDelete = await Class.findByPk(classId);

    if (!classToDelete) {
      return res.status(404).json({ message: 'Класс не найден' });
    }

    await classToDelete.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Назначение ученика в класс
app.put('/api/users/:userId/class', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const { userId } = req.params;
    const { classId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ message: 'Только ученики могут быть назначены в класс' });
    }

    if (classId) {
      const classExists = await Class.findByPk(classId);
      if (!classExists) {
        return res.status(404).json({ message: 'Класс не найден' });
      }
    }

    await user.update({ classId: classId || null });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Тестовый маршрут для создания и отдачи тестового файла
app.get('/create-test-file', async (req, res) => {
  try {
    // Создаем простой текстовый файл в директории avatars
    const testFilePath = path.join(avatarsDir, 'test-file.txt');
    await fs.writeFile(testFilePath, 'Это тестовый файл для проверки статических файлов');
    
    res.send({
      success: true, 
      message: 'Тестовый файл создан', 
      path: testFilePath,
      url: '/uploads/avatars/test-file.txt'
    });
  } catch (err) {
    res.status(500).send({ success: false, error: err.message });
  }
});

// Диагностический маршрут для проверки доступа к файлам
app.get('/check-file', async (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'Путь к файлу не указан' });
    }

    // Полный путь к файлу
    const fullPath = path.join(__dirname, filePath.startsWith('/') ? filePath.substring(1) : filePath);
    
    try {
      // Проверяем, существует ли файл
      await fs.access(fullPath);
      
      // Получаем информацию о файле
      const stats = await fs.stat(fullPath);
      
      res.json({
        exists: true,
        path: fullPath,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        permissions: {
          readable: true,
          writable: true
        }
      });
    } catch (err) {
      res.json({
        exists: false,
        path: fullPath,
        error: err.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Специальный маршрут для отдачи аватаров
app.get('/uploads/avatars/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(avatarsDir, filename);
    const defaultAvatarPath = path.join(avatarsDir, 'default.png');
    
    // Проверяем существование файла
    try {
      await fs.access(filePath);
      
      // Определяем тип содержимого
      let contentType = 'image/jpeg';
      if (filename.endsWith('.png')) {
        contentType = 'image/png';
      } else if (filename.endsWith('.gif')) {
        contentType = 'image/gif';
      }
      
      // Получаем информацию о файле
      const stats = await fs.stat(filePath);
      
      // Устанавливаем заголовки
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Отправляем файл
      res.sendFile(filePath);
    } catch (err) {
      // Пробуем отдать дефолтный аватар
      try {
        await fs.access(defaultAvatarPath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.sendFile(defaultAvatarPath);
      } catch (defaultErr) {
        // Аватар по умолчанию не найден
      }
      
      res.status(404).send('Файл не найден');
    }
  } catch (err) {
    res.status(500).send('Ошибка сервера');
  }
});

// Функция для инициализации триместров
const initializeTrimesters = async () => {
  try {
    const { Trimester } = require('./models');
    
    // Проверяем, есть ли уже триместры в базе данных
    const existingTrimesters = await Trimester.count();
    if (existingTrimesters > 0) {
      return;
    }
    
    // Получаем текущий год
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    // Если текущий месяц >= 9 (сентябрь), то учебный год начинается в текущем году
    // Иначе учебный год начался в предыдущем году
    const academicYear = currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    
    // Создаем триместры для текущего учебного года
    const trimesters = [
      {
        type: 'TRIMESTER1',
        startDate: `${academicYear}-09-01`, // 1 сентября
        endDate: `${academicYear}-11-30`,   // 30 ноября
        academicYear,
        isActive: true
      },
      {
        type: 'TRIMESTER2',
        startDate: `${academicYear}-12-01`, // 1 декабря
        endDate: `${academicYear + 1}-02-28`, // 28 февраля
        academicYear,
        isActive: true
      },
      {
        type: 'TRIMESTER3',
        startDate: `${academicYear + 1}-03-01`, // 1 марта
        endDate: `${academicYear + 1}-05-31`,   // 31 мая
        academicYear,
        isActive: true
      }
    ];
    
    // Создаем триместры в базе данных
    await Trimester.bulkCreate(trimesters);
  } catch (error) {
    // Обработка ошибки
  }
};

// Функция создания тестового аватара
const createTestAvatar = async () => {
  try {
    const defaultAvatarPath = path.join(avatarsDir, 'default.png');
    
    // Проверяем существование тестового аватара
    try {
      await fs.access(defaultAvatarPath);
      return;
    } catch (err) {
      // Файл не существует, создаем его
    }
    
    // Создаем простой PNG-файл с синим фоном
    // Это простой PNG в формате base64 с синим квадратом
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB' +
      'hUlEQVR4nO3dsU3DQBSA4XeZgIIWKGgpQU3DDBQZgJYBQqChR6JkhnSMQEXHQ4HsGyE4Rw75vub+' +
      '4tRW7qzIkiRJkiRJkiRJkiRJkiRJkiRJkjqTUloB6+rOW1tr13N7HslSvVTXTYPsql+r1bxe55Ft' +
      'gPfqU3U4uHeo3tp/Dk8zbQEGUg4DKYeBlMNAymEg5TCQchhIOQykHK3+Xm+q9+p5ptceq9fqbd4/' +
      'FH3zBpJSWrXWvqrdzN/4vl3LGNu5vSaIgSzdAXisvqubE3/f/9p2DLG9u26BvZ4kSZIkSZIkSZIk' +
      'SZIk1eTT3nIYSDkMpBwGUg4DKYeBlMNAymEg5TCQchhIOQykHAZSDgMph4GUw0DKYSDlMJByGEg5' +
      'DKQcBlIOAymHgZTDQMphIOUwkHIYSDkMpBzeg5TDQMphIOUwkHIYSDkMpBwGUg4DKYeBlMNAymEg' +
      '5TCQchhIOQykHAZSDgMph4GUw0DKYSDlMJByGEg5fNpbDgMph4GUw0DKYSDlMBBJkiRJkiRJkiQp' +
      'fvYDZa2KvGQ1K9UAAAAASUVORK5CYII=',
      'base64'
    );
    
    await fs.writeFile(defaultAvatarPath, pngData);
  } catch (err) {
    // Обработка ошибки
  }
};

// Функция для инициализации тестовых данных
const initTestData = async () => {
  try {
    // Создаем директории для загрузок
    await createUploadDirs();
    
    // Инициализируем триместры
    await initializeTrimesters();
    
    // Инициализируем начальных пользователей
    await initializeDefaultUsers();
  } catch (error) {
    // Обработка ошибки
  }
};

// Функция запуска сервера
const startServer = async () => {
  try {
    // Запускаем миграции перед запуском сервера
    try {
      console.log('Применяем миграции...');
      execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
      console.log('Миграции успешно применены');
    } catch (migrationError) {
      console.error('Предупреждение: Ошибка при применении миграций.');
      console.error('Продолжаем запуск сервера без применения миграций.');
      // Продолжаем работу даже при ошибке миграций
    }

    // Инициализация базы данных (без принудительного пересоздания таблиц)
    console.log('Инициализация базы данных...');
    await initDatabase();
    console.log('База данных инициализирована');
    
    // Создание папки для аватаров, если её нет
    if (!fsSync.existsSync(avatarsDir)) {
      fsSync.mkdirSync(avatarsDir, { recursive: true });
    }
    
    // Проверяем и создаём тестового аватара если его нет
    await createTestAvatar();
    
    // Инициализируем тестовые данные
    await initTestData();
    
    server.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('Критическая ошибка при запуске сервера:', error);
    process.exit(1); // Завершаем процесс с ошибкой
  }
};

startServer(); 