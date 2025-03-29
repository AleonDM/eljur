const express = require('express');
const { auth } = require('../middleware/auth.js');
const { Subject } = require('../models/index.js');

const router = express.Router();

// Получение списка предметов
router.get('/', auth, async (req, res) => {
  try {
    const subjects = await Subject.findAll();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создание нового предмета
router.post('/', auth, async (req, res) => {
  try {
    const { name, grades } = req.body;
    const subject = await Subject.create({ name, grades });
    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление предмета
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grades } = req.body;
    const subject = await Subject.findByPk(id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Предмет не найден' });
    }
    
    await subject.update({ name, grades });
    res.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удаление предмета
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Предмет не найден' });
    }
    
    await subject.destroy();
    res.json({ message: 'Предмет удален' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 