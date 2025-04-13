import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
  IconButton,
  Stack,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Chip,
  Tabs,
  Tab,
  Grid,
  Tooltip,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ru as ruLocale } from 'date-fns/locale';
import { 
  Delete as DeleteIcon, 
  ArrowLeft, 
  ArrowRight, 
  AutoAwesome, 
  School as SchoolIcon, 
  AccessTime as TimeIcon, 
  Room as RoomIcon,
  Menu as MenuIcon,
  AssignmentOutlined as AssignmentIcon,
  Today as TodayIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { getGrades, createGrade, deleteGrade, getClasses, getSubjects, getClassFinalGrades, User, Grade, Class, Subject, FinalGrade, getCurrentTrimester, getActiveTrimesters, Trimester, getTeacherSchedule, Schedule } from '../../services/api';
import FinalGradeEditor from '../../components/FinalGradeEditor';
import AutoFinalGradeCalculator from '../../components/AutoFinalGradeCalculator';
import { formatAcademicYear, getCurrentAcademicYear } from '../../utils/formatUtils';

const gradeTypeLabels: Record<string, string> = {
  TRIMESTER1: '1 триместр',
  TRIMESTER2: '2 триместр',
  TRIMESTER3: '3 триместр',
  YEAR: 'Годовая',
  ATTESTATION: 'Аттестат'
};

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

interface GradeDialogProps {
  grade: Grade | null;
  open: boolean;
  onClose: () => void;
}

const GradeDialog = ({ grade, open, onClose }: GradeDialogProps) => {
  if (!grade) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Детали оценки</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          <strong>Ученик:</strong> {grade.student.name}
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Предмет:</strong> {grade.subject}
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Оценка:</strong> {grade.value}
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Дата:</strong> {new Date(grade.date).toLocaleDateString()}
        </Typography>
        {grade.comment && (
          <Typography variant="body1" gutterBottom>
            <strong>Комментарий:</strong> {grade.comment}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface DeleteConfirmDialogProps {
  grade: Grade | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmDialog = ({ grade, open, onClose, onConfirm }: DeleteConfirmDialogProps) => {
  if (!grade) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Подтверждение удаления</DialogTitle>
      <DialogContent>
        <Typography>
          Вы действительно хотите удалить оценку {grade.value} по предмету {grade.subject} у ученика {grade.student.name}?
          Это действие нельзя отменить.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={onConfirm} color="error">
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface ScheduleTabProps {
  onScheduleLoad?: (schedule: Schedule[]) => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ onScheduleLoad }) => {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Названия дней недели
  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  useEffect(() => {
    loadSchedule();
  }, []);
  
  const loadSchedule = async () => {
    try {
      setLoadingSchedule(true);
      setScheduleError('');
      const data = await getTeacherSchedule();
      setSchedule(data);
      if (onScheduleLoad) {
        onScheduleLoad(data);
      }
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Ошибка загрузки расписания');
    } finally {
      setLoadingSchedule(false);
    }
  };
  
  // Получаем день недели для выбранной даты (1-6, где 1 - понедельник)
  const getSelectedDayOfWeek = (): number | null => {
    if (!selectedDate) return null;
    // getDay() возвращает 0-6, где 0 - воскресенье, нам нужно конвертировать в 1-6 (пн-сб)
    const day = selectedDate.getDay();
    return day === 0 ? null : day; // Если воскресенье, возвращаем null
  };
  
  // Получаем уроки для выбранного дня
  const getLessonsForSelectedDay = () => {
    const dayOfWeek = getSelectedDayOfWeek();
    if (dayOfWeek === null) return [];
    return schedule.filter(item => item.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.lessonNumber - b.lessonNumber);
  };
  
  // Группировка расписания по дням недели (для отображения всего расписания)
  const scheduleByDay = daysOfWeek.map((day, index) => {
    const dayIndex = index + 1; // Дни недели в БД нумеруются с 1
    const lessonsForDay = schedule.filter(item => item.dayOfWeek === dayIndex);
    return {
      day,
      dayIndex,
      lessons: lessonsForDay.sort((a, b) => a.lessonNumber - b.lessonNumber)
    };
  });
  
  if (loadingSchedule) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (scheduleError) {
    return (
      <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
        {scheduleError}
      </Alert>
    );
  }
  
  const selectedDayOfWeek = getSelectedDayOfWeek();
  const selectedDayName = selectedDayOfWeek !== null ? daysOfWeek[selectedDayOfWeek - 1] : 'Воскресенье';
  const lessonsForSelectedDay = getLessonsForSelectedDay();
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Моё расписание уроков
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: {xs: 'column', sm: 'row'}, gap: 2, alignItems: {xs: 'flex-start', sm: 'center'} }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
            <DatePicker
              label="Выберите дату"
              value={selectedDate}
              onChange={setSelectedDate}
              format="dd.MM.yyyy"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
          
          <Typography variant="subtitle1" sx={{ ml: 2 }}>
            {selectedDayName} {selectedDate && `, ${selectedDate.toLocaleDateString('ru-RU')}`}
          </Typography>
        </Box>
      </Box>
      
      {schedule.length === 0 ? (
        <Alert severity="info">
          У вас пока нет назначенных уроков в расписании
        </Alert>
      ) : selectedDayOfWeek === null ? (
        <Alert severity="info">
          В воскресенье уроки не проводятся
        </Alert>
      ) : lessonsForSelectedDay.length === 0 ? (
        <Alert severity="info">
          На этот день у вас нет назначенных уроков
        </Alert>
      ) : (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Расписание на {selectedDayName}:
          </Typography>
          
          <Paper sx={{ p: 2 }}>
            {lessonsForSelectedDay.map(lesson => (
              <Box 
                key={`${lesson.dayOfWeek}-${lesson.lessonNumber}`}
                sx={{ 
                  mb: 2, 
                  p: 2, 
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  boxShadow: 1
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {lesson.subject}
                  </Typography>
                  <Chip 
                    size="small" 
                    label={`Урок ${lesson.lessonNumber}`}
                    color="primary"
                  />
                </Box>
                
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SchoolIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">
                      Класс: {lesson.classId ? `${lesson.Class?.grade || ''}-${lesson.Class?.letter || ''}` : 'Не указан'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TimeIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">
                      Время: {lesson.startTime} - {lesson.endTime}
                    </Typography>
                  </Box>
                  
                  {lesson.classroom && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <RoomIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2">
                        Кабинет: {lesson.classroom}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            ))}
          </Paper>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Все расписание по дням недели:
            </Typography>
            
            <Grid container spacing={2}>
              {scheduleByDay.map(({ day, dayIndex, lessons }) => (
                <Grid item xs={12} md={6} lg={4} key={dayIndex}>
                  {lessons.length > 0 && (
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
                        {day}
                      </Typography>
                      
                      {lessons.map(lesson => (
                        <Box 
                          key={`${lesson.dayOfWeek}-${lesson.lessonNumber}`}
                          sx={{ 
                            mb: 2, 
                            p: 2, 
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                            boxShadow: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {lesson.subject}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={`Урок ${lesson.lessonNumber}`}
                              color="primary"
                            />
                          </Box>
                          
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <SchoolIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="body2">
                                Класс: {lesson.classId ? `${lesson.Class?.grade || ''}-${lesson.Class?.letter || ''}` : 'Не указан'}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TimeIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="body2">
                                Время: {lesson.startTime} - {lesson.endTime}
                              </Typography>
                            </Box>
                            
                            {lesson.classroom && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <RoomIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="body2">
                                  Кабинет: {lesson.classroom}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const TeacherDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [students, setStudents] = useState<User[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [finalGrades, setFinalGrades] = useState<FinalGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(getCurrentAcademicYear());
  const [editingCell, setEditingCell] = useState<{ studentId: string; date: string; value: string | number } | null>(null);
  const [finalGradeDialogOpen, setFinalGradeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [autoGradeDialogOpen, setAutoGradeDialogOpen] = useState(false);
  const [currentTrimester, setCurrentTrimester] = useState<Trimester | null>(null);
  const [activeTrimesters, setActiveTrimesters] = useState<Trimester[]>([]);
  const [loadingTrimesters, setLoadingTrimesters] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFinalGradeSubject, setSelectedFinalGradeSubject] = useState<string>('');
  const [gradesTabValue, setGradesTabValue] = useState(0);
  const [autoFinalGradeDialogOpen, setAutoFinalGradeDialogOpen] = useState(false);
  const [selectedStudentGrades, setSelectedStudentGrades] = useState<Grade[]>([]);
  const [mainTabValue, setMainTabValue] = useState(0);
  
  const [newGrade, setNewGrade] = useState({
    studentId: '',
    subject: '',
    value: 5 as number | string,
    date: new Date().toISOString().split('T')[0],
    comment: '',
  });

  // Для мобильного меню
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState<Schedule[]>([]);
  const [hasUpcomingLessons, setHasUpcomingLessons] = useState(false);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [loadedClasses, loadedSubjects] = await Promise.all([
        getClasses(),
        getSubjects(),
      ]);
      setClasses(loadedClasses);
      setSubjects(loadedSubjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadGrades = async () => {
    if (!selectedClass || !selectedSubject) return;
    
    try {
      setLoading(true);
      setError('');
      const allGrades = await getGrades();
      // Фильтруем оценки по выбранному классу и предмету
      const classStudents = classes.find(c => c.id === selectedClass)?.students || [];
      const studentIds = classStudents.map(student => student.id);
      
      const filteredGrades = allGrades.filter(grade => 
        studentIds.includes(grade.student.id) && 
        grade.subject === selectedSubject
      );
      
      setGrades(filteredGrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки оценок');
    } finally {
      setLoading(false);
    }
  };

  const loadFinalGrades = async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const loadedFinalGrades = await getClassFinalGrades(selectedClass);
      setFinalGrades(loadedFinalGrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки итоговых оценок');
    } finally {
      setLoading(false);
    }
  };

  const loadTrimesters = async () => {
    try {
      setLoadingTrimesters(true);
      const [current, active] = await Promise.all([
        getCurrentTrimester(),
        getActiveTrimesters()
      ]);
      setCurrentTrimester(current);
      setActiveTrimesters(active);
    } catch (err) {
      console.error('Ошибка при загрузке данных о триместрах:', err);
    } finally {
      setLoadingTrimesters(false);
    }
  };

  useEffect(() => {
    loadData();
    loadTrimesters();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadFinalGrades();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadGrades();
    }
  }, [selectedClass, selectedSubject]);

  useEffect(() => {
    if (selectedClass) {
      const classStudents = classes.find(c => c.id === selectedClass)?.students || [];
      setStudents(classStudents);
      setNewGrade(prev => ({
        ...prev,
        studentId: '',
        subject: ''
      }));
    } else {
      setStudents([]);
    }
  }, [selectedClass, classes]);

  const getAvailableSubjects = () => {
    if (!selectedClass) return subjects;
    const selectedClassGrade = classes.find(c => c.id === selectedClass)?.grade;
    if (!selectedClassGrade) return subjects;
    return subjects.filter(subject => subject.grades.includes(selectedClassGrade));
  };

  const handleAddGrade = async () => {
    try {
      if (!newGrade.studentId || !newGrade.subject) {
        setError('Необходимо выбрать ученика и предмет');
        return;
      }

      setLoading(true);
      setError('');
      const grade = await createGrade(newGrade);
      setGrades([grade, ...grades]);
      setNewGrade({
        studentId: '',
        subject: '',
        value: 5,
        date: new Date().toISOString().split('T')[0],
        comment: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении оценки');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeClick = (grade: Grade) => {
    if (isMobile) {
      setSelectedGrade(grade);
      setDialogOpen(true);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, grade: Grade) => {
    e.stopPropagation(); // Предотвращаем открытие диалога с деталями
    setGradeToDelete(grade);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!gradeToDelete) return;

    try {
      setLoading(true);
      setError('');
      await deleteGrade(gradeToDelete.id);
      setGrades(grades.filter(g => g.id !== gradeToDelete.id));
      setDeleteDialogOpen(false);
      setGradeToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении оценки');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (value: number | string) => {
    switch (value) {
      case 5:
        return '#1B5E20'; // Темно-зеленый
      case 4:
        return '#4CAF50'; // Зеленый
      case 3:
        return '#FFC107'; // Желтый
      case 2:
        return '#F44336'; // Красный
      case 1:
        return '#B71C1C'; // Темно-красный
      case 'Н':
        return '#9C27B0'; // Фиолетовый
      case 'У':
        return '#2196F3'; // Синий
      case 'О':
        return '#FF9800'; // Оранжевый
      default:
        // Проверяем, является ли строковое значение числом
        if (typeof value === 'string' && !isNaN(Number(value))) {
          return getGradeColor(Number(value));
        }
        return 'inherit';
    }
  };

  const handleOpenFinalGradeDialog = (student: { id: string; grade: number }, subject: string) => {
    setSelectedStudent(student.id);
    setSelectedFinalGradeSubject(subject);
    setFinalGradeDialogOpen(true);
  };

  const handleFinalGradeAdded = (grade: FinalGrade) => {
    setFinalGrades([...finalGrades, grade]);
  };

  const handleOpenAutoFinalGradeDialog = async (student: { id: string; grade: number }, subject: string) => {
    try {
      setLoading(true);
      // Загружаем все оценки студента для расчета
      const allGrades = await getGrades(student.id);
      setSelectedStudentGrades(allGrades);
      setSelectedStudent(student.id);
      setSelectedFinalGradeSubject(subject);
      setAutoFinalGradeDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке оценок');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalGradesAdded = (grades: FinalGrade[]) => {
    setFinalGrades([...finalGrades, ...grades]);
  };

  const handleGradesTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setGradesTabValue(newValue);
  };

  // Получаем количество дней в выбранном месяце
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Получаем массив дат для выбранного месяца
  const getDatesInMonth = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(currentYear, currentMonth, i + 1);
      return date;
    });
  };

  // Получаем оценку для конкретного ученика и даты
  const getGradeForStudentAndDate = (studentId: string, date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return grades.find(grade => 
      grade.student.id === studentId && 
      grade.date.split('T')[0] === dateString
    );
  };

  // Получаем название триместра по ID
  const getTrimesterName = (trimesterId?: string) => {
    if (!trimesterId || !activeTrimesters.length) return '';
    
    const trimester = activeTrimesters.find(t => t.id === trimesterId);
    return trimester ? gradeTypeLabels[trimester.type] : '';
  };

  // Обработчик изменения месяца
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Обработчик клика по ячейке таблицы
  const handleCellClick = (studentId: string, date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const existingGrade = getGradeForStudentAndDate(studentId, date);
    
    setEditingCell({
      studentId,
      date: dateString,
      value: existingGrade ? existingGrade.value : ''
    });
  };

  // Обработчик изменения значения в ячейке
  const handleCellValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingCell) return;
    
    const value = e.target.value;
    // Проверяем, что значение допустимо (1-5, Н, У, О)
    if (value === '' || /^[1-5]$/.test(value) || ['Н', 'У', 'О'].includes(value)) {
      setEditingCell({
        ...editingCell,
        value: value
      });
    }
  };

  // Обработчик сохранения оценки
  const handleSaveGrade = async () => {
    if (!editingCell || !selectedSubject) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Если значение пустое, не сохраняем
      if (!editingCell.value) {
        // Проверяем, существует ли уже оценка для этого ученика и даты
        const existingGrade = grades.find(grade => 
          grade.student.id === editingCell.studentId && 
          grade.date.split('T')[0] === editingCell.date
        );
        
        // Если оценка существует, удаляем её
        if (existingGrade) {
          await deleteGrade(existingGrade.id);
          setGrades(grades.filter(g => g.id !== existingGrade.id));
        }
        
        setEditingCell(null);
        return;
      }
      
      // Преобразуем значение в правильный тип
      let gradeValue: number | string = editingCell.value;
      if (/^[1-5]$/.test(String(gradeValue))) {
        gradeValue = Number(gradeValue);
      }
      
      // Проверяем, что значение допустимо
      if (typeof gradeValue === 'number' && (gradeValue < 1 || gradeValue > 5)) {
        setError('Оценка должна быть от 1 до 5');
        return;
      }
      
      if (typeof gradeValue === 'string' && !['Н', 'У', 'О'].includes(gradeValue)) {
        setError('Допустимые буквенные оценки: Н, У, О');
        return;
      }
      
      // Ищем триместр для даты оценки, но не блокируем сохранение, если триместр не найден
      let trimesterId = undefined;
      if (activeTrimesters.length > 0) {
        const gradeDate = new Date(editingCell.date);
        
        // Ищем триместр, к которому относится дата оценки
        const matchingTrimester = activeTrimesters.find(trimester => {
          const startDate = new Date(trimester.startDate);
          const endDate = new Date(trimester.endDate);
          return gradeDate >= startDate && gradeDate <= endDate;
        });
        
        // Если нашли подходящий триместр, используем его ID
        if (matchingTrimester) {
          trimesterId = matchingTrimester.id;
          console.log('Найден триместр для оценки:', matchingTrimester);
        } else {
          console.log('Триместр для даты не найден, оценка будет сохранена без привязки к триместру');
        }
      }
      
      console.log('Сохранение оценки:', {
        studentId: editingCell.studentId,
        subject: selectedSubject,
        value: gradeValue,
        date: editingCell.date,
        trimesterId
      });
      
      // Проверяем, существует ли уже оценка для этого ученика и даты
      const existingGrade = grades.find(grade => 
        grade.student.id === editingCell.studentId && 
        grade.date.split('T')[0] === editingCell.date
      );
      
      if (existingGrade) {
        // Удаляем существующую оценку
        await deleteGrade(existingGrade.id);
        
        // Создаем новую оценку
        const newGrade = await createGrade({
          studentId: editingCell.studentId,
          subject: selectedSubject,
          value: gradeValue,
          date: editingCell.date,
          comment: '',
          trimesterId
        });
        
        setGrades(grades.filter(g => g.id !== existingGrade.id).concat(newGrade));
      } else {
        // Создаем новую оценку
        const newGrade = await createGrade({
          studentId: editingCell.studentId,
          subject: selectedSubject,
          value: gradeValue,
          date: editingCell.date,
          comment: '',
          trimesterId
        });
        
        setGrades([...grades, newGrade]);
      }
      
      setEditingCell(null);
    } catch (err) {
      console.error('Ошибка при сохранении оценки:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении оценки');
      // Не сбрасываем редактирование при ошибке, чтобы пользователь мог исправить значение
    } finally {
      setLoading(false);
    }
  };

  // Обработчик отмены редактирования
  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  // Обработчик нажатия клавиш в ячейке
  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveGrade();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleMainTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMainTabValue(newValue);
  };

  // Добавляем функцию для проверки предстоящих уроков
  const checkUpcomingLessons = (schedule: Schedule[]) => {
    if (!schedule.length) return false;
    
    const now = new Date();
    const today = now.getDay() || 7; // Преобразуем 0 (воскресенье) в 7
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Проверяем есть ли уроки сегодня, которые еще не начались
    return schedule.some(lesson => {
      if (lesson.dayOfWeek !== today) return false;
      
      const [startHour, startMinute] = lesson.startTime.split(':').map(Number);
      return (startHour > currentHour) || 
             (startHour === currentHour && startMinute > currentMinute);
    });
  };
  
  // Обработчик для сохранения расписания
  const handleScheduleLoad = (schedule: Schedule[]) => {
    setTeacherSchedule(schedule);
    setHasUpcomingLessons(checkUpcomingLessons(schedule));
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const navigateTo = (tabValue: number) => {
    setMainTabValue(tabValue);
    setDrawerOpen(false);
  };

  // Мобильное боковое меню
  const drawer = (
    <Box>
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigateTo(0)}
            selected={mainTabValue === 0}
          >
            <ListItemIcon>
              <AssignmentIcon />
            </ListItemIcon>
            <ListItemText primary="Оценки" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigateTo(1)}
            selected={mainTabValue === 1}
          >
            <ListItemIcon>
              <EventIcon />
            </ListItemIcon>
            <ListItemText primary="Расписание" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  if (loading && !grades.length && !classes.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Мобильное меню */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Оставляем только кнопку мобильного меню */}
        {isMobile && (
          <Box sx={{ mb: 3 }}>
            <IconButton
              color="primary"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        <TabPanel value={mainTabValue} index={0}>
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h5" sx={{ p: 2, pb: 0 }}>
                Оценки
              </Typography>
              <Tabs value={gradesTabValue} onChange={handleGradesTabChange} sx={{ px: 2 }}>
                <Tab label="Текущие оценки" />
                <Tab label="Итоговые оценки" />
              </Tabs>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Оценки</Typography>
              {currentTrimester && (
                <Chip 
                  color="primary" 
                  label={`Текущий триместр: ${gradeTypeLabels[currentTrimester.type]} (${new Date(currentTrimester.startDate).toLocaleDateString()} - ${new Date(currentTrimester.endDate).toLocaleDateString()})`} 
                />
              )}
            </Box>

            <TabPanel value={gradesTabValue} index={0}>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Класс</InputLabel>
                      <Select
                        value={selectedClass}
                        label="Класс"
                        onChange={(e) => setSelectedClass(e.target.value)}
                        disabled={loading}
                      >
                        <MenuItem value="">
                          <em>Выберите класс</em>
                        </MenuItem>
                        {classes.map((cls) => (
                          <MenuItem key={cls.id} value={cls.id}>
                            {cls.grade}-{cls.letter}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Предмет</InputLabel>
                      <Select
                        value={selectedSubject}
                        label="Предмет"
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={loading || !selectedClass}
                      >
                        <MenuItem value="">
                          <em>Выберите предмет</em>
                        </MenuItem>
                        {getAvailableSubjects().map((subject) => (
                          <MenuItem key={subject.id} value={subject.name}>
                            {subject.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconButton onClick={handlePrevMonth} disabled={loading}>
                        <ArrowLeft />
                      </IconButton>
                      <Typography variant="h6" sx={{ mx: 2 }}>
                        {MONTHS[currentMonth]} {currentYear}
                      </Typography>
                      <IconButton onClick={handleNextMonth} disabled={loading}>
                        <ArrowRight />
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>

                {selectedClass && selectedSubject && (
                  <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ minWidth: 200, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>
                            Ученик
                          </TableCell>
                          {getDatesInMonth().map(date => (
                            <TableCell 
                              key={date.toISOString()} 
                              align="center"
                              sx={{ 
                                minWidth: 50,
                                bgcolor: date.getDay() === 0 || date.getDay() === 6 
                                  ? 'rgba(0, 0, 0, 0.04)' 
                                  : 'inherit'
                              }}
                            >
                              <Tooltip title={date.toLocaleDateString('ru-RU', { weekday: 'short' })}>
                                <Typography variant="body2">{date.getDate()}</Typography>
                              </Tooltip>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map(student => (
                          <TableRow key={student.id}>
                            <TableCell 
                              sx={{ 
                                position: 'sticky', 
                                left: 0, 
                                zIndex: 2,
                                bgcolor: 'background.paper'
                              }}
                            >
                              {student.name}
                            </TableCell>
                            {getDatesInMonth().map(date => {
                              const grade = getGradeForStudentAndDate(student.id, date);
                              const isEditing = editingCell && 
                                              editingCell.studentId === student.id && 
                                              editingCell.date === date.toISOString().split('T')[0];
                              
                              return (
                                <TableCell 
                                  key={date.toISOString()} 
                                  align="center" 
                                  onClick={() => !isEditing && handleCellClick(student.id, date)}
                                  sx={{ 
                                    cursor: 'pointer',
                                    bgcolor: date.getDay() === 0 || date.getDay() === 6 
                                      ? 'rgba(0, 0, 0, 0.04)' 
                                      : 'inherit',
                                    '&:hover': {
                                      bgcolor: 'rgba(0, 0, 0, 0.08)'
                                    }
                                  }}
                                >
                                  {isEditing ? (
                                    <Select
                                      autoFocus
                                      variant="standard"
                                      value={editingCell.value}
                                      onChange={(e) => {
                                        setEditingCell({
                                          ...editingCell,
                                          value: e.target.value
                                        });
                                      }}
                                      onBlur={handleSaveGrade}
                                      onKeyDown={handleCellKeyDown}
                                      sx={{ width: 50, minWidth: 50 }}
                                      MenuProps={{
                                        PaperProps: {
                                          style: {
                                            maxHeight: 200
                                          }
                                        }
                                      }}
                                    >
                                      <MenuItem value="">
                                        <em>-</em>
                                      </MenuItem>
                                      {[1, 2, 3, 4, 5].map((value) => (
                                        <MenuItem key={value} value={value}>
                                          {value}
                                        </MenuItem>
                                      ))}
                                      <Divider />
                                      <MenuItem value="Н">Н</MenuItem>
                                      <MenuItem value="У">У</MenuItem>
                                      <MenuItem value="О">О</MenuItem>
                                    </Select>
                                  ) : grade ? (
                                    <Tooltip 
                                      title={
                                        grade.trimesterId 
                                          ? `${getTrimesterName(grade.trimesterId)}${grade.comment ? `: ${grade.comment}` : ''}`
                                          : grade.comment || ''
                                      }
                                    >
                                      <Chip
                                        label={grade.value}
                                        size="small"
                                        sx={{
                                          fontWeight: 'bold',
                                          bgcolor: getGradeColor(grade.value),
                                          color: 'white',
                                          minWidth: 32,
                                          height: 24
                                        }}
                                      />
                                    </Tooltip>
                                  ) : null}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {!selectedClass && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Выберите класс и предмет для отображения таблицы оценок
                  </Alert>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={gradesTabValue} index={1}>
              <Box sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Класс</InputLabel>
                    <Select
                      value={selectedClass}
                      label="Класс"
                      onChange={(e) => setSelectedClass(e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="">
                        <em>Выберите класс</em>
                      </MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>
                          {cls.grade}-{cls.letter}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                {selectedClass && (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Ученик</TableCell>
                          {getAvailableSubjects().map(subject => (
                            <TableCell key={subject.name}>{subject.name}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map(student => (
                          <TableRow key={student.id}>
                            <TableCell>{student.name}</TableCell>
                            {getAvailableSubjects().map(subject => {
                              const studentFinalGrades = finalGrades.filter(
                                g => g.studentId === Number(student.id) && g.subject === subject.name
                              );
                              
                              return (
                                <TableCell key={subject.name}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {['TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3', 'YEAR', 'ATTESTATION'].map(type => {
                                      const grade = studentFinalGrades.find(g => g.gradeType === type);
                                      return grade ? (
                                        <Chip
                                          key={type}
                                          label={`${gradeTypeLabels[type]}: ${grade.value}`}
                                          size="small"
                                          sx={{
                                            bgcolor: getGradeColor(grade.value),
                                            color: 'white'
                                          }}
                                        />
                                      ) : null;
                                    })}
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleOpenFinalGradeDialog(
                                          { 
                                            id: student.id, 
                                            grade: classes.find(c => c.id === selectedClass)?.grade || 0 
                                          },
                                          subject.name
                                        )}
                                      >
                                        Выставить вручную
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color="secondary"
                                        startIcon={<AutoAwesome />}
                                        onClick={() => handleOpenAutoFinalGradeDialog(
                                          { 
                                            id: student.id, 
                                            grade: classes.find(c => c.id === selectedClass)?.grade || 0 
                                          },
                                          subject.name
                                        )}
                                      >
                                        Авто
                                      </Button>
                                    </Box>
                                  </Box>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>
          </Paper>
        </TabPanel>

        <TabPanel value={mainTabValue} index={1}>
          <Paper sx={{ mb: 3 }}>
            <ScheduleTab onScheduleLoad={handleScheduleLoad} />
          </Paper>
        </TabPanel>

        <GradeDialog
          grade={selectedGrade}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />

        <DeleteConfirmDialog
          grade={gradeToDelete}
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
        />

        <FinalGradeEditor
          open={finalGradeDialogOpen}
          onClose={() => setFinalGradeDialogOpen(false)}
          onGradeAdded={handleFinalGradeAdded}
          studentId={selectedStudent}
          subject={selectedFinalGradeSubject}
          studentGrade={5}
          currentYear={currentYear}
        />

        <AutoFinalGradeCalculator
          open={autoFinalGradeDialogOpen}
          onClose={() => setAutoFinalGradeDialogOpen(false)}
          onGradesAdded={handleFinalGradesAdded}
          studentId={selectedStudent}
          subject={selectedFinalGradeSubject}
          studentGrade={5}
          currentYear={currentYear}
          studentGrades={selectedStudentGrades}
          existingFinalGrades={finalGrades.filter(g => g.studentId === Number(selectedStudent))}
        />
      </Box>
    </Box>
  );
};

export default TeacherDashboard; 