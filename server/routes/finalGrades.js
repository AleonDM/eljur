const express = require('express');
const { auth, isTeacher } = require('../middleware/auth.js');
const { FinalGrade, User, Class, Trimester, Grade } = require('../models/index.js');

const router = express.Router();

// Получить итоговые оценки ученика
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const finalGrades = await FinalGrade.findAll({
      where: {
        studentId: req.params.studentId
      },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        }
      ],
      order: [['year', 'DESC'], ['subject', 'ASC']]
    });
    res.json(finalGrades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Получить итоговые оценки для класса
router.get('/class/:classId', auth, async (req, res) => {
  try {
    // Проверяем роль пользователя
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ 
        message: 'Доступ запрещен. Требуются права учителя, администратора или директора.' 
      });
    }

    // Проверяем существование класса
    const classExists = await Class.findByPk(req.params.classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Класс не найден' });
    }

    const students = await User.findAll({
      where: { 
        classId: req.params.classId,
        role: 'student'
      },
      attributes: ['id', 'name']
    });

    if (!students.length) {
      return res.json([]);
    }

    const finalGrades = await FinalGrade.findAll({
      where: {
        studentId: students.map(s => s.id)
      },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        }
      ],
      order: [
        ['subject', 'ASC'],
        ['gradeType', 'ASC']
      ]
    });

    res.json(finalGrades);
  } catch (error) {
    console.error('Error fetching final grades:', error);
    res.status(500).json({ 
      message: 'Ошибка при получении итоговых оценок',
      error: error.message 
    });
  }
});

// Выставить итоговую оценку
router.post('/', auth, isTeacher, async (req, res) => {
  try {
    const { studentId, subject, gradeType, value, year, comment } = req.body;

    // Проверяем, существует ли уже такая итоговая оценка
    const existingGrade = await FinalGrade.findOne({
      where: {
        studentId,
        subject,
        gradeType,
        year
      }
    });

    if (existingGrade) {
      return res.status(400).json({ message: 'Итоговая оценка уже выставлена' });
    }

    // Проверяем, является ли студент учеником 9 или 11 класса для оценок аттестата
    if (gradeType === 'ATTESTATION') {
      const student = await User.findByPk(studentId, {
        include: [{ model: Class, as: 'class' }]
      });

      if (!student.class || ![9, 11].includes(student.class.grade)) {
        return res.status(400).json({ 
          message: 'Оценки аттестата можно выставлять только ученикам 9 и 11 классов' 
        });
      }
    }

    // Проверяем, что тип итоговой оценки соответствует текущему или завершенному триместру
    const { Op } = require('sequelize');
    
    // Получаем текущую дату
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Определяем учебный год
    const currentMonth = now.getMonth() + 1; // 1-12
    const academicYear = currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    
    // Проверяем триместр в зависимости от типа итоговой оценки
    if (['TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3'].includes(gradeType)) {
      const trimester = await Trimester.findOne({
        where: {
          type: gradeType,
          academicYear,
          isActive: true
        }
      });
      
      if (!trimester) {
        return res.status(400).json({ 
          message: `Триместр ${gradeType} не найден или не активен в текущем учебном году` 
        });
      }
      
      // Проверяем, что триместр завершен или текущая дата - последний день триместра
      if (new Date(trimester.endDate) > now && trimester.endDate !== today) {
        return res.status(400).json({ 
          message: `Невозможно выставить итоговую оценку за ${gradeType}. Триместр еще не завершен.` 
        });
      }
      
      // Проверяем наличие оценок в этом триместре
      const gradesInTrimester = await Grade.count({
        where: {
          studentId,
          subject,
          trimesterId: trimester.id
        }
      });
      
      if (gradesInTrimester === 0) {
        return res.status(400).json({ 
          message: `Невозможно выставить итоговую оценку за ${gradeType}. Нет оценок в этом триместре.` 
        });
      }
    } 
    // Для годовой оценки проверяем наличие всех триместровых оценок
    else if (gradeType === 'YEAR') {
      // Проверяем наличие оценок за все три триместра
      const trimesterGrades = await FinalGrade.findAll({
        where: {
          studentId,
          subject,
          gradeType: ['TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3'],
          year
        }
      });
      
      if (trimesterGrades.length < 3) {
        return res.status(400).json({ 
          message: 'Невозможно выставить годовую оценку. Необходимо сначала выставить оценки за все три триместра.' 
        });
      }
      
      // Проверяем, что последний триместр завершен
      const lastTrimester = await Trimester.findOne({
        where: {
          type: 'TRIMESTER3',
          academicYear,
          isActive: true
        }
      });
      
      if (lastTrimester && new Date(lastTrimester.endDate) > now && lastTrimester.endDate !== today) {
        return res.status(400).json({ 
          message: 'Невозможно выставить годовую оценку. Учебный год еще не завершен.' 
        });
      }
    }

    const finalGrade = await FinalGrade.create({
      studentId,
      teacherId: req.user.userId,
      subject,
      gradeType,
      value,
      year,
      comment
    });

    const gradeWithRelations = await FinalGrade.findByPk(finalGrade.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json(gradeWithRelations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Изменить итоговую оценку
router.put('/:id', auth, isTeacher, async (req, res) => {
  try {
    const { value, comment } = req.body;
    const finalGrade = await FinalGrade.findByPk(req.params.id);

    if (!finalGrade) {
      return res.status(404).json({ message: 'Итоговая оценка не найдена' });
    }

    if (finalGrade.teacherId !== req.user.userId) {
      return res.status(403).json({ message: 'Нет прав на изменение этой оценки' });
    }

    await finalGrade.update({ value, comment });

    const updatedGrade = await FinalGrade.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json(updatedGrade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 