import { createTheme, ThemeOptions, alpha } from '@mui/material';
import { DEFAULT_PRIMARY_COLOR } from './contexts/ThemeContext';

const getThemeOptions = (mode: 'light' | 'dark', customColor?: string | null): ThemeOptions => {
  // Определяем основной цвет
  const primaryColor = customColor || DEFAULT_PRIMARY_COLOR;
  
  // Функция для создания производных цветов от основного
  const createColorVariants = (color: string) => {
    return {
      lighter: alpha(color, 0.13), // 13% непрозрачности
      light: alpha(color, 0.6),    // 60% непрозрачности
      main: color,                 // 100% основной цвет
      dark: alpha(color, 0.9),     // 90% для более темного варианта
      darker: alpha(color, 0.95),  // 95% для еще более темного варианта
      contrastText: '#FFFFFF',     // Контрастный текст
    };
  };
  
  // Создаём варианты цветов на основе выбранного пользователем или дефолтного цвета
  const primaryVariants = createColorVariants(primaryColor);
  
  // Стандартные цвета Material UI для темной темы
  const darkPrimaryMain = '#90caf9';
  const darkPrimaryLight = '#e3f2fd';
  const darkPrimaryDark = '#42a5f5';
  
  // Используем эти цвета для темной темы или настраиваемые для светлой
  const primary = {
    main: mode === 'light' ? primaryColor : (customColor || darkPrimaryMain),
    light: mode === 'light' ? primaryVariants.light : darkPrimaryLight,
    dark: mode === 'light' ? primaryVariants.dark : darkPrimaryDark,
    contrastText: '#FFFFFF',
  };
  
  // Цвета для secondary
  const secondaryMain = mode === 'light' && customColor ? primaryVariants.light : '#9c27b0';
  const secondaryLight = mode === 'light' && customColor ? primaryVariants.lighter : '#ba68c8';
  const secondaryDark = mode === 'light' && customColor ? primaryVariants.dark : '#7b1fa2';
  
  // Цвета для info
  const infoMain = mode === 'light' && customColor ? primaryVariants.light : '#0288d1';
  const infoLight = mode === 'light' && customColor ? primaryVariants.lighter : '#03a9f4';
  const infoDark = mode === 'light' && customColor ? primaryVariants.dark : '#01579b';
  
  return {
    palette: {
      mode,
      primary,
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
        contrastText: '#ffffff',
      },
      info: {
        main: infoMain,
        light: infoLight,
        dark: infoDark,
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      text: {
        primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff',
        secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)',
      },
      action: {
        active: 'rgba(0, 0, 0, 0.54)',
        hover: 'rgba(0, 0, 0, 0.04)',
        selected: 'rgba(0, 0, 0, 0.08)',
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 500,
      },
      h5: {},
      h6: {
        fontWeight: 500,
      },
      subtitle1: {},
      button: {}
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
          contained: {
            '&.MuiButton-containedPrimary': {
              backgroundColor: primary.main,
              '&:hover': {
                backgroundColor: primary.dark,
              },
            },
          },
          outlined: {
            '&.MuiButton-outlinedPrimary': {
              borderColor: primary.main,
              color: primary.main,
            },
          },
          text: {
            '&.MuiButton-textPrimary': {
              color: primary.main,
            },
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&.MuiIconButton-colorPrimary': {
              color: primary.main,
            },
            '&.MuiIconButton-colorInherit': {
              color: 'inherit',
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 40,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: mode === 'light' 
                ? primaryVariants.lighter
                : 'rgba(255, 255, 255, 0.08)',
              '&:hover': {
                backgroundColor: mode === 'light'
                  ? primaryVariants.lighter
                  : 'rgba(255, 255, 255, 0.12)',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: mode === 'light' 
              ? '0 2px 8px rgba(0,0,0,0.1)' 
              : '0 2px 8px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'light' 
              ? (customColor ? `${primaryVariants.light} #f5f5f5` : '#959595 #f5f5f5')
              : '#404040 #1e1e1e',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: mode === 'light' 
                ? (customColor ? primaryVariants.light : '#959595')
                : '#404040',
              minHeight: 24,
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              borderRadius: 8,
              backgroundColor: mode === 'light' ? '#f5f5f5' : '#1e1e1e',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            '&.MuiChip-colorPrimary': {
              backgroundColor: primary.main,
            },
            '&.MuiChip-outlinedPrimary': {
              borderColor: primary.main,
              color: primary.main,
            },
          },
          filled: {},
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: primary.main,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              color: primary.main,
            },
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            '&.MuiCircularProgress-colorPrimary': {
              color: primary.main,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            '&.MuiLinearProgress-colorPrimary': {
              backgroundColor: primaryVariants.lighter,
              '& .MuiLinearProgress-bar': {
                backgroundColor: primary.main,
              },
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          standardSuccess: {
            '& .MuiAlert-icon': {
              color: '#4caf50',
            },
          },
          standardInfo: {
            ...(mode === 'light' && {
              backgroundColor: 'rgba(3, 169, 244, 0.1)',
              color: '#014361',
              '& .MuiAlert-icon': {
                color: '#03a9f4',
              },
              '& .MuiAlert-message': {
                fontWeight: 500,
              },
            }),
            ...(mode === 'dark' && {
              '& .MuiAlert-icon': {
                color: '#03a9f4',
              },
            }),
          },
          standardWarning: {
            '& .MuiAlert-icon': {
              color: '#ff9800',
            },
          },
          standardError: {
            '& .MuiAlert-icon': {
              color: '#f44336',
            },
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: primary.main,
            '&:hover': {
              color: primary.dark,
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            '&.MuiSvgIcon-colorPrimary': {
              color: primary.main,
            },
            '&.MuiSvgIcon-colorSecondary': {
              color: secondaryMain,
            },
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            '&.Mui-checked': {
              color: primary.main,
            },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            '&.Mui-checked': {
              color: primary.main,
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: primary.main,
              '& + .MuiSwitch-track': {
                backgroundColor: primary.light,
              },
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            color: primary.main,
          },
          track: {
            backgroundColor: primary.main,
          },
          thumb: {
            backgroundColor: primary.main,
          }
        },
      },
      MuiAvatar: {
        styleOverrides: {
          colorDefault: {
            backgroundColor: primary.light,
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          colorPrimary: {
            backgroundColor: primary.main,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          primary: {
            backgroundColor: primary.main,
            '&:hover': {
              backgroundColor: primary.dark,
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            '&.MuiDivider-colorPrimary': {
              borderColor: primary.main,
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: mode === 'light' && customColor 
                ? primaryVariants.lighter
                : 'rgba(144, 202, 249, 0.08)',
              color: primary.main,
              '&:hover': {
                backgroundColor: mode === 'light' && customColor 
                  ? primaryVariants.lighter
                  : 'rgba(144, 202, 249, 0.12)',
              },
            },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            '&.Mui-focused': {
              color: primary.main,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            '&.Mui-focused': {
              color: primary.main,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: primary.main,
            },
          },
        },
      },
    },
  };
};

export const createAppTheme = (mode: 'light' | 'dark', customColor?: string | null) => 
  createTheme(getThemeOptions(mode, customColor)); 