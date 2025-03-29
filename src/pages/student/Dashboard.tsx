import React, { useState, useEffect } from 'react';
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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Fab,
  Tabs,
  Tab,
} from '@mui/material';
import { 
  Info as InfoIcon,
  Calculate as CalculateIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { getGrades, getSubjects, getFinalGrades, Grade, Subject, FinalGrade } from '../../services/api';
import GradeCalculator from '../../components/GradeCalculator';
import FinalGrades from '../../components/FinalGrades';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface GradeDialogProps {
  grade: Grade | null;
  open: boolean;
  onClose: () => void;
  getGradeColor: (value: number | string) => string;
}

const GradeDialog = ({ grade, open, onClose, getGradeColor }: GradeDialogProps) => {
  if (!grade) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Детали оценки</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            <strong>Предмет:</strong> {grade.subject}
          </Typography>
          <Typography>
            <strong>Оценка:</strong>{' '}
            <span style={{ color: getGradeColor(grade.value) }}>
              {grade.value}
            </span>
          </Typography>
          <Typography>
            <strong>Дата:</strong>{' '}
            {new Date(grade.date).toLocaleDateString()}
          </Typography>
          <Typography>
            <strong>Учитель:</strong> {grade.teacher.name}
          </Typography>
          {grade.comment && (
            <Typography>
              <strong>Комментарий:</strong> {grade.comment}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
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
      id={`grades-tabpanel-${index}`}
      aria-labelledby={`grades-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const StudentDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useSelector((state: RootState) => state.auth);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorGrades, setCalculatorGrades] = useState<(number | string)[]>([]);
  const [finalGrades, setFinalGrades] = useState<FinalGrade[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [loadedGrades, loadedSubjects, loadedFinalGrades] = await Promise.all([
        getGrades(),
        getSubjects(),
        getFinalGrades(user?.id?.toString() || '')
      ]);
      setGrades(loadedGrades);
      setSubjects(loadedSubjects);
      setFinalGrades(loadedFinalGrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleGradeClick = (grade: Grade) => {
    if (isMobile) {
      setSelectedGrade(grade);
      setDialogOpen(true);
    }
  };

  const handleOpenCalculator = () => {
    setCalculatorOpen(true);
  };

  const handleCloseCalculator = () => {
    setCalculatorOpen(false);
  };

  const handleCopyGradesToCalculator = () => {
    // Копируем только числовые оценки
    const validGrades = filteredGrades
      .filter(grade => {
        // Исключаем буквенные оценки
        if (typeof grade.value === 'string' && ['Н', 'У', 'О'].includes(grade.value)) {
          return false;
        }
        return true;
      })
      .map(grade => {
        // Преобразуем строковые числа в числовые значения
        if (typeof grade.value === 'string' && !isNaN(Number(grade.value))) {
          return Number(grade.value);
        }
        return grade.value;
      });
    
    setCalculatorGrades(validGrades);
    setCalculatorOpen(true);
  };

  const filteredGrades = selectedSubject
    ? grades.filter(grade => grade.subject === selectedSubject)
    : grades;

  const calculateAverageGrade = (grades: Grade[]) => {
    // Фильтруем только числовые оценки и преобразуем строковые числа в числовые
    const numericGrades = grades.filter(grade => {
      if (typeof grade.value === 'number') return true;
      if (typeof grade.value === 'string' && !isNaN(Number(grade.value))) return true;
      return false;
    });
    
    if (numericGrades.length === 0) return 0;
    
    const sum = numericGrades.reduce((acc, grade) => {
      const value = typeof grade.value === 'string' ? Number(grade.value) : grade.value;
      return acc + value;
    }, 0);
    
    return Number((sum / numericGrades.length).toFixed(2));
  };

  const averageGrade = calculateAverageGrade(filteredGrades);

  const uniqueSubjects = Array.from(new Set(grades.map(grade => grade.subject)));

  // Функция для подготовки данных для графика
  const prepareChartData = () => {
    if (!selectedSubject) return [];

    const numericGrades = filteredGrades
      .filter(grade => {
        if (typeof grade.value === 'number') return true;
        if (typeof grade.value === 'string' && !isNaN(Number(grade.value))) return true;
        return false;
      })
      .map(grade => ({
        date: new Date(grade.date).toLocaleDateString('ru-RU'),
        value: typeof grade.value === 'string' ? Number(grade.value) : grade.value,
        timestamp: new Date(grade.date).getTime() // добавляем timestamp для сортировки
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // сортируем по возрастанию даты

    return numericGrades;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Мои оценки
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Текущие оценки" />
          <Tab label="Итоговые оценки" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="Калькулятор среднего балла">
            <Fab
              color="primary"
              size="small"
              onClick={handleOpenCalculator}
              sx={{ mr: 1 }}
            >
              <CalculateIcon />
            </Fab>
          </Tooltip>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Предмет</InputLabel>
            <Select
              value={selectedSubject}
              label="Предмет"
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <MenuItem value="">Все предметы</MenuItem>
              {uniqueSubjects.map((subject) => (
                <MenuItem key={subject} value={subject}>
                  {subject}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="h6">
            Средний балл: {averageGrade}
          </Typography>
          
          {selectedSubject && (
            <Tooltip title="Скопировать оценки в калькулятор">
              <Button 
                variant="outlined" 
                startIcon={<CopyIcon />}
                onClick={handleCopyGradesToCalculator}
              >
                {!isMobile && 'В калькулятор'}
              </Button>
            </Tooltip>
          )}
        </Stack>

        {calculatorOpen && (
          <GradeCalculator 
            subjectGrades={calculatorGrades} 
            onClose={handleCloseCalculator} 
          />
        )}

        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Предмет</TableCell>
                <TableCell>Оценка</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell>Учитель</TableCell>
                {!isMobile && <TableCell>Комментарий</TableCell>}
                {isMobile && <TableCell>Детали</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGrades.map((grade) => (
                <TableRow
                  key={grade.id}
                  onClick={() => handleGradeClick(grade)}
                  sx={{ cursor: isMobile ? 'pointer' : 'default' }}
                >
                  <TableCell>{grade.subject}</TableCell>
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
                  <TableCell>
                    {new Date(grade.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{grade.teacher.name}</TableCell>
                  {!isMobile && <TableCell>{grade.comment}</TableCell>}
                  {isMobile && (
                    <TableCell>
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedSubject && filteredGrades.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              График успеваемости по предмету "{selectedSubject}"
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart
                  data={prepareChartData()}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                  />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Оценка"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ mb: 2 }}>
            <InputLabel>Учебный год</InputLabel>
            <Select
              value={selectedYear}
              label="Учебный год"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {Array.from(new Set(finalGrades.map(g => g.year)))
                .sort((a, b) => b - a)
                .map(year => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FinalGrades
            grades={finalGrades.filter(g => g.year === selectedYear)}
            year={selectedYear}
          />
        </Box>
      </TabPanel>

      <GradeDialog
        grade={selectedGrade}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        getGradeColor={getGradeColor}
      />
    </Box>
  );
};

export default StudentDashboard; 