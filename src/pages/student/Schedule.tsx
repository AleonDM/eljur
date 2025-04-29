import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ru as ruLocale } from 'date-fns/locale';
import {
  Schedule as ScheduleIcon,
  Book as BookIcon,
  Grading as GradingIcon,
  AccessTime as AccessTimeIcon,
  Room as RoomIcon,
  ViewList,
  CalendarMonth,
  Person as PersonIcon
} from '@mui/icons-material';
import { getSchedule, getScheduleByDate, getClasses, Class, Schedule } from '../../services/api';
import { getHomework, Homework } from '../../services/api';
import { getGradesBySubjectAndDate, Grade } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

enum ViewMode {
  ByWeek = 'week',
  ByDate = 'date'
}

interface LessonDetail {
  lesson: Schedule;
  homework: Homework[];
  grades: Grade[];
}

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
      id={`schedule-tabpanel-${index}`}
      aria-labelledby={`schedule-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const LessonDetailDialog = ({ 
  open, 
  onClose, 
  lessonDetail 
}: { 
  open: boolean; 
  onClose: () => void; 
  lessonDetail: LessonDetail | null;
}) => {
  if (!lessonDetail) return null;
  const { lesson, homework, grades } = lessonDetail;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{lesson.subject}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" gutterBottom>Информация об уроке</Typography>
            <List>
              <ListItem>
                <ListItemIcon><AccessTimeIcon /></ListItemIcon>
                <ListItemText 
                  primary="Время" 
                  secondary={`${lesson.startTime} - ${lesson.endTime}`} 
                />
              </ListItem>
              {lesson.teacher && (
                <ListItem>
                  <ListItemIcon><PersonIcon /></ListItemIcon>
                  <ListItemText 
                    primary="Учитель" 
                    secondary={lesson.teacher.name} 
                  />
                </ListItem>
              )}
              {lesson.classroom && (
                <ListItem>
                  <ListItemIcon><RoomIcon /></ListItemIcon>
                  <ListItemText 
                    primary="Кабинет" 
                    secondary={lesson.classroom} 
                  />
                </ListItem>
              )}
            </List>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>Домашнее задание</Typography>
            {homework.length > 0 ? (
              <List>
                {homework.map((hw) => (
                  <ListItem key={hw.id}>
                    <ListItemIcon><BookIcon /></ListItemIcon>
                    <ListItemText 
                      primary={`Задание на ${new Date(hw.dueDate).toLocaleDateString()}`}
                      secondary={hw.description} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                Нет домашнего задания
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>Оценки</Typography>
            {grades.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Оценка</TableCell>
                      <TableCell>Комментарий</TableCell>
                      <TableCell>Дата</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grades.map((grade) => (
                      <TableRow key={grade.id}>
                        <TableCell>
                          <Chip 
                            label={grade.value} 
                            color="primary"
                            sx={{ 
                              backgroundColor: getGradeColor(grade.value),
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>{grade.comment || '-'}</TableCell>
                        <TableCell>{new Date(grade.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">
                Нет оценок
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
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

  const formatTeacherName = (name: string) => {
    if (!isMobile) return name;
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0];
    
    const lastName = parts[0];
    const initials = parts.slice(1).map(part => part[0] ? part[0] + '.' : '').join('');
    
    return `${lastName} ${initials}`;
  };

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await getClasses();
        setClasses(data);
        
        if (user?.classId && !selectedClassId) {
          setSelectedClassId(user.classId);
        }
      } catch (error) {
        console.error('Ошибка при загрузке классов:', error);
      }
    };
    
    loadClasses();
  }, [user?.classId]);

  useEffect(() => {
    if (!selectedClassId || selectedClassId === '') {
      return;
    }
    
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError('');
        let data: Schedule[] = [];
        
        if (viewMode === ViewMode.ByDate && selectedDate) {
          const formattedDate = selectedDate.toISOString().split('T')[0];
          data = await getScheduleByDate(formattedDate, selectedClassId);
        } else {
          data = await getSchedule(selectedClassId);
        }
        
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
    setSelectedClassId(newClassId);
  };

  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedule.filter(lesson => lesson.dayOfWeek === dayOfWeek);
  };

  const handleLessonClick = async (lesson: Schedule) => {
    setSelectedLesson(lesson);
    
    try {
      let homeworkData: Homework[] = [];
      try {
        homeworkData = await getHomework();
      } catch (error) {
        homeworkData = [];
      }
      
      let subjectHomework = homeworkData.filter(hw => hw.subject === lesson.subject);
      
      let lessonHomework: Homework[] = [];
      
      if (lesson.date) {
        const lessonDate = new Date(lesson.date);
        
        lessonHomework = subjectHomework.filter(hw => {
          if (!hw.dueDate) return false;
          
          const dueDate = new Date(hw.dueDate);
          if (isNaN(dueDate.getTime())) return false;
          
          const homeworkDay = dueDate.getDate();
          const homeworkMonth = dueDate.getMonth();
          
          const lessonDay = lessonDate.getDate();
          const lessonMonth = lessonDate.getMonth();
          
          return homeworkDay === lessonDay && homeworkMonth === lessonMonth;
        });
      } else {
        lessonHomework = subjectHomework;
      }
      
      let gradesData: Grade[] = [];
      try {
        let date = null;
        
        if (lesson.date && typeof lesson.date === 'string') {
          date = new Date(lesson.date);
        }
        
        gradesData = await getGradesBySubjectAndDate(lesson.subject, date);
      } catch (error) {
        if (error instanceof Error && error.message.includes('доступ')) {
          gradesData = [];
        } else {
          console.error('Ошибка при загрузке оценок:', error);
        }
      }
      
      const lessonDetail: LessonDetail = {
        lesson,
        homework: lessonHomework,
        grades: gradesData
      };
      
      setSelectedLesson(lesson);
      setLessonDetail(lessonDetail);
      setDetailDialogOpen(true);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных урока:', error);
    }
  };
  
  const [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null);
  
  const getGradeColor = (value: string | number) => {
    const strValue = String(value);
    
    switch (strValue) {
      case '5': return '#1B5E20';
      case '4': return '#4CAF50';
      case '3': return '#FFC107';
      case '2': return '#F44336';
      case '1': return '#B71C1C';
      case 'Н': return '#9C27B0';
      case 'У': return '#2196F3';
      case 'О': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const daysOfWeek = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота'
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
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

      {viewMode === ViewMode.ByWeek ? (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons={isMobile ? "auto" : "disabled"}
            >
              {daysOfWeek.map((day, index) => (
                <Tab key={index} label={day} icon={<ScheduleIcon />} iconPosition="start" />
              ))}
            </Tabs>
          </Box>
          
          {daysOfWeek.map((day, index) => (
            <TabPanel value={tabValue} index={index} key={index}>
              <Typography variant="h5" gutterBottom>
                {day}
              </Typography>
              {
              getScheduleForDay(index + 1).length === 0 ? (
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
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h5" gutterBottom>
            {selectedDate ? selectedDate.toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : 'Выберите дату'}
          </Typography>
          
          {schedule.length === 0 ? (
            <Alert severity="info">
              На эту дату нет уроков
            </Alert>
          ) : (
            <TableContainer component={Paper}>
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
                  {schedule.map((lesson) => (
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
        </Box>
      )}

      <LessonDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        lessonDetail={lessonDetail}
      />
    </Box>
  );
};

export default StudentSchedule; 