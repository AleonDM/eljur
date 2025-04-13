import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Chip,
  Badge,
  Paper,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Grade } from '../services/api';
import { formatDate } from '../utils/formatUtils';
import { getGradeColor, roundGrade, getGradeRoundingThreshold, formatGrade } from '../utils/gradeUtils';

interface GradeDisplayProps {
  grades: Grade[];
  showDate?: boolean;
  showSubject?: boolean;
  title?: string;
  compact?: boolean;
}

const GradeDisplay: React.FC<GradeDisplayProps> = ({
  grades = [],
  showDate = true,
  showSubject = true,
  title,
  compact = false,
}) => {
  const [roundingThreshold, setRoundingThreshold] = useState<number>(0.5);
  const [useRounding, setUseRounding] = useState<boolean>(false);

  // Загружаем настройки округления при монтировании компонента
  useEffect(() => {
    const loadRoundingThreshold = async () => {
      try {
        const threshold = await getGradeRoundingThreshold();
        setRoundingThreshold(threshold);
      } catch (error) {
        console.error('Ошибка при загрузке порога округления:', error);
      }
    };
    
    loadRoundingThreshold();
  }, []);

  // Группируем оценки по предметам
  const groupedGrades = grades.reduce((acc, grade) => {
    if (!acc[grade.subject]) {
      acc[grade.subject] = [];
    }
    acc[grade.subject].push(grade);
    return acc;
  }, {} as Record<string, Grade[]>);

  if (grades.length === 0) {
    return null;
  }

  // Функция для получения среднего балла по предмету
  const getAverageGrade = (subjectGrades: Grade[]): number => {
    const numericGrades = subjectGrades
      .filter(g => typeof g.value === 'number')
      .map(g => g.value as number);
    
    if (numericGrades.length === 0) return 0;
    
    const sum = numericGrades.reduce((a, b) => a + b, 0);
    const avg = sum / numericGrades.length;
    
    return useRounding ? roundGrade(avg, roundingThreshold) : avg;
  };

  // Создаем элементы для отображения оценок
  const gradeItems = Object.entries(groupedGrades).map(([subject, subjectGrades]) => {
    const avgGrade = getAverageGrade(subjectGrades);
    const sortedGrades = [...subjectGrades].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Сортировка от новых к старым
    });

    return (
      <Grid item xs={12} sm={6} md={4} key={subject}>
        <Paper
          elevation={2}
          sx={{
            p: compact ? 1 : 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
            {showSubject && (
              <Typography
                variant={compact ? 'subtitle2' : 'subtitle1'}
                fontWeight="bold"
                sx={{ mb: 1, wordBreak: 'break-word' }}
              >
                {subject}
              </Typography>
            )}
            {avgGrade > 0 && (
              <Tooltip title={useRounding ? `Исходное значение: ${formatGrade(avgGrade)}` : 'Средний балл'}>
                <Chip
                  label={formatGrade(avgGrade)}
                  size={compact ? 'small' : 'medium'}
                  sx={{
                    fontWeight: 'bold',
                    ml: 1,
                    bgcolor: getGradeColor(avgGrade),
                    color: 'white',
                  }}
                />
              </Tooltip>
            )}
          </Box>

          <Box display="flex" flexWrap="wrap" gap={1} sx={{ flexGrow: 1 }}>
            {sortedGrades.map((grade) => {
              const gradeValue = grade.value;
              
              return (
                <Tooltip
                  key={grade.id}
                  title={
                    <>
                      {showDate && formatDate(grade.date)}
                      {grade.comment && (
                        <Typography variant="body2">{grade.comment}</Typography>
                      )}
                    </>
                  }
                >
                  <Badge
                    badgeContent={showDate ? <CalendarMonthIcon fontSize="small" /> : null}
                    color="primary"
                    overlap="circular"
                    invisible={!showDate}
                  >
                    <Chip
                      label={formatGrade(gradeValue)}
                      size={compact ? 'small' : 'medium'}
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: typeof gradeValue === 'number' ? getGradeColor(gradeValue) : '#9E9E9E',
                        color: 'white',
                      }}
                    />
                  </Badge>
                </Tooltip>
              );
            })}
          </Box>
        </Paper>
      </Grid>
    );
  });

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        <FormControlLabel
          control={
            <Switch 
              checked={useRounding}
              onChange={(e) => setUseRounding(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label={
            <Tooltip title={`Порог округления: ${roundingThreshold}. Пример: 3.${Math.round(roundingThreshold * 100)} → 4`}>
              <Typography variant="body2">Округлять оценки</Typography>
            </Tooltip>
          }
        />
      </Box>
      <Grid container spacing={2}>
        {gradeItems}
      </Grid>
    </Box>
  );
};

export default GradeDisplay; 