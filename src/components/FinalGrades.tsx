import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { FinalGrade } from '../services/api';
import { getGradeColor } from '../utils/gradeUtils';

interface FinalGradesProps {
  grades: FinalGrade[];
  year: number;
}

const FinalGrades: React.FC<FinalGradesProps> = ({ grades, year }) => {
  const subjects = Array.from(new Set(grades.map(g => g.subject))).sort();

  // Форматируем учебный год в виде "2024-2025"
  const formatAcademicYear = (year: number) => {
    return `${year}-${year + 1}`;
  };

  return (
    <Paper sx={{ mb: 3 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Итоговые оценки за {formatAcademicYear(year)} учебный год
        </Typography>
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Предмет</TableCell>
              <TableCell>1 триместр</TableCell>
              <TableCell>2 триместр</TableCell>
              <TableCell>3 триместр</TableCell>
              <TableCell>Годовая</TableCell>
              <TableCell>Аттестат</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map(subject => (
              <TableRow key={subject}>
                <TableCell>{subject}</TableCell>
                {['TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3', 'YEAR', 'ATTESTATION'].map(type => {
                  const grade = grades.find(g => 
                    g.subject === subject && 
                    g.gradeType === type &&
                    g.year === year
                  );
                  
                  return (
                    <TableCell key={type}>
                      {grade && (
                        <Chip
                          label={grade.value}
                          sx={{
                            color: 'white',
                            bgcolor: getGradeColor(grade.value),
                            fontWeight: 'bold'
                          }}
                          title={grade.comment || ''}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default FinalGrades; 