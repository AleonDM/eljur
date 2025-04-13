import axios from 'axios';
import { UserRole } from '../store/slices/authSlice';
import { resetGradeRoundingThresholdCache } from '../utils/gradeUtils';

// Получаем URL API из переменных окружения или используем localhost для разработки
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
});

// Добавляем перехватчик для установки токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Добавляем перехватчик ответов для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Создаем более информативное сообщение об ошибке с кодом статуса
      const statusCode = error.response.status;
      const message = error.response.data.message || 'Произошла ошибка';
      throw new Error(`${statusCode}: ${message}`);
    }
    throw new Error('Ошибка сети');
  }
);

// Экспортируем настроенный экземпляр axios для использования в компонентах
export { api as axios };

interface LoginResponse {
  user: {
    id: string;
    username: string;
    name: string;
    role: UserRole;
  };
  token: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  classId?: string | null;
}

export interface Grade {
  id: string;
  subject: string;
  value: number | string;
  date: string;
  student: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
  };
  comment?: string;
  trimesterId?: string;
}

export interface Class {
  id: string;
  grade: number;
  letter: string;
  students?: User[];
}

export interface Subject {
  id: string;
  name: string;
  grades: number[];
}

export interface Homework {
  id: number;
  subject: string;
  description: string;
  dueDate: string;
  classId: string;
  teacherId: string;
  teacher: {
    id: string;
    name: string;
  };
}

export interface SchoolSettings {
  lessonDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  longBreakAfterLesson: number;
  firstLessonStart: string;
  secondShiftStart: string;
  gradeRoundingThreshold: number;
}

export interface Schedule {
  id?: number;
  classId: number;
  dayOfWeek: number;
  lessonNumber: number;
  subject: string;
  teacherId?: string | null;
  teacher?: {
    id: string;
    name: string;
  };
  Class?: {
    id: string;
    grade: number;
    letter: string;
  };
  startTime: string;
  endTime: string;
  name: string;
  isTemplate: boolean;
  classroom?: string;
  date?: string;
}

export interface FinalGrade {
  id: number;
  studentId: number;
  teacherId: number;
  subject: string;
  gradeType: 'TRIMESTER1' | 'TRIMESTER2' | 'TRIMESTER3' | 'YEAR' | 'ATTESTATION';
  value: number;
  year: number;
  comment?: string;
  student?: {
    id: number;
    name: string;
  };
  teacher?: {
    id: number;
    name: string;
  };
}

export interface Trimester {
  id: string;
  type: 'TRIMESTER1' | 'TRIMESTER2' | 'TRIMESTER3';
  startDate: string;
  endDate: string;
  academicYear: number;
  isActive: boolean;
}

export interface StudentRating {
  studentId: number;
  studentName: string;
  averageGrade: number;
  subjectGrades: {
    [subject: string]: number;
  };
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/api/auth/login', {
    username,
    password,
  });
  return response.data;
};

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>('/api/users');
  return response.data;
};

export const getStudents = async (): Promise<User[]> => {
  const response = await api.get<User[]>('/api/users/students');
  return response.data;
};

export const createUser = async (userData: {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<User> => {
  const response = await api.post<User>('/api/users', userData);
  return response.data;
};

export const getGrades = async (studentId?: string): Promise<Grade[]> => {
  const url = studentId ? `/api/grades?studentId=${studentId}` : '/api/grades';
  const response = await api.get<Grade[]>(url);
  return response.data;
};

export const getGradesByLesson = async (subject: string, date: Date, classId: string): Promise<Grade[]> => {
  try {
    // Проверяем входные параметры
    if (!subject || !date || !classId) {
      console.error('getGradesByLesson: не все параметры указаны', { subject, date, classId });
      return [];
    }
    
    // Форматируем дату в строку YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    const url = `/api/grades/by-lesson?subject=${encodeURIComponent(subject)}&date=${formattedDate}&classId=${classId}`;
    console.log(`Запрос оценок: ${url}`);
    
    const response = await api.get<Grade[]>(url);
    console.log(`Получено ${response.data.length} оценок по запросу`);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении оценок по уроку:', error);
    throw error;
  }
};

export const createGrade = async (data: {
  studentId: string;
  subject: string;
  value: number | string;
  date: string;
  comment?: string;
  trimesterId?: string;
}): Promise<Grade> => {
  const response = await api.post('/api/grades', data);
  return response.data;
};

export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/api/users/${userId}`);
};

export const deleteGrade = async (gradeId: string): Promise<void> => {
  await api.delete(`/api/grades/${gradeId}`);
};

export const getClasses = async (): Promise<Class[]> => {
  const response = await api.get<Class[]>('/api/classes');
  return response.data;
};

export const createClass = async (data: { grade: number; letter: string }): Promise<Class> => {
  const response = await api.post<Class>('/api/classes', data);
  return response.data;
};

export const deleteClass = async (classId: string): Promise<void> => {
  await api.delete(`/api/classes/${classId}`);
};

export const assignStudentToClass = async (userId: string, classId: string | null): Promise<User> => {
  const response = await api.put<User>(`/api/users/${userId}/class`, { classId });
  return response.data;
};

export const getSubjects = async (): Promise<Subject[]> => {
  const response = await api.get<Subject[]>('/api/subjects');
  return response.data;
};

export const createSubject = async (name: string, grades: number[]): Promise<Subject> => {
  const response = await api.post<Subject>('/api/subjects', { name, grades });
  return response.data;
};

export const updateSubjectGrades = async (subjectId: string, grades: number[]): Promise<Subject> => {
  const response = await api.put<Subject>(`/api/subjects/${subjectId}`, { grades });
  return response.data;
};

export const deleteSubject = async (subjectId: string): Promise<void> => {
  await api.delete(`/api/subjects/${subjectId}`);
};

export const getHomework = async (classId: string): Promise<Homework[]> => {
  try {
    if (!classId) {
      console.error('getHomework: classId не указан');
      return [];
    }
    
    const url = `/api/homework/class/${classId}`;
    console.log(`Запрос домашних заданий: ${url}`);
    const response = await api.get<Homework[]>(url);
    console.log(`Получено ${response.data.length} домашних заданий`);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении домашних заданий:', error);
    throw error;
  }
};

export const createHomework = async (homework: {
  classId: string;
  subject: string;
  description: string;
  dueDate: string;
}): Promise<Homework> => {
  const response = await api.post<Homework>('/api/homework', homework);
  return response.data;
};

export const deleteHomework = async (id: number): Promise<void> => {
  await api.delete(`/api/homework/${id}`);
};

export const getSchedule = async (classId: string, date?: string): Promise<Schedule[]> => {
  if (!classId) {
    console.error('getSchedule: classId не указан');
    return [];
  }
  
  try {
    let url = `/api/schedule/class/${classId}`;
    if (date) {
      url += `?date=${date}`;
    }
    console.log(`Запрос расписания: ${url}`);
    const response = await api.get(url);
    console.log(`Получено ${response.data.length} записей расписания`);
    return response.data;
  } catch (error) {
    console.error('Ошибка в getSchedule:', error);
    throw error;
  }
};

export const getScheduleByDate = async (date: string, classId?: string): Promise<Schedule[]> => {
  if (!date) {
    console.error('getScheduleByDate: дата не указана');
    return [];
  }
  
  try {
    let url = `/api/schedule/date/${date}`;
    if (classId) {
      url += `?classId=${classId}`;
    }
    console.log(`Запрос расписания по дате: ${url}`);
    const response = await api.get(url);
    console.log(`Получено ${response.data.length} записей расписания по дате`);
    return response.data;
  } catch (error) {
    console.error('Ошибка в getScheduleByDate:', error);
    throw error;
  }
};

export const getTeacherSchedule = async (date?: string): Promise<Schedule[]> => {
  let url = '/api/schedule/teacher';
  if (date) {
    url += `?date=${date}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const updateSchedule = async (classId: string, schedule: Omit<Schedule, 'id' | 'name' | 'isTemplate'>[], date?: string) => {
  const response = await api.post(`/api/schedule/class/${classId}`, { 
    schedule,
    date
  });
  return response.data;
};

export const getScheduleTemplates = async (): Promise<Schedule[]> => {
  const response = await api.get<Schedule[]>('/api/schedule/templates');
  return response.data;
};

export const createScheduleTemplate = async (name: string, schedule: Omit<Schedule, 'id' | 'isTemplate'>[]) => {
  const response = await api.post<Schedule[]>('/api/schedule/templates', { name, schedule });
  return response.data;
};

export const deleteScheduleTemplate = async (name: string): Promise<void> => {
  await api.delete(`/api/schedule/templates/${name}`);
};

export const getSchoolSettings = async () => {
  const response = await api.get('/api/schedule/settings');
  return response.data;
};

export const updateSchoolSettings = async (settings: {
  lessonDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  longBreakAfterLesson: number;
  firstLessonStart: string;
  secondShiftStart: string;
  gradeRoundingThreshold: number;
}) => {
  try {
    const response = await api.put('/api/schedule/settings', settings);
    
    // Сбрасываем кэш порога округления после обновления настроек
    resetGradeRoundingThresholdCache();
    
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении настроек школы:', error);
    throw error;
  }
};

export const getFinalGrades = async (studentId: string): Promise<FinalGrade[]> => {
  const response = await api.get<FinalGrade[]>(`/api/final-grades/student/${studentId}`);
  return response.data;
};

export const getClassFinalGrades = async (classId: string): Promise<FinalGrade[]> => {
  const response = await api.get<FinalGrade[]>(`/api/final-grades/class/${classId}`);
  return response.data;
};

export const createFinalGrade = async (data: {
  studentId: string;
  subject: string;
  gradeType: FinalGrade['gradeType'];
  value: number;
  year: number;
  comment?: string;
}): Promise<FinalGrade> => {
  const response = await api.post<FinalGrade>('/api/final-grades', data);
  return response.data;
};

export const updateFinalGrade = async (
  id: number,
  data: { value: number; comment?: string }
): Promise<FinalGrade> => {
  const response = await api.put<FinalGrade>(`/api/final-grades/${id}`, data);
  return response.data;
};

export const getTrimesters = async (): Promise<Trimester[]> => {
  const response = await api.get('/api/trimesters');
  return response.data;
};

export const getActiveTrimesters = async (): Promise<Trimester[]> => {
  const response = await api.get('/api/trimesters/active');
  return response.data;
};

export const getCurrentTrimester = async (): Promise<Trimester> => {
  const response = await api.get('/api/trimesters/current');
  return response.data;
};

export const createTrimester = async (trimesterData: Omit<Trimester, 'id'>): Promise<Trimester> => {
  const response = await api.post('/api/trimesters', trimesterData);
  return response.data;
};

export const updateTrimester = async (id: string, trimesterData: Partial<Omit<Trimester, 'id'>>): Promise<Trimester> => {
  const response = await api.put(`/api/trimesters/${id}`, trimesterData);
  return response.data;
};

export const deleteTrimester = async (id: string): Promise<void> => {
  await api.delete(`/api/trimesters/${id}`);
};

export const getClassRatings = async (classId: string): Promise<StudentRating[]> => {
  const response = await api.get<StudentRating[]>(`/api/ratings/class/${classId}`);
  return response.data;
}; 