import { createTheme, ThemeOptions } from '@mui/material';
import { DEFAULT_PRIMARY_COLOR } from './contexts/ThemeContext';

const getThemeOptions = (mode: 'light' | 'dark', customColor?: string | null): ThemeOptions => {
  const primaryColor = mode === 'light' && customColor ? customColor : DEFAULT_PRIMARY_COLOR;
  const isCustomColor = mode === 'light' && customColor;
  
  return {
    palette: {
      mode,
      primary: {
        main: primaryColor,
        light: isCustomColor 
          ? `${primaryColor}CC`
          : '#42a5f5',
        dark: isCustomColor
          ? `${primaryColor}EE`
          : '#1565c0',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#9c27b0',
        light: '#ba68c8',
        dark: '#7b1fa2',
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      text: {
        primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff',
        secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      },
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
              backgroundColor: primaryColor,
              '&:hover': {
                backgroundColor: isCustomColor ? `${primaryColor}EE` : undefined,
              },
            },
          },
          outlined: {
            '&.MuiButton-outlinedPrimary': {
              borderColor: primaryColor,
              color: primaryColor,
            },
          },
          text: {
            '&.MuiButton-textPrimary': {
              color: primaryColor,
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
              color: primaryColor,
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
            color: mode === 'light' ? primaryColor : undefined,
            minWidth: 40,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: mode === 'light' 
                ? `${primaryColor}1A` 
                : 'rgba(255, 255, 255, 0.08)',
              '&:hover': {
                backgroundColor: mode === 'light'
                  ? `${primaryColor}29`
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
            scrollbarColor: mode === 'light' ? '#959595 #f5f5f5' : '#404040 #1e1e1e',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: mode === 'light' ? '#959595' : '#404040',
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
              backgroundColor: primaryColor,
            },
            '&.MuiChip-outlinedPrimary': {
              borderColor: primaryColor,
              color: primaryColor,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: primaryColor,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              color: mode === 'light' ? primaryColor : undefined,
            },
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            '&.MuiCircularProgress-colorPrimary': {
              color: primaryColor,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            '&.MuiLinearProgress-colorPrimary': {
              backgroundColor: `${primaryColor}29`,
              '& .MuiLinearProgress-bar': {
                backgroundColor: primaryColor,
              },
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          standardSuccess: {
            '& .MuiAlert-icon': {
              color: mode === 'light' ? primaryColor : undefined,
            },
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: primaryColor,
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            '&.MuiSvgIcon-colorPrimary': {
              color: primaryColor,
            },
          },
        },
      },
    },
  };
};

export const createAppTheme = (mode: 'light' | 'dark', customColor?: string | null) => 
  createTheme(getThemeOptions(mode, customColor)); 