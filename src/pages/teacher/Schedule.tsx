import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ru as ruLocale } from 'date-fns/locale';
import { 
  School as SchoolIcon, 
  AccessTime as TimeIcon, 
  Room as RoomIcon,
  CalendarMonth,
  ViewWeek,
  MenuBook as MenuBookIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { getTeacherSchedule, getGradesByLesson, getHomework, Schedule, Grade, Homework } from '../../services/api';
import { format } from 'date-fns';

enum ViewMode {
  ByDate = 'by-date',
  ByWeek = 'by-week'
}

// Интерфейс для детализации урока
interface LessonDetailDialogProps {
  open: boolean;
  onClose: () => void;
  lesson: Schedule | null;
  date: Date | null;
}

// Компонент диалога с деталями урока
const LessonDetailDialog: React.FC<LessonDetailDialogProps> = ({ open, onClose, lesson, date }) => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (open && lesson && date) {
      loadData();
    }
  }, [open, lesson, date]);
  
  const loadData = async () => {
    if (!lesson || !lesson.classId || !date) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем домашние задания для класса - преобразуем числовое значение в строку
      const homeworkData = await getHomework(String(lesson.classId));
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Фильтруем домашние задания по предмету и дате
      const filteredHomework = homeworkData.filter(hw => {
        const hwDate = format(new Date(hw.dueDate), 'yyyy-MM-dd');
        return hw.subject === lesson.subject && hwDate === formattedDate;
      });
      
      setHomework(filteredHomework);
      
      // Загружаем оценки по уроку - преобразуем числовое значение в строку
      const gradesData = await getGradesByLesson(lesson.subject, date, String(lesson.classId));
      setGrades(gradesData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };
  
  // Получение цвета для оценки
  const getGradeColor = (value: string | number) => {
    // Преобразуем числовые значения в строки для сравнения
    const strValue = String(value);
    
    if (strValue === '5') return 'success.main';
    if (strValue === '4') return 'info.main';
    if (strValue === '3') return 'warning.main';
    if (strValue === '2' || strValue === '1') return 'error.main';
    return 'text.primary';
  };
  
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  if (!lesson) return null;
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {lesson.subject} (Урок {lesson.lessonNumber})
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Информация об уроке:
            </Typography>
            
            <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary">Время</Typography>
                  <Typography variant="body2">{lesson.startTime} - {lesson.endTime}</Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary">Класс</Typography>
                  <Typography variant="body2">
                    {lesson.classId && lesson.Class ? `${lesson.Class.grade}-${lesson.Class.letter}` : 'Не указан'}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary">Кабинет</Typography>
                  <Typography variant="body2">{lesson.classroom || 'Не указан'}</Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary">Дата</Typography>
                  <Typography variant="body2">
                    {date ? format(date, 'dd.MM.yyyy') : 'Не указана'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MenuBookIcon sx={{ mr: 1 }} /> Домашнее задание
              </Typography>
              {homework.length > 0 ? (
                homework.map(hw => (
                  <Card key={hw.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Учитель: {hw.teacher.name}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {hw.description}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert severity="info">
                  Домашнее задание не задано на эту дату
                </Alert>
              )}
            </Box>
            
            <Box>
              <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <GradeIcon sx={{ mr: 1 }} /> Оценки
              </Typography>
              {grades.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ученик</TableCell>
                        <TableCell>Оценка</TableCell>
                        <TableCell>Комментарий</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grades.map(grade => (
                        <TableRow key={grade.id}>
                          <TableCell>{grade.student?.name}</TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                color: getGradeColor(grade.value),
                                fontWeight: 'bold'
                              }}
                            >
                              {grade.value}
                            </Typography>
                          </TableCell>
                          <TableCell>{grade.comment || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  Нет оценок за этот урок
                </Alert>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TeacherSchedule = () => {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ByWeek);
  const [selectedLesson, setSelectedLesson] = useState<Schedule | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Названия дней недели
  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  useEffect(() => {
    loadSchedule();
  }, [selectedDate, viewMode]);
  
  // Функция для сокращения имени учителя на мобильных устройствах
  const formatTeacherName = (name: string) => {
    if (!isMobile) return name;
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0];
    
    // Фамилия полностью, от имени и отчества - только первые буквы
    const lastName = parts[0];
    const initials = parts.slice(1).map(part => part[0] ? part[0] + '.' : '').join('');
    
    return `${lastName} ${initials}`;
  };
  
  const loadSchedule = async () => {
    try {
      setLoadingSchedule(true);
      setScheduleError('');
      
      let data: Schedule[];
      if (viewMode === ViewMode.ByDate && selectedDate) {
        // Загружаем расписание для конкретной даты
        const formattedDate = selectedDate.toISOString().split('T')[0];
        data = await getTeacherSchedule(formattedDate);
      } else {
        // Загружаем обычное расписание
        data = await getTeacherSchedule();
      }
      
      setSchedule(data);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Ошибка загрузки расписания');
    } finally {
      setLoadingSchedule(false);
    }
  };
  
  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };
  
  // Получаем день недели для выбранной даты (1-6, где 1 - понедельник)
  const getSelectedDayOfWeek = () => {
    if (!selectedDate) return null;
    // getDay() возвращает 0-6, где 0 - воскресенье, нам нужно конвертировать в 1-6 (пн-сб)
    const day = selectedDate.getDay();
    return day === 0 ? null : day; // Если воскресенье, возвращаем null
  };
  
  // Получаем уроки для выбранного дня
  const getLessonsForSelectedDay = () => {
    if (viewMode === ViewMode.ByDate) {
      // Если выбрана работа по датам, возвращаем все расписание
      return schedule.sort((a, b) => a.lessonNumber - b.lessonNumber);
    } else {
      // Иначе фильтруем по дню недели
      const dayOfWeek = getSelectedDayOfWeek();
      if (dayOfWeek === null) return [];
      return schedule.filter(item => item.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.lessonNumber - b.lessonNumber);
    }
  };
  
  // Группировка расписания по дням недели
  const getScheduleByDays = () => {
    const result = [];
    
    for (let i = 1; i <= 6; i++) {
      const lessons = schedule.filter(item => item.dayOfWeek === i)
        .sort((a, b) => a.lessonNumber - b.lessonNumber);
      
      if (lessons.length > 0) {
        result.push({
          dayIndex: i,
          day: daysOfWeek[i - 1],
          lessons
        });
      }
    }
    
    return result;
  };
  
  const scheduleByDay = getScheduleByDays();
  const lessonsForSelectedDay = getLessonsForSelectedDay();
  
  const handleLessonClick = (lesson: Schedule) => {
    setSelectedLesson(lesson);
    setDetailDialogOpen(true);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Расписание учителя
      </Typography>
      
      {scheduleError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {scheduleError}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="режим просмотра"
              fullWidth
              size={isMobile ? "small" : "medium"}
            >
              <ToggleButton value={ViewMode.ByWeek}>
                <ViewWeek sx={{ mr: 1 }} />
                На неделю
              </ToggleButton>
              <ToggleButton value={ViewMode.ByDate}>
                <CalendarMonth sx={{ mr: 1 }} />
                На дату
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          
          {viewMode === ViewMode.ByDate && (
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
                <DatePicker
                  label="Выберите дату"
                  value={selectedDate}
                  onChange={(newDate) => setSelectedDate(newDate)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {loadingSchedule ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : viewMode === ViewMode.ByDate ? (
        // Отображение по дате
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Расписание на {selectedDate?.toLocaleDateString('ru-RU')}
          </Typography>
          
          {lessonsForSelectedDay.length === 0 ? (
            <Alert severity="info">На выбранную дату нет уроков</Alert>
          ) : (
            <Stack spacing={2}>
              {lessonsForSelectedDay.map(lesson => (
                <Paper 
                  key={`${lesson.dayOfWeek}-${lesson.lessonNumber}`} 
                  sx={{ 
                    p: 2, 
                    '&:hover': { bgcolor: 'action.hover' },
                    cursor: 'pointer'
                  }}
                  onClick={() => handleLessonClick(lesson)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6">{lesson.subject}</Typography>
                    <Chip 
                      color="primary" 
                      label={`Урок ${lesson.lessonNumber}`} 
                      size="small" 
                    />
                  </Box>
                  
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SchoolIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2">
                        Класс: {lesson.classId ? `${lesson.Class?.grade || ''}-${lesson.Class?.letter || ''}` : '-'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TimeIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2">
                        Время: {lesson.startTime} - {lesson.endTime}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <RoomIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2">
                        Кабинет: {lesson.classroom || '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      ) : (
        // Отображение по неделе
        <>
          <Typography variant="h6" gutterBottom>
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
                          boxShadow: 1,
                          '&:hover': { bgcolor: 'action.hover' },
                          cursor: 'pointer'
                        }}
                        onClick={() => handleLessonClick(lesson)}
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
        </>
      )}
      
      <LessonDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        lesson={selectedLesson}
        date={selectedDate}
      />
    </Box>
  );
};

export default TeacherSchedule; 