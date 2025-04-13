const express = require('express');
const { auth, isTeacher } = require('../middleware/auth.js');
const { Grade, User, Trimester, Class, Sequelize } = require('../models/index.js');

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
    const { studentId, subject, value, date, comment, trimesterId } = req.body;
    
    console.log('Получен запрос на создание оценки:', {
      studentId,
      subject,
      value,
      date,
      comment,
      trimesterId,
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
    
    // Проверяем соответствие даты триместру, если передан trimesterId
    let finalTrimesterId = trimesterId;
    if (!finalTrimesterId) {
      // Если trimesterId не передан, пытаемся найти подходящий триместр для даты
      const gradeDate = new Date(date);
      const formattedDate = gradeDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const matchingTrimester = await Trimester.findOne({
        where: {
          startDate: { [require('sequelize').Op.lte]: formattedDate },
          endDate: { [require('sequelize').Op.gte]: formattedDate }
        }
      });
      
      if (matchingTrimester) {
        console.log('Найден триместр для даты:', matchingTrimester.type);
        finalTrimesterId = matchingTrimester.id;
      } else {
        console.log('Триместр для даты не найден, оценка будет сохранена без привязки к триместру');
      }
    }
    
    const grade = await Grade.create({
      studentId,
      subject,
      value: gradeValue,
      date,
      comment,
      teacherId: req.user.userId,
      trimesterId: finalTrimesterId // Сохраняем ID триместра, если он найден
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

// Получение рейтинга учеников класса
const getClassRatings = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Проверяем, существует ли класс
    const classExists = await Class.findByPk(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Класс не найден' });
    }
    
    // Получаем список учеников класса
    const students = await User.findAll({
      where: { 
        classId,
        role: 'student' 
      },
      attributes: ['id', 'name']
    });
    
    if (!students.length) {
      return res.status(404).json({ message: 'В этом классе нет учеников' });
    }
    
    // Получаем все оценки учеников класса
    const studentIds = students.map(student => student.id);
    const grades = await Grade.findAll({
      where: {
        studentId: studentIds,
        // Исключаем нечисловые оценки (Н, У, О и т.д.)
        // SQLite не поддерживает REGEXP, поэтому используем простое условие
        value: ['1', '2', '3', '4', '5']
      },
      attributes: ['studentId', 'subject', 'value']
    });
    
    // Вычисляем средний балл для каждого ученика
    const studentRatings = students.map(student => {
      // Получаем оценки текущего ученика
      const studentGrades = grades.filter(grade => grade.studentId === student.id);
      
      // Вычисляем общий средний балл
      const totalValues = studentGrades.map(grade => Number(grade.value));
      const averageGrade = totalValues.length > 0 
        ? parseFloat((totalValues.reduce((acc, val) => acc + val, 0) / totalValues.length).toFixed(2))
        : 0;
      
      // Получаем уникальные предметы
      const subjects = [...new Set(studentGrades.map(grade => grade.subject))];
      
      // Вычисляем средний балл по каждому предмету
      const subjectGrades = {};
      subjects.forEach(subject => {
        const subjectValues = studentGrades
          .filter(grade => grade.subject === subject)
          .map(grade => Number(grade.value));
        
        subjectGrades[subject] = subjectValues.length > 0
          ? parseFloat((subjectValues.reduce((acc, val) => acc + val, 0) / subjectValues.length).toFixed(2))
          : 0;
      });
      
      return {
        studentId: student.id,
        studentName: student.name,
        averageGrade,
        subjectGrades
      };
    });
    
    // Сортируем по среднему баллу (от высшего к низшему)
    studentRatings.sort((a, b) => b.averageGrade - a.averageGrade);
    
    res.json(studentRatings);
  } catch (error) {
    console.error('Ошибка при получении рейтинга класса:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Связываем с маршрутом
router.get('/ratings/class/:classId', auth, getClassRatings);

// Получить оценки по предмету, дате и классу
router.get('/by-lesson', auth, async (req, res) => {
  try {
    const { subject, date, classId } = req.query;
    
    console.log('Сырые параметры запроса:', req.query);
    
    if (!subject || !date || !classId) {
      console.error('Отсутствуют обязательные параметры запроса:', { subject, date, classId });
      return res.status(400).json({ message: 'Необходимо указать предмет, дату и класс' });
    }
    
    console.log('Запрос оценок по уроку:', { 
      subject, 
      date, 
      classId, 
      userRole: req.user.role, 
      userClassId: req.user.classId
    });
    
    // Проверяем, есть ли у пользователя доступ к этому классу
    let hasAccess = false;
    
    if (req.user.role === 'admin' || req.user.role === 'director') {
      // Администраторы и директор имеют доступ ко всем классам
      hasAccess = true;
    } else if (req.user.role === 'teacher') {
      // Учителя также имеют доступ (для упрощения)
      hasAccess = true;
    } else if (req.user.role === 'student') {
      // Студенты могут видеть только свой класс
      // Преобразуем оба classId к строкам для сравнения
      const userClassIdStr = String(req.user.classId);
      const requestedClassIdStr = String(classId);
      
      if (userClassIdStr === requestedClassIdStr) {
        hasAccess = true;
      } else {
        console.log('Отказ в доступе для студента:', {
          userClassId: userClassIdStr,
          requestedClassId: requestedClassIdStr
        });
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'У вас нет доступа к этим оценкам',
        details: {
          userRole: req.user.role,
          userClassId: req.user.classId,
          requestedClassId: classId
        }
      });
    }
    
    // Находим всех учеников в классе
    const students = await User.findAll({
      where: { 
        classId,
        role: 'student' 
      },
      attributes: ['id', 'name']
    });
    
    console.log(`Найдено ${students.length} студентов в классе ${classId}`);
    
    if (students.length === 0) {
      console.warn(`В классе ${classId} не найдено учеников`);
      return res.json([]);
    }
    
    const studentIds = students.map(student => student.id);
    
    // Проверяем, что дата имеет корректный формат
    let lessonDate;
    try {
      lessonDate = new Date(date);
      if (isNaN(lessonDate.getTime())) {
        console.error('Неверный формат даты:', date);
        return res.status(400).json({ message: 'Неверный формат даты' });
      }
    } catch (error) {
      console.error('Ошибка при парсинге даты:', error);
      return res.status(400).json({ message: 'Ошибка при парсинге даты' });
    }
    
    // Улучшенная обработка даты для более надежного сравнения
    // Преобразуем входящую дату в формат YYYY-MM-DD
    const year = lessonDate.getFullYear();
    const month = String(lessonDate.getMonth() + 1).padStart(2, '0');
    const day = String(lessonDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    console.log('Поиск оценок для даты:', formattedDate);
    console.log('Поиск оценок для предмета:', subject);
    console.log('ID студентов:', studentIds);
    
    // Используем оператор LIKE для более гибкого поиска по дате
    const { Op } = Sequelize;
    
    // Проверим, какие поля есть в таблице Grade
    const gradeAttributes = Object.keys(Grade.rawAttributes);
    console.log('Поля модели Grade:', gradeAttributes);
    
    // Получаем оценки для этого класса, по этому предмету, на эту дату
    const grades = await Grade.findAll({
      where: {
        studentId: studentIds,
        // Делаем поиск по предмету нечувствительным к регистру
        subject: {
          [Op.like]: subject // SQLite по умолчанию делает LIKE регистронезависимым
        },
        // Изменяем подход к фильтрации по дате
        // В SQLite нет функций для работы с датой, поэтому используем строковое сравнение
        // В дате формат может быть как с UTC (Z в конце), так и без него
        // Проверим наличие в базе оценок с разными форматами дат
        [Sequelize.Op.or]: [
          { date: formattedDate }, // Точное совпадение YYYY-MM-DD
          { date: `${formattedDate}T00:00:00.000Z` }, // С UTC и временем 00:00:00
          { date: { [Op.like]: `${formattedDate}%` } } // Начинается с YYYY-MM-DD
        ]
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
      order: [['id', 'ASC']]
    });
    
    console.log(`Найдено ${grades.length} оценок для даты ${formattedDate}`);
    
    // Если оценок не найдено, давайте проверим все оценки этих студентов, чтобы понять проблему
    if (grades.length === 0) {
      console.log('Проверка всех оценок для этих студентов:');
      const allGrades = await Grade.findAll({
        where: {
          studentId: studentIds
        },
        attributes: ['id', 'studentId', 'subject', 'date', 'value']
      });
      
      console.log(`Всего найдено ${allGrades.length} оценок для студентов`);
      console.log('Примеры оценок:');
      
      if (allGrades.length > 0) {
        // Выведем первые 5 оценок для примера
        allGrades.slice(0, 5).forEach(grade => {
          console.log({
            id: grade.id, 
            studentId: grade.studentId,
            subject: grade.subject,
            date: grade.date,
            value: grade.value
          });
        });
        
        // Проверим оценки, совпадающие по предмету
        const subjectGrades = allGrades.filter(grade => grade.subject === subject);
        console.log(`Оценок по предмету "${subject}": ${subjectGrades.length}`);
        
        if (subjectGrades.length > 0) {
          // Выведем даты этих оценок
          console.log('Даты оценок по предмету:');
          subjectGrades.forEach(grade => {
            console.log(`ID: ${grade.id}, Дата: ${grade.date}`);
          });
        }
      }
    }
    
    res.json(grades);
  } catch (error) {
    console.error('Ошибка при получении оценок по уроку:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
// Экспортируем функцию для использования в других файлах
module.exports.getClassRatings = getClassRatings; 