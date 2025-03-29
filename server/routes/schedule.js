const express = require('express');
const { auth } = require('../middleware/auth.js');
const { Schedule, SchoolSettings, User, Class } = require('../models/index.js');

const router = express.Router();

// Функция для расчета времени начала и окончания урока
const calculateLessonTime = (settings, lessonNumber) => {
  const isSecondShift = lessonNumber > 8;
  const startTimeStr = isSecondShift ? settings.secondShiftStart : settings.firstLessonStart;
  const adjustedLessonNumber = isSecondShift ? lessonNumber - 8 : lessonNumber;

  // Преобразуем начальное время в минуты
  const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
  let currentMinutes = startHours * 60 + startMinutes;

  // Рассчитываем время для всех уроков до текущего
  for (let i = 1; i < adjustedLessonNumber; i++) {
    // Добавляем длительность предыдущего урока
    currentMinutes += settings.lessonDuration;
    
    // Добавляем перемену
    if (i === settings.longBreakAfterLesson) {
      currentMinutes += settings.longBreakDuration;
    } else {
      currentMinutes += settings.breakDuration;
    }
  }

  // Время начала текущего урока
  const lessonStartTime = {
    hours: Math.floor(currentMinutes / 60),
    minutes: currentMinutes % 60
  };

  // Время окончания текущего урока
  const endMinutes = currentMinutes + settings.lessonDuration;
  const lessonEndTime = {
    hours: Math.floor(endMinutes / 60),
    minutes: endMinutes % 60
  };

  // Форматируем время в строку
  const formatTime = (time) => {
    return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
  };

  return {
    startTime: formatTime(lessonStartTime),
    endTime: formatTime(lessonEndTime)
  };
};

// Middleware для проверки роли директора
const isDirector = (req, res, next) => {
  if (req.user.role !== 'director') {
    return res.status(403).json({ message: 'Доступ запрещен. Требуются права директора.' });
  }
  next();
};

// Получить настройки школы
router.get('/settings', auth, async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) {
      settings = await SchoolSettings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить настройки школы (только директор)
router.put('/settings', auth, isDirector, async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) {
      settings = await SchoolSettings.create(req.body);
    } else {
      await settings.update(req.body);
    }
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Получить расписание для класса
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    
    if (isNaN(classId)) {
      return res.status(400).json({ message: 'Некорректный ID класса' });
    }
    
    // Проверяем, существует ли класс
    const classExists = await Class.findByPk(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Класс не найден' });
    }
    
    const schedule = await Schedule.findAll({
      where: { 
        classId: classId,
        isTemplate: false
      },
      include: [{
        model: User,
        as: 'teacher',
        attributes: ['id', 'name'],
        required: false
      }],
      order: [['dayOfWeek', 'ASC'], ['lessonNumber', 'ASC']]
    });
    
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении расписания' });
  }
});

// Создать или обновить расписание (только директор)
router.post('/class/:classId', auth, isDirector, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const { schedule } = req.body;

    if (isNaN(classId)) {
      return res.status(400).json({ message: 'Некорректный ID класса' });
    }

    if (!Array.isArray(schedule)) {
      return res.status(400).json({ message: 'Расписание должно быть массивом' });
    }

    const settings = await SchoolSettings.findOne();
    if (!settings) {
      return res.status(400).json({ message: 'Настройки школы не найдены' });
    }

    // Валидация и преобразование данных
    const validSchedule = schedule.map(item => {
      const dayOfWeek = parseInt(item.dayOfWeek, 10);
      const lessonNumber = parseInt(item.lessonNumber, 10);

      if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 6) {
        throw new Error(`Некорректный день недели: ${item.dayOfWeek}`);
      }

      if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > 16) {
        throw new Error(`Некорректный номер урока: ${item.lessonNumber}`);
      }

      if (!item.subject || typeof item.subject !== 'string') {
        throw new Error('Отсутствует или некорректный предмет');
      }

      const times = calculateLessonTime(settings, lessonNumber);

      return {
        classId,
        dayOfWeek,
        lessonNumber,
        subject: item.subject,
        teacherId: item.teacherId || null,
        startTime: times.startTime,
        endTime: times.endTime,
        name: item.name || '',
        isTemplate: false
      };
    });

    // Удаляем старое расписание для класса
    await Schedule.destroy({ where: { classId } });

    // Создаем новое расписание
    const newSchedule = await Schedule.bulkCreate(validSchedule);
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(400).json({ message: error.message });
  }
});

// Получить все шаблоны расписаний
router.get('/templates', auth, isDirector, async (req, res) => {
  try {
    const templates = await Schedule.findAll({
      where: { isTemplate: true },
      attributes: ['name'],
      group: ['name']
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching schedule templates:', error);
    res.status(500).json({ message: error.message });
  }
});

// Создать шаблон расписания
router.post('/templates', auth, isDirector, async (req, res) => {
  try {
    const { name, schedule } = req.body;
    const template = await Schedule.bulkCreate(
      schedule.map(item => ({ ...item, isTemplate: true, name }))
    );
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Удалить шаблон расписания
router.delete('/templates/:name', auth, isDirector, async (req, res) => {
  try {
    await Schedule.destroy({
      where: { name: req.params.name, isTemplate: true }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 