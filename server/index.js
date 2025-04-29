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
const usersRoutes = require('./routes/users');
const gradesRoutes = require('./routes/grades');
const classesRoutes = require('./routes/classes');
const homeworkRoutes = require('./routes/homework');
const subjectsRoutes = require('./routes/subjects');
const settingsRoutes = require('./routes/settings');
const scheduleRoutes = require('./routes/schedule');
const finalGradesRoutes = require('./routes/finalGrades');
const trimestersRoutes = require('./routes/trimesters');
const socketIo = require('socket.io');
const { socketAuth } = require('./middleware/auth');
const Message = require('./models/Message');
const User = require('./models/User');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://eljur-client.netlify.app', 'https://eljur-app.netlify.app', 'https://eljur.netlify.app'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

const activeConnections = new Map();

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

io.on('connection', (socket) => {
  activeConnections.set(socket.userId, socket);
  
  socket.emit('connect_status', { 
    connected: true, 
    userId: socket.userId,
    userRole: socket.userRole
  });
  
  socket.on('send_message', (data) => {
    // Обработка сообщения происходит в роутере
  });
  
  socket.on('mark_messages_read', async (data) => {
    try {
      const { fromUserId } = data;
      if (!fromUserId) return;
      
      // Обновление статуса происходит в роутере
    } catch (error) {
      // Ошибка обработана
    }
  });
  
  socket.on('disconnect', () => {
    activeConnections.delete(socket.userId);
  });
});

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

const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

let User, Class, Grade, Subject, Homework, Schedule, SchoolSettings, Message;

app.use(cors(corsOptions));
app.use(express.json());

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

app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/users', usersRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/messages', require('./routes/messages.js'));
app.use('/api/finalGrades', finalGradesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/trimesters', trimestersRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

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

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (!User || !Class) {
      return res.status(500).json({ message: 'Модели не инициализированы' });
    }

    const { users, studentsCount, teachersCount } = await User.findAndCountAll({
      where: { role: { [require('sequelize').Op.in]: ['student', 'teacher'] } },
      attributes: ['id', 'name', 'role', 'classId'],
      include: [{ model: Class, as: 'class' }]
    }).then(result => {
      const students = result.rows.filter(user => user.role === 'student');
      const teachers = result.rows.filter(user => user.role === 'teacher');
      return {
        users: result.rows,
        studentsCount: students.length,
        teachersCount: teachers.length
      };
    }).catch(error => {
      return { users: [], studentsCount: 0, teachersCount: 0 };
    });

    res.json({ studentsCount, teachersCount, users });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении пользователей' });
  }
});

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
        return [];
      }),
      SchoolSettings.findOne().catch(err => {
        return null;
      })
    ]);

    // Если настройки не найдены, создаем их с дефолтными значениями
    if (!settings) {
      await SchoolSettings.create({
        firstLessonStart: '08:30',
        lessonDuration: 45,
        breakDuration: 10,
        longBreakDuration: 20,
        longBreakAfterLesson: 3,
        secondShiftStart: '14:00',
        gradeRoundingThreshold: 0.5
      }).catch(err => {
        // Обработка ошибки
      });
    }

    res.json({
      classes: classes || [],
      settings: settings
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении данных панели директора' });
  }
});

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

app.get('/uploads/avatars/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(avatarsDir, filename);
    const defaultAvatarPath = path.join(avatarsDir, 'default.png');
    
    // Добавляем CORS заголовки для всех доменов
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
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

const startServer = async () => {
  try {
    // Запускаем миграции перед запуском сервера
    try {
      execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
    } catch (migrationError) {
      // Продолжаем работу даже при ошибке миграций
    }

    // Инициализация базы данных (без принудительного пересоздания таблиц)
    await initDatabase();
    
    // Создание папки для аватаров, если её нет
    if (!fsSync.existsSync(avatarsDir)) {
      fsSync.mkdirSync(avatarsDir, { recursive: true });
    }
    
    // Проверяем и создаём тестового аватара если его нет
    await createTestAvatar();
    
    // Инициализируем тестовые данные
    await initTestData();
    
    server.listen(PORT, () => {
      // Сервер запущен
    });
  } catch (error) {
    process.exit(1); // Завершаем процесс с ошибкой
  }
};

startServer(); 