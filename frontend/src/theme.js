import { createTheme } from '@mantine/core'

// NextRound design tokens — pastel blue & white, calm/confident "exam room" feel
export const theme = createTheme({
  primaryColor: 'skyblue',
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: { fontFamily: 'Sora, Inter, system-ui, sans-serif', fontWeight: '700' },
  defaultRadius: 'lg',
  colors: {
    skyblue: [
      '#f2f8fd', '#e3f0fb', '#c9e2f7', '#a8d0f2', '#82bced',
      '#5aa6e6', '#3d8ed9', '#3474b8', '#2c5f96', '#244c78',
    ],
    ink: [
      '#f3f6fa', '#e5ebf3', '#c9d6e6', '#a9bdd4', '#8aa4c1',
      '#6d8cae', '#547295', '#3f5a78', '#2b415a', '#1a2b40',
    ],
  },
  primaryShade: 5,
})

export const palette = {
  bg: '#f6fafe',
  bgAlt: '#ffffff',
  border: '#dbe8f5',
  text: '#1a2b40',
  textMuted: '#5b7794',
  accent: '#3d8ed9',
  accentSoft: '#eaf3fc',
  success: '#2e8b57',
  danger: '#c0554a',
}
