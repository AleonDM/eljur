import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container
} from '@mui/material';
import { Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { Schedule, Class, Subject, getSchedule, updateSchedule, getScheduleTemplates, createScheduleTemplate, deleteScheduleTemplate, getSubjects, getSchoolSettings, updateSchoolSettings, getClasses, getUsers } from '../../services/api';
import type { SchoolSettings, User } from '../../services/api';

interface ScheduleState {
  [key: number]: {
    [key: number]: {
      subject: string;
      teacherId?: string;
    };
  };
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

const defaultSettings: SchoolSettings = {
  lessonDuration: 40,
  breakDuration: 10,
  longBreakDuration: 20,
  longBreakAfterLesson: 3,
  firstLessonStart: '08:00',
  secondShiftStart: '14:00'
};

const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const ScheduleTab: React.FC<{ classes: Class[]; settings: SchoolSettings }> = ({ classes, settings }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar,setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedSubjects, loadedTeachers] = await Promise.all([
          getSubjects(),
          getUsers()
        ]);
        setSubjects(loadedSubjects);
        // Фильтруем только учителей
        setTeachers(loadedTeachers.filter(user => user.role === 'teacher'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!selectedClass) return;
      try {
        setLoading(true);
        const data = await getSchedule(selectedClass);
        // Преобразуем массив в объект для удобства работы
        const scheduleObj: ScheduleState = {};
        data.forEach(item => {
          if (!scheduleObj[item.dayOfWeek - 1]) {
            scheduleObj[item.dayOfWeek - 1] = {};
          }
          scheduleObj[item.dayOfWeek - 1][item.lessonNumber - 1] = {
            subject: item.subject,
            teacherId: item.teacherId?.toString()
          };
        });
        setSchedule(scheduleObj);
      } catch (error) {
        console.error('Ошибка при загрузке расписания:', error);
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке расписания',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [selectedClass]);

  const handleScheduleChange = (dayOfWeek: number, lessonNumber: number, field: string, value: any) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[dayOfWeek - 1]) {
        newSchedule[dayOfWeek - 1] = {};
      }
      if (!newSchedule[dayOfWeek - 1][lessonNumber - 1]) {
        newSchedule[dayOfWeek - 1][lessonNumber - 1] = { subject: '' };
      }
      
      newSchedule[dayOfWeek - 1][lessonNumber - 1] = {
        ...newSchedule[dayOfWeek - 1][lessonNumber - 1],
        [field]: value
      };
      
      return newSchedule;
    });
  };

  const handleSaveSchedule = async () => {
    if (!selectedClass) return;
    try {
      setIsSaving(true);
      const scheduleData = [];
      
      // Собираем все уроки с выбранными предметами
      for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
        for (let lessonIndex = 0; lessonIndex < 16; lessonIndex++) {
          const lessonData = schedule[dayIndex]?.[lessonIndex];
          if (lessonData && lessonData.subject) {
            const times = calculateLessonTime(settings, lessonIndex + 1);
            scheduleData.push({
              classId: parseInt(selectedClass, 10),
              dayOfWeek: dayIndex + 1,
              lessonNumber: lessonIndex + 1,
              subject: lessonData.subject,
              teacherId: lessonData.teacherId || null,
              startTime: times.startTime,
              endTime: times.endTime
            });
          }
        }
      }

      await updateSchedule(selectedClass, scheduleData);
      setSnackbar({
        open: true,
        message: 'Расписание сохранено',
        severity: 'success'
      });
    } catch (error) {
      console.error('Ошибка при сохранении расписания:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при сохранении расписания',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Функция для расчета времени начала и окончания урока
  const calculateLessonTime = (settings: SchoolSettings, lessonNumber: number) => {
    const isSecondShift = lessonNumber > 8;
    const startTimeStr = isSecondShift ? settings.secondShiftStart : settings.firstLessonStart;
    const adjustedLessonNumber = isSecondShift ? lessonNumber - 8 : lessonNumber;

    // Преобразуем начальное время в минуты
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    let currentMinutes = startHours * 60 + startMinutes;

    // Рассчитываем время для всех уроков до текущего
    for (let i = 1; i < adjustedLessonNumber; i++) {
      // Добавляем длительность предыдущего урока
      currentMinutes += settings.lessonDuration;
      
      // Добавляем перемену
      if (i === settings.longBreakAfterLesson) {
        currentMinutes += settings.longBreakDuration;
      } else {
        currentMinutes += settings.breakDuration;
      }
    }

    // Время начала текущего урока
    const lessonStartTime = {
      hours: Math.floor(currentMinutes / 60),
      minutes: currentMinutes % 60
    };

    // Время окончания текущего урока
    const endMinutes = currentMinutes + settings.lessonDuration;
    const lessonEndTime = {
      hours: Math.floor(endMinutes / 60),
      minutes: endMinutes % 60
    };

    // Форматируем время в строку
    const formatTime = (time: { hours: number; minutes: number }) => {
      return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
    };

    return {
      startTime: formatTime(lessonStartTime),
      endTime: formatTime(lessonEndTime)
    };
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Выберите класс</InputLabel>
        <Select
          value={selectedClass}
          label="Выберите класс"
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classes.map((cls) => (
            <MenuItem key={cls.id} value={cls.id}>
              {cls.grade}-{cls.letter}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {selectedClass && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Урок</TableCell>
                  {daysOfWeek.map((day, index) => (
                    <TableCell key={index}>{day}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 16 }, (_, lessonIndex) => (
                  <TableRow key={lessonIndex}>
                    <TableCell>
                      {lessonIndex + 1}
                      <Typography variant="caption" color="textSecondary" display="block">
                        {lessonIndex < 8 ? '(1 смена)' : '(2 смена)'}
                      </Typography>
                    </TableCell>
                    {daysOfWeek.map((_, dayIndex) => {
                      const lessonData = schedule[dayIndex]?.[lessonIndex] || { subject: '', teacherId: '' };
                      const times = lessonData.subject ? calculateLessonTime(settings, lessonIndex + 1) : null;
                      return (
                        <TableCell key={dayIndex}>
                          <Stack spacing={1}>
                            <FormControl fullWidth size="small">
                              <Select
                                value={lessonData.subject || ''}
                                onChange={(e) => handleScheduleChange(
                                  dayIndex + 1,
                                  lessonIndex + 1,
                                  'subject',
                                  e.target.value
                                )}
                              >
                                <MenuItem value="">Нет урока</MenuItem>
                                {subjects.map((subject) => (
                                  <MenuItem key={subject.id} value={subject.name}>
                                    {subject.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            
                            {lessonData.subject && (
                              <FormControl fullWidth size="small">
                                <InputLabel>Учитель</InputLabel>
                                <Select
                                  value={lessonData.teacherId || ''}
                                  label="Учитель"
                                  onChange={(e) => handleScheduleChange(
                                    dayIndex + 1,
                                    lessonIndex + 1,
                                    'teacherId',
                                    e.target.value
                                  )}
                                >
                                  <MenuItem value="">Не назначен</MenuItem>
                                  {teachers.map((teacher) => (
                                    <MenuItem key={teacher.id} value={teacher.id}>
                                      {teacher.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                            
                            {lessonData.subject && times && (
                              <Typography variant="caption" color="textSecondary">
                                {times.startTime} - {times.endTime}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button
            variant="contained"
            onClick={handleSaveSchedule}
            disabled={loading}
            startIcon={<SaveIcon />}
            sx={{ mt: 2 }}
          >
            Сохранить расписание
          </Button>
        </>
      )}
    </Box>
  );
};

const TemplatesTab = () => {
  const [templates, setTemplates] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const loadedTemplates = await getScheduleTemplates();
        setTemplates(loadedTemplates);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки шаблонов');
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      setLoading(true);
      await createScheduleTemplate(newTemplateName, []);
      const loadedTemplates = await getScheduleTemplates();
      setTemplates(loadedTemplates);
      setDialogOpen(false);
      setNewTemplateName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания шаблона');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (name: string) => {
    try {
      setLoading(true);
      await deleteScheduleTemplate(name);
      setTemplates(templates.filter(t => t.name !== name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления шаблона');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={() => setDialogOpen(true)}
        sx={{ mb: 2 }}
      >
        Создать шаблон
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название шаблона</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.name}>
                <TableCell>{template.name}</TableCell>
                <TableCell align="right">
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteTemplate(template.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Создать новый шаблон</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название шаблона"
            fullWidth
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<SchoolSettings>(defaultSettings);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesData, settingsData] = await Promise.all([
          getClasses(),
          getSchoolSettings()
        ]);
        setClasses(classesData);
        setSettings(settingsData || defaultSettings);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSettingsChange = (field: keyof SchoolSettings, value: string | number) => {
    setSettings(prev => ({
      ...defaultSettings, // Используем defaultSettings как базу
      ...prev, // Добавляем текущие настройки
      [field]: value // Обновляем конкретное поле
    }));
  };

  const handleSettingsSave = async () => {
    try {
      await updateSchoolSettings(settings);
      // Показать уведомление об успешном сохранении
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      // Показать уведомление об ошибке
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Панель директора
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Настройки школы" />
            <Tab label="Расписание" />
            <Tab label="Шаблоны расписания" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Настройки школы
            </Typography>
            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '25ch' } }}>
              <TextField
                type="number"
                label="Длительность урока (минут)"
                value={settings.lessonDuration}
                onChange={(e) => handleSettingsChange('lessonDuration', Number(e.target.value))}
                inputProps={{ min: 30, max: 90 }}
              />
              <TextField
                type="number"
                label="Длительность перемены (минут)"
                value={settings.breakDuration}
                onChange={(e) => handleSettingsChange('breakDuration', Number(e.target.value))}
                inputProps={{ min: 5, max: 30 }}
              />
              <TextField
                type="number"
                label="Длительность большой перемены (минут)"
                value={settings.longBreakDuration}
                onChange={(e) => handleSettingsChange('longBreakDuration', Number(e.target.value))}
                inputProps={{ min: 15, max: 45 }}
              />
              <TextField
                type="number"
                label="Большая перемена после урока"
                value={settings.longBreakAfterLesson}
                onChange={(e) => handleSettingsChange('longBreakAfterLesson', Number(e.target.value))}
                inputProps={{ 
                  min: 1, 
                  max: 7,
                  type: 'number'
                } as React.InputHTMLAttributes<HTMLInputElement>}
              />
              <TextField
                type="time"
                label="Начало первого урока"
                value={settings.firstLessonStart}
                onChange={(e) => handleSettingsChange('firstLessonStart', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                type="time"
                label="Начало второй смены"
                value={settings.secondShiftStart}
                onChange={(e) => handleSettingsChange('secondShiftStart', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Button
                variant="contained"
                onClick={handleSettingsSave}
                sx={{ mt: 2 }}
              >
                Сохранить настройки
              </Button>
            </Box>
          </Paper>
        )}

        {activeTab === 1 && !loading && (
          <ScheduleTab classes={classes} settings={settings} />
        )}

        {activeTab === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Шаблоны расписания
            </Typography>
            <TemplatesTab />
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard; 