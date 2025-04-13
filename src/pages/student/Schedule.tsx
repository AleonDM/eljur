import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Box, 
  Alert, 
  CircularProgress, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
  useTheme,
  Divider,
  Card,
  CardContent,
  AlertTitle,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getSchedule, getScheduleByDate, getClasses, getHomework, getGradesByLesson, Grade } from '../../services/api';
import type { Schedule, Class, Homework } from '../../services/api';
import { Person as PersonIcon, CalendarMonth, ViewList, MenuBook as MenuBookIcon, Grade as GradeIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru as ruLocale } from 'date-fns/locale';
import { format } from 'date-fns';

const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

enum ViewMode {
  ByDate = 'by-date',
  ByWeek = 'by-week'
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Интерфейс для детализации урока
interface LessonDetailDialogProps {
  open: boolean;
  onClose: () => void;
  lesson: Schedule | null;
  classId: string;
  date: Date | null;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
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

// Компонент диалога с деталями урока
const LessonDetailDialog: React.FC<LessonDetailDialogProps> = ({ open, onClose, lesson, classId, date }) => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  
  useEffect(() => {
    if (open && lesson && classId) {
      loadData();
    }
  }, [open, lesson, classId, date]);
  
  const loadData = async () => {
    if (!lesson || !classId || !date) return;
    
    setLoading(true);
    setAuthError(false);
    
    console.log('Загрузка данных для урока:', {
      subject: lesson.subject,
      lessonNumber: lesson.lessonNumber,
      classId,
      date: format(date, 'yyyy-MM-dd')
    });
    
    try {
      // Загрузка домашних заданий
      try {
        const homeworkData = await getHomework(classId);
        console.log(`Получено ${homeworkData.length} домашних заданий`);
        
        const formattedDateStr = format(date, 'yyyy-MM-dd');
        
        // Фильтруем домашние задания по предмету
        const subjectHomework = homeworkData.filter(hw => hw.subject === lesson.subject);
        console.log(`Домашних заданий по предмету "${lesson.subject}": ${subjectHomework.length}`);
        
        // Дополнительно фильтруем по дате
        const lessonHomework = subjectHomework.filter(hw => {
          // Сначала проверяем, является ли dueDate допустимой датой
          if (!hw.dueDate) return false;
          
          const hwDate = new Date(hw.dueDate);
          if (isNaN(hwDate.getTime())) {
            console.warn('Недопустимая дата в домашнем задании:', hw.dueDate);
            return false;
          }
          
          const hwDateStr = format(hwDate, 'yyyy-MM-dd');
          const match = hwDateStr === formattedDateStr;
          
          if (match) {
            console.log('Найдено подходящее домашнее задание:', {
              id: hw.id,
              subject: hw.subject,
              hwDate: hwDateStr,
              lessonDate: formattedDateStr,
              match
            });
          }
          
          return match;
        });
        
        console.log(`После фильтрации найдено ${lessonHomework.length} домашних заданий`);
        setHomework(lessonHomework);
      } catch (err) {
        console.error('Ошибка при загрузке домашних заданий:', err);
        // Продолжаем выполнение, даже если не удалось загрузить домашние задания
      }
      
      // Загрузка оценок
      try {
        console.log('Запрос оценок с параметрами:', {
          subject: lesson.subject,
          date: date,
          classId: classId
        });
        
        // Убедимся, что date является экземпляром Date
        if (!(date instanceof Date) || isNaN(date.getTime())) {
          console.error('Недопустимая дата для запроса оценок:', date);
          throw new Error('Недопустимая дата');
        }
        
        const gradesData = await getGradesByLesson(lesson.subject, date, classId);
        console.log(`Получено ${gradesData.length} оценок:`, gradesData);
        setGrades(gradesData);
      } catch (err) {
        // Проверяем, является ли ошибка ошибкой доступа
        if (err instanceof Error && err.message.startsWith('403:')) {
          console.error('Ошибка доступа к оценкам:', err);
          setAuthError(true);
        } else {
          console.error('Ошибка при загрузке оценок:', err);
          // Не выбрасываем ошибку, чтобы не прерывать выполнение
        }
      }
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
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          <div>
            {authError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Требуется повторная авторизация</AlertTitle>
                <Typography variant="body2">
                  Для просмотра оценок необходимо выйти из системы и войти снова, чтобы обновить данные авторизации.
                </Typography>
                <Button 
                  color="inherit" 
                  size="small" 
                  sx={{ mt: 1 }} 
                  onClick={() => {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                  }}
                >
                  Выйти из системы
                </Button>
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              {lesson.subject}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              {date ? format(date, 'dd.MM.yyyy') : ''} | {lesson.startTime} - {lesson.endTime}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Учитель: {lesson.teacher?.name || 'Не указан'}
            </Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>
              Домашние задания
            </Typography>
            {homework.length > 0 ? (
              <List>
                {homework.map((hw) => (
                  <ListItem key={hw.id}>
                    <ListItemText 
                      primary={
                        <Typography variant="body1" fontWeight="medium">
                          {hw.description}
                        </Typography>
                      } 
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Срок сдачи: {format(new Date(hw.dueDate), 'dd.MM.yyyy')}
                          </Typography>
                          {hw.teacher && (
                            <Typography variant="body2" color="text.secondary">
                              Учитель: {hw.teacher.name}
                            </Typography>
                          )}
                        </>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                <AlertTitle>Домашних заданий нет</AlertTitle>
                <Typography variant="body2">
                  По этому уроку не назначено домашних заданий на указанную дату.
                </Typography>
              </Alert>
            )}

            <Typography variant="h6" sx={{ mt: 2 }}>
              Оценки
            </Typography>
            {grades.length > 0 ? (
              <List>
                {grades.map((grade) => (
                  <ListItem key={grade.id}>
                    <ListItemText 
                      primary={
                        <Typography sx={{ color: getGradeColor(grade.value), fontWeight: 'bold' }}>
                          Оценка: {grade.value}
                        </Typography>
                      } 
                      secondary={grade.comment ? `Комментарий: ${grade.comment}` : 'Без комментария'} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : authError ? (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <AlertTitle>Ошибка доступа к оценкам</AlertTitle>
                <Typography variant="body2">
                  У вас нет прав для просмотра оценок по этому уроку. Возможно, требуется повторная авторизация.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                <AlertTitle>Оценок пока нет</AlertTitle>
                <Typography variant="body2">
                  За этот урок нет проставленных оценок. Возможно, учитель еще не успел их выставить.
                </Typography>
              </Alert>
            )}
          </div>
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

const StudentSchedule: React.FC = () => {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ByWeek);
  const [tabValue, setTabValue] = useState(0);
  const user = useSelector((state: RootState) => state.auth.user);
  const [selectedLesson, setSelectedLesson] = useState<Schedule | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  // Загрузка классов
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await getClasses();
        setClasses(data);
        
        // Устанавливаем класс пользователя, если он есть
        if (user?.classId && !selectedClassId) {
          setSelectedClassId(user.classId);
          console.log('Установлен класс пользователя:', user.classId);
        }
      } catch (error) {
        console.error('Ошибка при загрузке классов:', error);
      }
    };
    
    loadClasses();
  }, [user?.classId]);

  // Загрузка расписания
  useEffect(() => {
    // Если класс не выбран, не загружаем расписание
    if (!selectedClassId || selectedClassId === '') {
      console.log('ClassId не выбран, загрузка отменена');
      return;
    }
    
    console.log('Загрузка расписания для класса:', selectedClassId);
    
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError('');
        let data: Schedule[] = [];
        
        if (viewMode === ViewMode.ByDate && selectedDate) {
          // Для режима просмотра по дате
          const formattedDate = selectedDate.toISOString().split('T')[0];
          console.log('Загрузка расписания по дате:', formattedDate, 'для класса:', selectedClassId);
          data = await getScheduleByDate(formattedDate, selectedClassId);
        } else {
          // Для режима просмотра по неделе
          console.log('Загрузка недельного расписания для класса:', selectedClassId);
          data = await getSchedule(selectedClassId);
        }
        
        console.log('Получено расписание:', data.length, 'записей');
        setSchedule(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке расписания';
        setError(errorMessage);
        console.error('Ошибка при загрузке расписания:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [selectedClassId, selectedDate, viewMode]);

  const handleClassChange = (event: SelectChangeEvent) => {
    const newClassId = event.target.value;
    console.log('Выбран новый класс:', newClassId);
    setSelectedClassId(newClassId);
  };

  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      console.log('Изменен режим просмотра:', newMode);
      setViewMode(newMode);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedule
      .filter(item => item.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.lessonNumber - b.lessonNumber);
  };

  const getSelectedClass = () => {
    const selectedClass = classes.find(c => c.id === selectedClassId);
    return selectedClass ? `${selectedClass.grade}-${selectedClass.letter}` : '';
  };

  const handleLessonClick = (lesson: Schedule) => {
    setSelectedLesson(lesson);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Расписание
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 4, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Класс</InputLabel>
              <Select
                value={selectedClassId}
                label="Класс"
                onChange={handleClassChange}
              >
                {classes.map((cls) => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {cls.grade}-{cls.letter}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="режим просмотра"
              fullWidth
            >
              <ToggleButton value={ViewMode.ByWeek} aria-label="на неделю">
                <ViewList sx={{ mr: 1 }} />
                На неделю
              </ToggleButton>
              <ToggleButton value={ViewMode.ByDate} aria-label="на дату">
                <CalendarMonth sx={{ mr: 1 }} />
                На дату
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          {viewMode === ViewMode.ByDate && (
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
                <DatePicker
                  label="Выберите дату"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  format="dd.MM.yyyy"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
          )}
        </Grid>
      </Paper>

      {!selectedClassId ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Выберите класс для отображения расписания
        </Alert>
      ) : viewMode === ViewMode.ByWeek ? (
        <Paper>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              {daysOfWeek.map((day, index) => (
                <Tab label={day} key={index} />
              ))}
            </Tabs>
          </Box>

          {daysOfWeek.map((day, index) => (
            <TabPanel value={tabValue} index={index} key={index}>
              <Typography variant="h6" gutterBottom>
                {day} - {getSelectedClass()}
              </Typography>
              
              {getScheduleForDay(index + 1).length === 0 ? (
                <Alert severity="info">
                  На этот день нет уроков
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Номер</TableCell>
                        <TableCell>Время</TableCell>
                        <TableCell>Предмет</TableCell>
                        <TableCell>Учитель</TableCell>
                        <TableCell>Кабинет</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getScheduleForDay(index + 1).map((lesson) => (
                        <TableRow 
                          key={`${lesson.dayOfWeek}-${lesson.lessonNumber}`}
                          hover
                          onClick={() => handleLessonClick(lesson)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{lesson.lessonNumber}</TableCell>
                          <TableCell>{lesson.startTime} - {lesson.endTime}</TableCell>
                          <TableCell>{lesson.subject}</TableCell>
                          <TableCell>
                            {lesson.teacher ? (
                              <Chip
                                icon={<PersonIcon />}
                                label={formatTeacherName(lesson.teacher.name)}
                                size="small"
                                variant="outlined"
                              />
                            ) : '-'}
                          </TableCell>
                          <TableCell>{lesson.classroom || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          ))}
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Расписание на {selectedDate?.toLocaleDateString('ru-RU')} - {getSelectedClass()}
          </Typography>
          
          {schedule.length === 0 ? (
            <Alert severity="info">
              На выбранную дату нет уроков
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Номер</TableCell>
                    <TableCell>Время</TableCell>
                    <TableCell>Предмет</TableCell>
                    <TableCell>Учитель</TableCell>
                    <TableCell>Кабинет</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.sort((a, b) => a.lessonNumber - b.lessonNumber).map((lesson) => (
                    <TableRow 
                      key={`${lesson.id || `${lesson.dayOfWeek}-${lesson.lessonNumber}`}`}
                      hover
                      onClick={() => handleLessonClick(lesson)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{lesson.lessonNumber}</TableCell>
                      <TableCell>{lesson.startTime} - {lesson.endTime}</TableCell>
                      <TableCell>{lesson.subject}</TableCell>
                      <TableCell>
                        {lesson.teacher ? (
                          <Chip
                            icon={<PersonIcon />}
                            label={formatTeacherName(lesson.teacher.name)}
                            size="small"
                            variant="outlined"
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell>{lesson.classroom || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      
      <LessonDetailDialog 
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        lesson={selectedLesson}
        classId={selectedClassId}
        date={selectedDate}
      />
    </Container>
  );
};

export default StudentSchedule; 