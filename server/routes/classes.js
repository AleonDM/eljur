const express = require('express');
const { auth } = require('../middleware/auth.js');
const { Class, User } = require('../models/index.js');

const router = express.Router();

// Получение всех классов
router.get('/', auth, async (req, res) => {
  try {
    const classes = await Class.findAll({
      include: [
        {
          model: User,
          as: 'students',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['grade', 'ASC'], ['letter', 'ASC']]
    });
    res.json(classes);
  } catch (error) {
    console.error('Ошибка при получении классов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение конкретного класса по id
router.get('/:id', auth, async (req, res) => {
  try {
    const classData = await Class.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'students',
          attributes: ['id', 'name', 'username', 'role']
        }
      ]
    });
    
    if (!classData) {
      return res.status(404).json({ message: 'Класс не найден' });
    }
    
    res.json(classData);
  } catch (error) {
    console.error('Ошибка при получении класса:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создание нового класса (только для администратора или директора)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Недостаточно прав для создания класса' });
    }
    
    const { grade, letter } = req.body;
    
    // Проверяем, не существует ли уже такой класс
    const existingClass = await Class.findOne({
      where: { grade, letter }
    });
    
    if (existingClass) {
      return res.status(400).json({ message: 'Класс с таким номером и буквой уже существует' });
    }
    
    const newClass = await Class.create({ grade, letter });
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Ошибка при создании класса:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление класса (только для администратора или директора)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Недостаточно прав для удаления класса' });
    }
    
    const classData = await Class.findByPk(req.params.id);
    
    if (!classData) {
      return res.status(404).json({ message: 'Класс не найден' });
    }
    
    // Проверяем, есть ли студенты в классе
    const studentsCount = await User.count({
      where: { classId: req.params.id }
    });
    
    if (studentsCount > 0) {
      return res.status(400).json({ 
        message: 'Нельзя удалить класс, в котором есть ученики. Сначала переведите всех учеников.' 
      });
    }
    
    await classData.destroy();
    res.json({ message: 'Класс успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении класса:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router; 