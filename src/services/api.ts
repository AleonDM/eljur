import axios from 'axios';
import { UserRole } from '../store/slices/authSlice';

const api = axios.create({
  baseURL: 'http://localhost:3001',
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
      throw new Error(error.response.data.message || 'Произошла ошибка');
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
  startTime: string;
  endTime: string;
  name: string;
  isTemplate: boolean;
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
  const response = await api.get<Homework[]>(`/api/homework/class/${classId}`);
  return response.data;
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

export const getSchedule = async (classId: string): Promise<Schedule[]> => {
  const response = await api.get<Schedule[]>(`/api/schedule/class/${classId}`);
  return response.data;
};

export const updateSchedule = async (classId: string, schedule: Omit<Schedule, 'id' | 'name' | 'isTemplate'>[]) => {
  const response = await api.post<Schedule[]>(`/api/schedule/class/${classId}`, { schedule });
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
}) => {
  const response = await api.put('/api/schedule/settings', settings);
  return response.data;
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