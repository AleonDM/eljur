import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { createFinalGrade, FinalGrade, Grade, getActiveTrimesters, Trimester } from '../services/api';

interface AutoFinalGradeCalculatorProps {
  open: boolean;
  onClose: () => void;
  onGradesAdded: (grades: FinalGrade[]) => void;
  studentId: string;
  subject: string;
  studentGrade: number;
  currentYear: number;
  studentGrades: Grade[];
  existingFinalGrades: FinalGrade[];
}

type GradeType = 'TRIMESTER1' | 'TRIMESTER2' | 'TRIMESTER3' | 'YEAR';

const gradeTypeLabels: Record<string, string> = {
  TRIMESTER1: '1 триместр',
  TRIMESTER2: '2 триместр',
  TRIMESTER3: '3 триместр',
  YEAR: 'Годовая',
  ATTESTATION: 'Аттестат'
};

const getGradeColor = (value: number | string) => {
  switch (value) {
    case 5: return '#1B5E20'; // темно-зеленый
    case 4: return '#4CAF50'; // зеленый
    case 3: return '#FFC107'; // желтый
    case 2: return '#F44336'; // красный
    case 1: return '#B71C1C'; // темно-красный
    default: return 'inherit';
  }
};

const AutoFinalGradeCalculator: React.FC<AutoFinalGradeCalculatorProps> = ({
  open,
  onClose,
  onGradesAdded,
  studentId,
  subject,
  studentGrade,
  currentYear,
  studentGrades,
  existingFinalGrades,
}) => {
  const [selectedGradeType, setSelectedGradeType] = useState<GradeType>('TRIMESTER1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculatedGrade, setCalculatedGrade] = useState<number | null>(null);
  const [usedGrades, setUsedGrades] = useState<Grade[]>([]);
  const [preview, setPreview] = useState(false);
  const [trimesters, setTrimesters] = useState<Trimester[]>([]);
  const [loadingTrimesters, setLoadingTrimesters] = useState(false);

  // Загружаем триместры при открытии диалога
  useEffect(() => {
    if (open) {
      loadTrimesters();
    }
  }, [open]);

  // Функция загрузки триместров
  const loadTrimesters = async () => {
    try {
      setLoadingTrimesters(true);
      const activeTrimesters = await getActiveTrimesters();
      setTrimesters(activeTrimesters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке триместров');
    } finally {
      setLoadingTrimesters(false);
    }
  };

  // Фильтруем оценки только для выбранного предмета
  const subjectGrades = studentGrades.filter(grade => 
    grade.subject === subject && 
    typeof grade.value === 'number'
  );

  // Получаем существующие итоговые оценки для этого предмета
  const subjectFinalGrades = existingFinalGrades.filter(grade => 
    grade.subject === subject
  );

  // Определяем, какие типы итоговых оценок уже выставлены
  const existingGradeTypes = subjectFinalGrades.map(grade => grade.gradeType);

  // Определяем, какие типы итоговых оценок доступны для выставления
  const availableGradeTypes = ['TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3', 'YEAR']
    .filter(type => !existingGradeTypes.includes(type as GradeType)) as GradeType[];

  // Сбрасываем выбранный тип, если он недоступен
  useEffect(() => {
    if (!availableGradeTypes.includes(selectedGradeType)) {
      setSelectedGradeType(availableGradeTypes[0] || 'TRIMESTER1');
    }
  }, [availableGradeTypes, selectedGradeType]);

  // Функция для определения, какие оценки использовать для расчета
  const getGradesToUse = () => {
    // Добавляем отладочные сообщения
    console.log('Выбранный тип оценки:', selectedGradeType);
    console.log('Доступные триместры:', trimesters);
    console.log('Все оценки ученика:', studentGrades);
    console.log('Оценки по предмету:', subjectGrades);
    
    // Получаем триместр для выбранного типа оценки
    const selectedTrimester = trimesters.find(t => t.type === selectedGradeType);
    console.log('Выбранный триместр:', selectedTrimester);
    
    if (selectedTrimester) {
      // Если нашли триместр в системе, используем его ID для поиска оценок
      console.log('Ищем оценки по trimesterId:', selectedTrimester.id);
      
      // Ищем оценки, у которых trimesterId соответствует выбранному триместру
      const gradesInTrimester = subjectGrades.filter(grade => {
        // Если у оценки есть trimesterId и он совпадает с ID выбранного триместра
        if (grade.trimesterId && grade.trimesterId === selectedTrimester.id) {
          return true;
        }
        
        // Если у оценки нет trimesterId, проверяем по дате, попадает ли она в диапазон триместра
        const gradeDate = new Date(grade.date);
        const startDate = new Date(selectedTrimester.startDate);
        const endDate = new Date(selectedTrimester.endDate);
        
        return gradeDate >= startDate && gradeDate <= endDate;
      });
      
      console.log('Найденные оценки для триместра:', gradesInTrimester);
      return gradesInTrimester.filter(grade => typeof grade.value === 'number');
    } else if (selectedGradeType === 'YEAR') {
      // Для годовой оценки используем оценки за все триместры
      console.log('Расчет годовой оценки');
      
      // Собираем ID всех триместров за текущий учебный год
      const trimesterIds = trimesters
        .filter(t => t.academicYear === currentYear)
        .map(t => t.id);
      
      console.log('ID триместров за текущий учебный год:', trimesterIds);
      
      // Ищем оценки, у которых trimesterId входит в список trimesterIds
      const yearGrades = subjectGrades.filter(grade => {
        if (grade.trimesterId && trimesterIds.includes(grade.trimesterId)) {
          return true;
        }
        
        // Если у оценки нет trimesterId, проверяем по дате
        const gradeDate = new Date(grade.date);
        
        // Используем полный учебный год (1 сентября - 31 мая)
        const startDate = new Date(currentYear, 8, 1); // 1 сентября
        const endDate = new Date(currentYear + 1, 4, 31); // 31 мая
        
        return gradeDate >= startDate && gradeDate <= endDate;
      });
      
      console.log('Найденные оценки для годовой оценки:', yearGrades);
      return yearGrades.filter(grade => typeof grade.value === 'number');
    } else {
      // Если триместр не найден, но тип оценки указан
      console.warn('Триместр не найден в базе данных, используем default значения');
      
      let startDate: Date, endDate: Date;
      const academicYear = currentYear || new Date().getFullYear();
      
      switch (selectedGradeType) {
        case 'TRIMESTER1':
          startDate = new Date(academicYear, 8, 1); // 1 сентября
          endDate = new Date(academicYear, 10, 30); // 30 ноября
          break;
        case 'TRIMESTER2':
          startDate = new Date(academicYear, 11, 1); // 1 декабря
          endDate = new Date(academicYear + 1, 1, 28); // 28 февраля
          break;
        case 'TRIMESTER3':
          startDate = new Date(academicYear + 1, 2, 1); // 1 марта
          endDate = new Date(academicYear + 1, 4, 31); // 31 мая
          break;
        default:
          startDate = new Date(academicYear, 8, 1);
          endDate = new Date(academicYear + 1, 4, 31);
      }
      
      console.log('Ищем оценки в диапазоне дат:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Фильтруем по датам
      const dateFilteredGrades = subjectGrades.filter(grade => {
        const gradeDate = new Date(grade.date);
        return gradeDate >= startDate && gradeDate <= endDate;
      });
      
      console.log('Найденные оценки по датам:', dateFilteredGrades);
      return dateFilteredGrades.filter(grade => typeof grade.value === 'number');
    }
  };

  // Функция для расчета средней оценки с округлением
  const calculateAverageGrade = (grades: Grade[]) => {
    if (grades.length === 0) return null;
    
    const sum = grades.reduce((acc, grade) => {
      return acc + (typeof grade.value === 'number' ? grade.value : 0);
    }, 0);
    
    const average = sum / grades.length;
    
    // Округляем по правилу: если средний балл >= X.60, то округляем вверх
    if (average - Math.floor(average) >= 0.60) {
      return Math.ceil(average);
    } else {
      return Math.floor(average);
    }
  };

  // Предварительный расчет оценки
  const handlePreviewCalculation = () => {
    // Выводим отладочную информацию о доступных оценках
    console.log('Все оценки по предмету:', subjectGrades);
    console.log('Доступные триместры:', trimesters);
    
    const gradesToUse = getGradesToUse();
    console.log('Оценки, выбранные для расчета:', gradesToUse);
    
    setUsedGrades(gradesToUse);
    const calculatedValue = calculateAverageGrade(gradesToUse);
    setCalculatedGrade(calculatedValue);
    setPreview(true);
  };

  // Сохранение итоговой оценки
  const handleSaveGrade = async () => {
    if (calculatedGrade === null) {
      setError('Невозможно рассчитать оценку. Недостаточно данных.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Определяем учебный год на основе триместров или текущей даты
      let academicYear = currentYear;
      if (!academicYear && trimesters.length > 0) {
        const trimester = trimesters.find(t => t.type === selectedGradeType);
        if (trimester) {
          academicYear = trimester.academicYear;
        }
      }
      
      if (!academicYear) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        academicYear = currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
      }
      
      const finalGrade = await createFinalGrade({
        studentId,
        subject,
        gradeType: selectedGradeType,
        value: calculatedGrade,
        year: academicYear,
        comment: `Автоматически рассчитано на основе ${usedGrades.length} оценок`
      });
      
      onGradesAdded([finalGrade]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении оценки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Автоматическое выставление итоговой оценки</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {loadingTrimesters ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : availableGradeTypes.length === 0 ? (
          <Alert severity="info">
            Все итоговые оценки по этому предмету уже выставлены
          </Alert>
        ) : (
          <>
            <Box sx={{ mt: 2, mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Тип оценки</InputLabel>
                <Select
                  value={selectedGradeType}
                  label="Тип оценки"
                  onChange={(e) => setSelectedGradeType(e.target.value as GradeType)}
                  disabled={loading || availableGradeTypes.length === 0}
                >
                  {availableGradeTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {gradeTypeLabels[type]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {preview && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Результат расчета
                </Typography>
                
                {usedGrades.length === 0 ? (
                  <Alert severity="warning">
                    Нет оценок для расчета за выбранный период
                  </Alert>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body1" sx={{ mr: 1 }}>
                        Средний балл:
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: calculatedGrade ? getGradeColor(calculatedGrade) : 'inherit'
                        }}
                      >
                        {calculatedGrade}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Использованные оценки ({usedGrades.length}):
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Оценка</TableCell>
                            <TableCell>Дата</TableCell>
                            <TableCell>Комментарий</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {usedGrades.map((grade) => (
                            <TableRow key={grade.id}>
                              <TableCell>
                                <Typography 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: getGradeColor(grade.value)
                                  }}
                                >
                                  {grade.value}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {new Date(grade.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{grade.comment || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Paper>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        {!preview ? (
          <Button 
            onClick={handlePreviewCalculation} 
            variant="outlined" 
            color="primary" 
            disabled={loading || availableGradeTypes.length === 0}
          >
            Рассчитать
          </Button>
        ) : (
          <Button 
            onClick={handleSaveGrade} 
            variant="contained" 
            color="primary" 
            disabled={loading || calculatedGrade === null}
          >
            {loading ? <CircularProgress size={24} /> : 'Выставить оценку'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AutoFinalGradeCalculator; 