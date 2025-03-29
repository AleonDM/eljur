import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Alert, CircularProgress, Chip } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getSchedule } from '../../services/api';
import type { Schedule } from '../../services/api';
import { Person as PersonIcon } from '@mui/icons-material';

const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const StudentSchedule: React.FC = () => {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (user?.classId) {
        try {
          setLoading(true);
          const data = await getSchedule(user.classId);
          setSchedule(data);
        } catch (error) {
          setError('Ошибка при загрузке расписания');
          console.error('Ошибка при загрузке расписания:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSchedule();
  }, [user?.classId]);

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedule
      .filter(item => item.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.lessonNumber - b.lessonNumber);
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Урок</TableCell>
              {daysOfWeek.map(day => (
                <TableCell key={day}>{day}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(16)].map((_, lessonIndex) => (
              <TableRow key={lessonIndex}>
                <TableCell>
                  {lessonIndex + 1}
                  <Typography variant="caption" color="textSecondary" display="block">
                    {lessonIndex < 8 ? '(1 смена)' : '(2 смена)'}
                  </Typography>
                </TableCell>
                {daysOfWeek.map((_, dayIndex) => {
                  const lesson = getScheduleForDay(dayIndex + 1).find(
                    item => item.lessonNumber === lessonIndex + 1
                  );
                  return (
                    <TableCell key={dayIndex}>
                      {lesson && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium" color="primary">
                            {lesson.subject}
                          </Typography>
                          
                          {lesson.teacher && (
                            <Chip
                              icon={<PersonIcon />}
                              label={lesson.teacher.name}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ alignSelf: 'flex-start' }}
                            />
                          )}
                          
                          <Typography variant="caption" color="textSecondary">
                            {lesson.startTime} - {lesson.endTime}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default StudentSchedule; 