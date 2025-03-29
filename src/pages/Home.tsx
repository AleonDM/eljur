import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  useTheme,
  IconButton,
  Fab,
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  KeyboardArrowLeft as ArrowLeftIcon,
  KeyboardArrowRight as ArrowRightIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [isBottom, setIsBottom] = useState(false);

  const features = [
    {
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      title: 'Для учителей',
      description: 'Удобное выставление оценок, контроль успеваемости учеников',
    },
    {
      icon: <PersonIcon sx={{ fontSize: 40 }} />,
      title: 'Для учеников',
      description: 'Просмотр оценок, средний балл, фильтрация по предметам',
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      title: 'Аналитика',
      description: 'Статистика успеваемости, средние баллы по предметам',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Безопасность',
      description: 'Надежная защита данных, разграничение прав доступа',
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      
      setIsBottom(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrevFeature = () => {
    setActiveFeature((prev) => (prev - 1 + features.length) % features.length);
  };

  const handleNextFeature = () => {
    setActiveFeature((prev) => (prev + 1) % features.length);
  };

  const scrollToPosition = () => {
    if (isBottom) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        pt: -8,
      }}
    >
      <Container>
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            className="main-title"
            sx={{
              fontWeight: 'bold',
              mb: 4,
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            Электронный дневник
          </Typography>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              mb: 4,
              maxWidth: 600,
              mx: 'auto',
              opacity: 0.9,
            }}
          >
            Современная система управления учебным процессом
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            Войти в систему
          </Button>
        </Box>
      </Container>

      <Box sx={{ bgcolor: 'white', py: 8 }}>
        <Container>
          <Typography
            variant="h3"
            component="h2"
            align="center"
            className="main-title"
            sx={{ mb: 6, color: theme.palette.primary.main }}
          >
            Возможности системы
          </Typography>
          <Box sx={{ position: 'relative', maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ 
              position: 'relative', 
              overflow: 'hidden',
            }}>
              <Box
                sx={{
                  display: 'flex',
                  transition: 'transform 0.5s ease-in-out',
                  transform: `translateX(-${activeFeature * 100}%)`,
                }}
              >
                {features.map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      flex: '0 0 100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Card
                      sx={{
                        width: '100%',
                        maxWidth: '600px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        p: 2,
                        minHeight: 250,
                      }}
                    >
                      <Box sx={{ p: 2, color: theme.palette.primary.main }}>
                        {feature.icon}
                      </Box>
                      <CardContent>
                        <Typography gutterBottom variant="h5" component="h3" sx={{ mb: 2 }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </Box>
            
            <IconButton
              onClick={handlePrevFeature}
              sx={{
                position: 'absolute',
                left: -20,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'white',
                boxShadow: 2,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              <ArrowLeftIcon />
            </IconButton>
            
            <IconButton
              onClick={handleNextFeature}
              sx={{
                position: 'absolute',
                right: -20,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'white',
                boxShadow: 2,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              <ArrowRightIcon />
            </IconButton>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 2,
                gap: 1,
              }}
            >
              {features.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: index === activeFeature ? 'primary.main' : 'grey.300',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveFeature(index)}
                />
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: '#1a1a1a', color: 'white', py: 3 }}>
        <Container>
          <Typography align="center" variant="body2">
            © 2024 Электронный дневник. Все права защищены.
          </Typography>
        </Container>
      </Box>

      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          bgcolor: 'white',
          color: theme.palette.primary.main,
          '&:hover': {
            bgcolor: '#f0f0f0',
          },
        }}
        onClick={scrollToPosition}
      >
        {isBottom ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </Fab>
    </Box>
  );
};

export default Home; 