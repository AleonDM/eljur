const express = require('express');
const { auth, isTeacher } = require('../middleware/auth.js');
const { Homework, User } = require('../models/index.js');

const router = express.Router();

// Получить все домашние задания для класса
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const homework = await Homework.findAll({
      where: { classId: req.params.classId },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'name']
        }
      ],
      order: [['dueDate', 'ASC']]
    });
    res.json(homework);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Создать новое домашнее задание (только для учителей)
router.post('/', auth, isTeacher, async (req, res) => {
  try {
    const { subject, description, dueDate, classId } = req.body;
    const homework = await Homework.create({
      subject,
      description,
      dueDate,
      classId,
      teacherId: req.user.userId
    });
    res.status(201).json(homework);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Удалить домашнее задание (только для учителей)
router.delete('/:id', auth, isTeacher, async (req, res) => {
  try {
    const homework = await Homework.findByPk(req.params.id);
    if (!homework) {
      return res.status(404).json({ message: 'Домашнее задание не найдено' });
    }
    if (homework.teacherId !== req.user.userId) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }
    await homework.destroy();
    res.json({ message: 'Домашнее задание удалено' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 