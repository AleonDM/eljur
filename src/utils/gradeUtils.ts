import { getSchoolSettings } from '../services/api';

/**
 * Утилиты для работы с оценками в системе
 */

// Кэшированное значение порога округления
let cachedThreshold: number | null = null;

/**
 * Получает порог округления оценок из настроек школы
 * @returns Порог округления (от 0.01 до 0.99)
 */
export async function getGradeRoundingThreshold(): Promise<number> {
  if (cachedThreshold !== null) {
    return cachedThreshold;
  }

  try {
    const settings = await getSchoolSettings();
    
    if (settings && typeof settings.gradeRoundingThreshold === 'number' && 
        settings.gradeRoundingThreshold >= 0 && settings.gradeRoundingThreshold <= 0.99) {
      cachedThreshold = settings.gradeRoundingThreshold;
      return settings.gradeRoundingThreshold;
    }
  } catch (error) {
    console.error('Ошибка при получении настроек округления оценок:', error);
  }
  
  return 0.5;
}

/**
 * Сбрасывает кэш порога округления оценок
 */
export const resetGradeRoundingThresholdCache = (): void => {
  cachedThreshold = null;
};

/**
 * Округляет оценку согласно заданному порогу
 * @param grade Оценка, которую нужно округлить (может быть числом или строкой)
 * @param threshold Порог округления (от 0.01 до 0.99)
 * @returns Округленное значение оценки
 */
export function roundGrade(grade: number, threshold: number = 0.5): number {
  if (typeof grade !== 'number') {
    return grade;
  }
  
  if (typeof threshold !== 'number' || threshold < 0 || threshold > 0.99) {
    threshold = 0.5;
  }
  
  const integerPart = Math.floor(grade);
  const decimalPart = grade - integerPart;
  
  if (decimalPart >= threshold) {
    return integerPart + 1;
  } else {
    return integerPart;
  }
}

/**
 * Форматирует оценку для отображения в интерфейсе
 * @param grade Оценка (число или строка)
 * @returns Отформатированная строка
 */
export function formatGrade(grade: number | string): string {
  if (typeof grade === 'string') {
    return grade;
  }
  
  return grade % 1 === 0 ? grade.toString() : grade.toFixed(2);
}

/**
 * Проверяет, является ли оценка положительной (3, 4, 5)
 * @param grade Оценка для проверки
 * @returns true, если оценка положительная
 */
export function isPositiveGrade(grade: number | string): boolean {
  if (typeof grade === 'string') {
    if (['Н', 'У', 'О'].includes(grade)) {
      return false;
    }
    
    grade = parseFloat(grade);
    if (isNaN(grade)) return false;
  }
  
  return grade >= 3;
}

/**
 * Возвращает цвет для отображения оценки
 * @param grade Оценка
 * @returns CSS-цвет для отображения
 */
export function getGradeColor(grade: number | string): string {
  if (typeof grade === 'string') {
    return '#9E9E9E';
  }
  
  if (grade >= 4.5) return '#1B5E20';
  if (grade >= 4) return '#4CAF50';
  if (grade >= 3.5) return '#8BC34A';
  if (grade >= 3) return '#FFC107';
  if (grade >= 2.5) return '#FF9800';
  return '#F44336';
} 