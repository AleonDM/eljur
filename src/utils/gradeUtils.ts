import { getSchoolSettings } from '../services/api';

/**
 * Утилиты для работы с оценками в системе
 */

// Кэшированное значение порога округления
let cachedRoundingThreshold: number | null = null;

/**
 * Получает порог округления оценок из настроек школы
 * @returns Порог округления (от 0.01 до 0.99)
 */
export const getGradeRoundingThreshold = async (): Promise<number> => {
  try {
    // Если есть кэшированное значение, возвращаем его
    if (cachedRoundingThreshold !== null) {
      return cachedRoundingThreshold;
    }
    
    // Иначе получаем настройки из API
    const settings = await getSchoolSettings();
    
    // Проверяем, что значение в допустимом диапазоне
    const threshold = settings?.gradeRoundingThreshold ?? 0.5;
    cachedRoundingThreshold = Math.min(Math.max(0.01, threshold), 0.99);
    
    return cachedRoundingThreshold;
  } catch (error) {
    console.error('Ошибка при получении настроек округления:', error);
    return 0.5; // Возвращаем значение по умолчанию в случае ошибки
  }
};

/**
 * Сбрасывает кэш порога округления оценок
 */
export const resetGradeRoundingThresholdCache = (): void => {
  cachedRoundingThreshold = null;
};

/**
 * Округляет оценку согласно заданному порогу
 * @param grade Оценка, которую нужно округлить (может быть числом или строкой)
 * @param threshold Порог округления (от 0.01 до 0.99)
 * @returns Округленное значение оценки
 */
export const roundGrade = (grade: number | string, threshold: number = 0.5): number => {
  // Если оценка - строка (например "Н", "У"), возвращаем ее без изменений
  if (typeof grade === 'string') {
    return NaN;
  }

  // Проверяем, что grade - число
  if (typeof grade !== 'number' || isNaN(grade)) {
    return NaN;
  }

  // Проверяем, что threshold в допустимом диапазоне
  const validThreshold = Math.min(Math.max(0.01, threshold), 0.99);
  
  // Получаем целую и дробную части
  const integerPart = Math.floor(grade);
  const fractionalPart = grade - integerPart;
  
  // Округляем в зависимости от порога
  if (fractionalPart >= validThreshold) {
    return integerPart + 1;
  } else {
    return integerPart;
  }
};

/**
 * Форматирует оценку для отображения в интерфейсе
 * @param grade Оценка (число или строка)
 * @returns Отформатированная строка
 */
export const formatGrade = (grade: number | string): string => {
  if (typeof grade === 'string') {
    return grade;
  }
  if (grade % 1 === 0) {
    return grade.toString();
  }
  return grade.toFixed(2);
};

/**
 * Проверяет, является ли оценка положительной (3, 4, 5)
 * @param grade Оценка для проверки
 * @returns true, если оценка положительная
 */
export const isPositiveGrade = (grade: number | string): boolean => {
  if (typeof grade === 'string') {
    return false; // Н, У не считаются положительными оценками
  }
  return grade >= 3;
};

/**
 * Возвращает цвет для отображения оценки
 * @param grade Оценка
 * @returns CSS-цвет для отображения
 */
export const getGradeColor = (grade: number | string): string => {
  if (typeof grade === 'string') {
    return '#9E9E9E'; // Серый для специальных отметок
  }
  
  if (grade >= 4.5) return '#1B5E20'; // Темно-зеленый
  if (grade >= 4) return '#4CAF50'; // Зеленый
  if (grade >= 3.5) return '#8BC34A'; // Светло-зеленый
  if (grade >= 3) return '#FFC107'; // Желтый
  if (grade >= 2.5) return '#FF9800'; // Оранжевый
  return '#F44336'; // Красный
}; 