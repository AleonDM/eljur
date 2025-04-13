import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { getClassRatings, StudentRating as StudentRatingType } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { getGradeColor, roundGrade, getGradeRoundingThreshold, formatGrade } from '../utils/gradeUtils';

const StudentRating: React.FC = () => {
  const [ratings, setRatings] = useState<StudentRatingType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [roundingThreshold, setRoundingThreshold] = useState<number>(0.5);
  const [useRounding, setUseRounding] = useState<boolean>(false);
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Используем хуки Material UI для определения размера экрана
  const theme = useTheme();
  const { mode } = useCustomTheme(); // Получаем текущий режим темы
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const loadRatings = async () => {
    if (!user?.classId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getClassRatings(user.classId);
      setRatings(data);
      
      // Загружаем настройку порога округления
      const threshold = await getGradeRoundingThreshold();
      setRoundingThreshold(threshold);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки рейтинга');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, [user?.classId]);

  const handleSubjectChange = (event: SelectChangeEvent) => {
    setSelectedSubject(event.target.value);
  };

  // Функция для применения округления к оценке
  const applyRounding = (grade: number): number => {
    return useRounding ? roundGrade(grade, roundingThreshold) : grade;
  };

  const getSubjects = () => {
    // Собираем все предметы из всех оценок
    const allSubjects = new Set<string>();
    
    ratings.forEach(rating => {
      Object.keys(rating.subjectGrades).forEach(subject => {
        allSubjects.add(subject);
      });
    });
    
    return Array.from(allSubjects).sort();
  };

  const getChartData = () => {
    // Если выбраны все предметы и рейтинг по среднему баллу
    if (selectedSubject === 'all') {
      // Для мобильных устройств ограничиваем до 5 учеников
      const limit = isMobile ? 5 : 10;
      
      // Готовим данные для графика - общий средний балл
      return ratings
        .map(student => ({
          ...student,
          // Применяем округление, если оно включено
          averageGrade: useRounding ? applyRounding(student.averageGrade) : student.averageGrade
        }))
        .sort((a, b) => b.averageGrade - a.averageGrade)
        .slice(0, limit)
        .map(student => ({
          name: isMobile ? student.studentName.split(' ')[0] : student.studentName, // На мобильных показываем только имя
          Средний: student.averageGrade
        }));
    } else {
      // Для мобильных устройств ограничиваем до 5 учеников
      const limit = isMobile ? 5 : 10;
      
      // Готовим данные для графика конкретного предмета
      return ratings
        .filter(student => student.subjectGrades[selectedSubject] !== undefined)
        .map(student => ({
          ...student,
          subjectGrades: {
            ...student.subjectGrades,
            [selectedSubject]: useRounding 
              ? applyRounding(student.subjectGrades[selectedSubject]) 
              : student.subjectGrades[selectedSubject]
          }
        }))
        .sort((a, b) => b.subjectGrades[selectedSubject] - a.subjectGrades[selectedSubject])
        .slice(0, limit)
        .map(student => ({
          name: isMobile ? student.studentName.split(' ')[0] : student.studentName, // На мобильных показываем только имя
          [selectedSubject]: student.subjectGrades[selectedSubject] || 0
        }));
    }
  };

  const getBarColor = () => {
    // Используем цвета из темы Material UI
    return theme.palette.primary.main;
  };

  const getGridColor = () => {
    // Цвет сетки графика в зависимости от темы
    return mode === 'dark' 
      ? alpha(theme.palette.common.white, 0.2)
      : alpha(theme.palette.common.black, 0.1);
  };

  const getAxisColor = () => {
    // Цвет осей в зависимости от темы
    return mode === 'dark'
      ? theme.palette.text.primary
      : theme.palette.text.secondary;
  };

  const getRatingColor = (value: number) => {
    return getGradeColor(value);
  };

  const getRatingChip = (value: number) => {
    const displayValue = useRounding ? applyRounding(value) : value;
    
    return (
      <Tooltip title={useRounding ? `Исходное значение: ${formatGrade(value)}` : undefined}>
        <Chip
          label={formatGrade(displayValue)}
          sx={{
            fontWeight: 'bold',
            color: 'white',
            bgcolor: getRatingColor(displayValue),
          }}
        />
      </Tooltip>
    );
  };

  const getCurrentUserRank = () => {
    // Находим текущего пользователя в рейтинге
    if (!user) return null;
    
    const rank = ratings.findIndex(r => r.studentId === Number(user.id));
    if (rank === -1) return null;
    
    const student = ratings[rank];
    
    // Если выбран конкретный предмет, находим позицию в рейтинге по этому предмету
    if (selectedSubject !== 'all' && student.subjectGrades[selectedSubject] !== undefined) {
      // Сортируем всех учеников по оценкам выбранного предмета
      const sortedBySubject = [...ratings]
        .filter(r => r.subjectGrades[selectedSubject] !== undefined)
        .sort((a, b) => b.subjectGrades[selectedSubject] - a.subjectGrades[selectedSubject]);
      
      // Находим позицию текущего пользователя в отсортированном списке
      const subjectRank = sortedBySubject.findIndex(r => r.studentId === Number(user.id));
      
      return {
        isForSubject: true,
        subjectName: selectedSubject,
        rank: subjectRank + 1,
        total: sortedBySubject.length,
        student: student,
        subjectGrade: student.subjectGrades[selectedSubject] || 0
      };
    }
    
    // Для всех предметов
    return {
      isForSubject: false,
      rank: rank + 1,
      total: ratings.length,
      student: student
    };
  };

  const userRank = getCurrentUserRank();
  const subjects = getSubjects();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (ratings.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        Нет данных для отображения рейтинга
      </Alert>
    );
  }

  return (
    <Box>
      {userRank && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }} elevation={3}>
          <Typography variant="h6" gutterBottom>
            {userRank.isForSubject 
              ? `Ваш рейтинг по предмету "${userRank.subjectName}"` 
              : 'Ваш рейтинг по среднему баллу'}
          </Typography>
          <Typography variant="body1">
            Место в рейтинге класса: <strong>{userRank.rank}</strong> из {userRank.total}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} sx={{ my: 1 }}>
            <Typography component="span">
              {userRank.isForSubject
                ? `Средний балл по предмету: `
                : `Общий средний балл: `}
            </Typography>
            {userRank.isForSubject && typeof userRank.subjectGrade === 'number'
              ? getRatingChip(userRank.subjectGrade)
              : getRatingChip(userRank.student.averageGrade)}
          </Box>
          {userRank.isForSubject && (
            <Box display="flex" alignItems="center" gap={1} sx={{ mt: 2 }}>
              <Typography component="span" color="text.secondary">
                Для сравнения, общий средний балл:
              </Typography>
              {getRatingChip(userRank.student.averageGrade)}
            </Box>
          )}
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <FormControl sx={{ width: '70%' }}>
          <InputLabel id="subject-select-label">Предмет</InputLabel>
          <Select
            labelId="subject-select-label"
            value={selectedSubject}
            label="Предмет"
            onChange={handleSubjectChange}
          >
            <MenuItem value="all">Все предметы (средний балл)</MenuItem>
            {subjects.map(subject => (
              <MenuItem key={subject} value={subject}>
                {subject}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControlLabel
          control={
            <Switch 
              checked={useRounding}
              onChange={(e) => setUseRounding(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Tooltip title={`Порог округления: ${roundingThreshold}. Пример: 3.${Math.round(roundingThreshold * 100)} → 4`}>
              <Typography variant="body2">Округлять оценки</Typography>
            </Tooltip>
          }
        />
      </Box>

      <Paper sx={{ p: isMobile ? 1 : 2, height: 500 }}>
        <Typography variant="h6" gutterBottom align="center">
          {selectedSubject === 'all' 
            ? 'Топ учеников по среднему баллу' 
            : `Топ учеников по предмету "${selectedSubject}"`}
        </Typography>
        <Box sx={{ 
          width: '100%', 
          height: '90%', 
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getChartData()}
              layout="vertical"
              margin={
                isMobile 
                  ? { top: 5, right: 30, left: 50, bottom: 5 }
                  : isTablet
                    ? { top: 10, right: 40, left: 70, bottom: 10 }
                    : { top: 15, right: 50, left: 100, bottom: 15 }
              }
              barSize={isMobile ? 15 : 20}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                horizontal={false} 
                stroke={getGridColor()}
              />
              <XAxis 
                type="number" 
                domain={[0, 5]} 
                tickCount={6}
                stroke={getAxisColor()}
                tick={{ fill: getAxisColor() }}
              />
              <YAxis 
                dataKey="name" 
                type="category"
                width={isMobile ? 45 : isTablet ? 65 : 95}
                tick={{ fontSize: isMobile ? 10 : 12, fill: getAxisColor() }}
                axisLine={false}
                stroke={getAxisColor()}
              />
              <RechartsTooltip 
                formatter={(value: number) => [formatGrade(value), selectedSubject === 'all' ? 'Средний балл' : selectedSubject]}
                contentStyle={
                  isMobile 
                    ? { fontSize: '12px', backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider } 
                    : { backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider }
                }
                itemStyle={{ color: theme.palette.text.primary }}
                labelStyle={{ color: theme.palette.text.secondary }}
              />
              <Legend 
                wrapperStyle={{ color: getAxisColor() }}
              />
              {selectedSubject === 'all' ? (
                <Bar dataKey="Средний" fill={getBarColor()} radius={[0, 4, 4, 0]}>
                  <LabelList 
                    dataKey="Средний" 
                    position="right" 
                    formatter={(value: number) => formatGrade(value)} 
                    style={{ 
                      fontSize: isMobile ? 10 : 12,
                      fill: theme.palette.text.primary
                    }}
                  />
                </Bar>
              ) : (
                <Bar dataKey={selectedSubject} fill={getBarColor()} radius={[0, 4, 4, 0]}>
                  <LabelList 
                    dataKey={selectedSubject} 
                    position="right" 
                    formatter={(value: number) => formatGrade(value)} 
                    style={{ 
                      fontSize: isMobile ? 10 : 12,
                      fill: theme.palette.text.primary
                    }}
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default StudentRating; 