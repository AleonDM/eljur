const express = require('express');
const router = express.Router();
const { Trimester } = require('../models');
const { auth, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// Получить все триместры
router.get('/', auth, async (req, res) => {
  try {
    const trimesters = await Trimester.findAll({
      order: [['academicYear', 'DESC'], ['type', 'ASC']]
    });
    res.json(trimesters);
  } catch (error) {
    console.error('Ошибка при получении триместров:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить активные триместры для текущего учебного года
router.get('/active', auth, async (req, res) => {
  try {
    // Определяем текущий учебный год
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    // Если текущий месяц >= 9 (сентябрь), то учебный год начинается в текущем году
    // Иначе учебный год начался в предыдущем году
    const academicYear = currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    
    const trimesters = await Trimester.findAll({
      where: {
        academicYear,
        isActive: true
      },
      order: [['type', 'ASC']]
    });
    
    res.json(trimesters);
  } catch (error) {
    console.error('Ошибка при получении активных триместров:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить текущий триместр
router.get('/current', auth, async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const currentTrimester = await Trimester.findOne({
      where: {
        isActive: true,
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today }
      }
    });
    
    if (!currentTrimester) {
      return res.status(404).json({ message: 'Текущий триместр не найден' });
    }
    
    res.json(currentTrimester);
  } catch (error) {
    console.error('Ошибка при получении текущего триместра:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать новый триместр (только для администраторов)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { type, startDate, endDate, academicYear, isActive } = req.body;
    
    // Проверка обязательных полей
    if (!type || !startDate || !endDate || !academicYear) {
      return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
    }
    
    // Проверка корректности дат
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Дата начала должна быть раньше даты окончания' });
    }
    
    const trimester = await Trimester.create({
      type,
      startDate,
      endDate,
      academicYear,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json(trimester);
  } catch (error) {
    console.error('Ошибка при создании триместра:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обновить триместр (только для администраторов)
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, startDate, endDate, academicYear, isActive } = req.body;
    
    const trimester = await Trimester.findByPk(id);
    if (!trimester) {
      return res.status(404).json({ message: 'Триместр не найден' });
    }
    
    // Проверка корректности дат
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Дата начала должна быть раньше даты окончания' });
    }
    
    await trimester.update({
      type: type || trimester.type,
      startDate: startDate || trimester.startDate,
      endDate: endDate || trimester.endDate,
      academicYear: academicYear || trimester.academicYear,
      isActive: isActive !== undefined ? isActive : trimester.isActive
    });
    
    res.json(trimester);
  } catch (error) {
    console.error('Ошибка при обновлении триместра:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить триместр (только для администраторов)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const trimester = await Trimester.findByPk(id);
    if (!trimester) {
      return res.status(404).json({ message: 'Триместр не найден' });
    }
    
    await trimester.destroy();
    
    res.json({ message: 'Триместр успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении триместра:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router; 