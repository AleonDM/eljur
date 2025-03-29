const express = require('express');
const { auth, isTeacher } = require('../middleware/auth.js');
const { Grade, User, Trimester } = require('../models/index.js');

const router = express.Router();

// Получить все оценки (с фильтрацией по роли пользователя)
router.get('/', auth, async (req, res) => {
  try {
    let where = {};
    
    // Если пользователь - учитель, показываем только его оценки
    if (req.user.role === 'teacher') {
      where.teacherId = req.user.userId;
    } 
    // Если пользователь - студент, показываем только его оценки
    else if (req.user.role === 'student') {
      where.studentId = req.user.userId;
    }
    // Администратор и директор видят все оценки

    const grades = await Grade.findAll({
      where,
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name']
        },
        {
          model: Trimester,
          as: 'trimester',
          attributes: ['id', 'type', 'startDate', 'endDate', 'academicYear']
        }
      ],
      order: [['date', 'DESC']]
    });
    
    // Преобразуем данные для клиента
    const formattedGrades = grades.map(grade => {
      const gradeData = grade.toJSON();
      // Добавляем trimesterId, если есть триместр
      if (gradeData.trimester) {
        gradeData.trimesterId = gradeData.trimester.id;
        delete gradeData.trimester; // Удаляем полный объект триместра для уменьшения размера ответа
      }
      return gradeData;
    });
    
    res.json(formattedGrades);
  } catch (error) {
    console.error('Ошибка при получении оценок:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить оценки ученика
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const grades = await Grade.findAll({
      where: { studentId: req.params.studentId },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name']
        },
        {
          model: Trimester,
          as: 'trimester',
          attributes: ['id', 'type', 'startDate', 'endDate', 'academicYear']
        }
      ],
      order: [['date', 'DESC']]
    });
    
    // Преобразуем данные для клиента
    const formattedGrades = grades.map(grade => {
      const gradeData = grade.toJSON();
      // Добавляем trimesterId, если есть триместр
      if (gradeData.trimester) {
        gradeData.trimesterId = gradeData.trimester.id;
        delete gradeData.trimester; // Удаляем полный объект триместра для уменьшения размера ответа
      }
      return gradeData;
    });
    
    res.json(formattedGrades);
  } catch (error) {
    console.error('Ошибка при получении оценок:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать новую оценку (только для учителей)
router.post('/', auth, isTeacher, async (req, res) => {
  try {
    const { studentId, subject, value, date, comment } = req.body;
    
    console.log('Получен запрос на создание оценки:', {
      studentId,
      subject,
      value,
      date,
      comment,
      teacherId: req.user.userId
    });
    
    // Проверяем тип значения и преобразуем его, если необходимо
    let gradeValue = value;
    if (typeof value === 'string' && /^[1-5]$/.test(value)) {
      gradeValue = parseInt(value, 10);
    }
    
    // Проверяем, что значение допустимо
    if (typeof gradeValue === 'number' && (gradeValue < 1 || gradeValue > 5)) {
      return res.status(400).json({ message: 'Оценка должна быть от 1 до 5' });
    }
    
    if (typeof gradeValue === 'string' && !['Н', 'У', 'О'].includes(gradeValue)) {
      return res.status(400).json({ message: 'Допустимые буквенные оценки: Н, У, О' });
    }
    
    // Проверяем, что дата оценки находится в пределах активного триместра
    const gradeDate = new Date(date);
    const formattedDate = gradeDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const activeTrimester = await Trimester.findOne({
      where: {
        isActive: true,
        startDate: { [require('sequelize').Op.lte]: formattedDate },
        endDate: { [require('sequelize').Op.gte]: formattedDate }
      }
    });
    
    if (!activeTrimester) {
      return res.status(400).json({ 
        message: 'Невозможно выставить оценку на эту дату. Дата не входит в активный триместр.' 
      });
    }
    
    const grade = await Grade.create({
      studentId,
      subject,
      value: gradeValue,
      date,
      comment,
      teacherId: req.user.userId,
      trimesterId: activeTrimester.id // Сохраняем ID триместра, к которому относится оценка
    });

    console.log('Оценка успешно создана:', grade.id);

    const gradeWithTeacher = await Grade.findByPk(grade.id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json(gradeWithTeacher);
  } catch (error) {
    console.error('Ошибка при создании оценки:', error);
    res.status(400).json({ message: error.message });
  }
});

// Удалить оценку (только для учителей)
router.delete('/:id', auth, isTeacher, async (req, res) => {
  try {
    const grade = await Grade.findByPk(req.params.id);
    
    if (!grade) {
      return res.status(404).json({ message: 'Оценка не найдена' });
    }

    if (grade.teacherId !== req.user.userId) {
      return res.status(403).json({ message: 'Нет прав на удаление этой оценки' });
    }

    await grade.destroy();
    res.json({ message: 'Оценка удалена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 