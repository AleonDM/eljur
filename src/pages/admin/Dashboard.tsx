import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
  Tabs,
  Tab,
  Select,
  FormControl,
  Stack,
  InputLabel,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { UserRole } from '../../store/slices/authSlice';
import { getUsers, createUser, deleteUser, getClasses, createClass, deleteClass, assignStudentToClass, getSubjects, createSubject, deleteSubject, updateSubjectGrades, User, Class, Subject } from '../../services/api';
import TrimetersManager from '../../components/TrimetersManager';

interface DeleteConfirmDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmDialog = ({ user, open, onClose, onConfirm }: DeleteConfirmDialogProps) => {
  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Подтверждение удаления</DialogTitle>
      <DialogContent>
        <Typography>
          Вы действительно хотите удалить пользователя {user.name}?
          Это действие нельзя отменить.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={onConfirm} color="error">
          Удалить
        </Button>
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

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'student'>('all');
  const [newSubject, setNewSubject] = useState({
    name: '',
    grades: Array.from({ length: 11 }, (_, i) => i + 1)
  });

  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    role: 'student' as UserRole,
    password: '',
  });

  const [newClass, setNewClass] = useState({
    grade: 1,
    letter: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [loadedUsers, loadedClasses, loadedSubjects] = await Promise.all([
        getUsers(),
        getClasses(),
        getSubjects(),
      ]);
      setUsers(loadedUsers);
      setClasses(loadedClasses);
      setSubjects(loadedSubjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.username.trim() || !newUser.name.trim() || !newUser.password.trim()) {
      setError('Имя пользователя, ФИО и пароль обязательны для заполнения');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const user = await createUser(newUser);
      setUsers([...users, user]);
      setOpen(false);
      setNewUser({
        username: '',
        name: '',
        role: 'student',
        password: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);
      setError('');
      await deleteUser(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClass.letter.trim()) {
      setError('Буква класса обязательна для заполнения');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const classData = await createClass(newClass);
      setClasses([...classes, classData]);
      setClassDialogOpen(false);
      setNewClass({ grade: 1, letter: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании класса');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      setLoading(true);
      setError('');
      await deleteClass(classId);
      setClasses(classes.filter(c => c.id !== classId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении класса');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClass = async (userId: string, classId: string | null) => {
    try {
      setLoading(true);
      setError('');
      const updatedUser = await assignStudentToClass(userId, classId);
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      await loadData(); // Перезагружаем данные для обновления списка классов
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при назначении класса');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.name.trim()) {
      setError('Название предмета обязательно для заполнения');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const subject = await createSubject(newSubject.name, newSubject.grades);
      setSubjects([...subjects, subject]);
      setSubjectDialogOpen(false);
      setNewSubject({
        name: '',
        grades: Array.from({ length: 11 }, (_, i) => i + 1)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании предмета');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    try {
      setLoading(true);
      setError('');
      await deleteSubject(subjectId);
      setSubjects(subjects.filter(s => s.id !== subjectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении предмета');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGrades = async (subjectId: string, grades: number[]) => {
    try {
      setLoading(true);
      setError('');
      const updatedSubject = await updateSubjectGrades(subjectId, grades);
      setSubjects(subjects.map(s => s.id === updatedSubject.id ? updatedSubject : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при обновлении параллелей');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedUsers = users
    .filter(user => 
      user.role !== 'admin' && 
      (roleFilter === 'all' || user.role === roleFilter) &&
      (searchQuery === '' || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.role === b.role) return a.name.localeCompare(b.name);
      return a.role === 'teacher' ? -1 : 1;
    });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Панель администратора
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
        <Tab label="Пользователи" />
        <Tab label="Классы" />
        <Tab label="Предметы" />
        <Tab label="Триместры" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flex: 1, mr: 2 }}>
            <TextField
              label="Поиск"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или логину"
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Фильтр по роли</InputLabel>
              <Select
                value={roleFilter}
                label="Фильтр по роли"
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              >
                <MenuItem value="all">Все пользователи</MenuItem>
                <MenuItem value="teacher">Только учителя</MenuItem>
                <MenuItem value="student">Только ученики</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Добавить пользователя
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Имя пользователя</TableCell>
                <TableCell>ФИО</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Класс</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.role === 'teacher' ? 'Учитель' : 'Ученик'}</TableCell>
                  <TableCell>
                    {user.role === 'student' && (
                      <FormControl fullWidth size="small">
                        <Select
                          value={user.classId || ''}
                          onChange={(e) => handleAssignClass(user.id, e.target.value || null)}
                          disabled={loading}
                        >
                          <MenuItem value="">Нет класса</MenuItem>
                          {classes.map((cls) => (
                            <MenuItem key={cls.id} value={cls.id}>
                              {cls.grade}-{cls.letter}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(user)}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" onClick={() => setClassDialogOpen(true)}>
            Добавить класс
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Класс</TableCell>
                <TableCell>Количество учеников</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>{cls.grade}-{cls.letter}</TableCell>
                  <TableCell>{cls.students?.length || 0}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClass(cls.id)}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" onClick={() => setSubjectDialogOpen(true)}>
            Добавить предмет
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название предмета</TableCell>
                <TableCell>Параллели</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Array.from({ length: 11 }, (_, i) => i + 1).map((grade) => (
                        <Button
                          key={grade}
                          variant={subject.grades.includes(grade) ? "contained" : "outlined"}
                          onClick={() => {
                            const grades = subject.grades.includes(grade)
                              ? subject.grades.filter(g => g !== grade)
                              : [...subject.grades, grade].sort((a, b) => a - b);
                            handleUpdateGrades(subject.id, grades);
                          }}
                          size="small"
                          disabled={loading}
                        >
                          {grade}
                        </Button>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteSubject(subject.id)}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <TrimetersManager />
      </TabPanel>

      <Dialog open={open} onClose={() => !loading && setOpen(false)}>
        <DialogTitle>Добавить нового пользователя</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Имя пользователя"
            fullWidth
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
            disabled={loading}
            required
            error={!newUser.username.trim()}
            helperText={!newUser.username.trim() ? 'Обязательное поле' : ''}
          />
          <TextField
            margin="dense"
            label="ФИО"
            fullWidth
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            disabled={loading}
            required
            error={!newUser.name.trim()}
            helperText={!newUser.name.trim() ? 'Обязательное поле' : ''}
          />
          <TextField
            margin="dense"
            label="Пароль"
            type="password"
            fullWidth
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            disabled={loading}
            required
            error={!newUser.password.trim()}
            helperText={!newUser.password.trim() ? 'Обязательное поле' : ''}
          />
          <TextField
            margin="dense"
            select
            label="Роль"
            fullWidth
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value as UserRole })
            }
            disabled={loading}
          >
            <MenuItem value="teacher">Учитель</MenuItem>
            <MenuItem value="student">Ученик</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleAddUser} disabled={loading}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={classDialogOpen} onClose={() => !loading && setClassDialogOpen(false)}>
        <DialogTitle>Добавить новый класс</DialogTitle>
        <DialogContent>
          <TextField
            select
            margin="dense"
            label="Параллель"
            fullWidth
            value={newClass.grade}
            onChange={(e) => setNewClass({ ...newClass, grade: Number(e.target.value) })}
            disabled={loading}
          >
            {Array.from({ length: 11 }, (_, i) => i + 1).map((grade) => (
              <MenuItem key={grade} value={grade}>
                {grade}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Буква"
            fullWidth
            value={newClass.letter}
            onChange={(e) => setNewClass({ ...newClass, letter: e.target.value.toUpperCase() })}
            disabled={loading}
            required
            error={!newClass.letter.trim()}
            helperText={!newClass.letter.trim() ? 'Обязательное поле' : ''}
            inputProps={{ maxLength: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassDialogOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleAddClass} disabled={loading}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={subjectDialogOpen} onClose={() => !loading && setSubjectDialogOpen(false)}>
        <DialogTitle>Добавить новый предмет</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название предмета"
            fullWidth
            value={newSubject.name}
            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
            disabled={loading}
            required
            error={!newSubject.name.trim()}
            helperText={!newSubject.name.trim() ? 'Обязательное поле' : ''}
          />
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Параллели:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Array.from({ length: 11 }, (_, i) => i + 1).map((grade) => (
              <Button
                key={grade}
                variant={newSubject.grades.includes(grade) ? "contained" : "outlined"}
                onClick={() => {
                  const grades = newSubject.grades.includes(grade)
                    ? newSubject.grades.filter(g => g !== grade)
                    : [...newSubject.grades, grade].sort((a, b) => a - b);
                  setNewSubject({ ...newSubject, grades });
                }}
                size="small"
              >
                {grade}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubjectDialogOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleAddSubject} disabled={loading}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        user={userToDelete}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </Box>
  );
};

export default AdminDashboard; 