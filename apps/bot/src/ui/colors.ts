// Catppuccin Macchiato Color Palette for GITBOT
// A soothing, high-contrast pastel dark theme crafted with color harmony.

export const Macchiato = {
  rosewater: 0xf4dbd6,
  flamingo: 0xf0c6c6,
  pink: 0xf5bde6,
  mauve: 0xc6a0f6,
  red: 0xed8796,
  maroon: 0xee99a0,
  peach: 0xf5a97f,
  yellow: 0xeed49f,
  green: 0xa6da95,
  teal: 0x8bd5ca,
  sky: 0x91d7e3,
  sapphire: 0x7dc4e4,
  blue: 0x8aadf4,
  lavender: 0xb7bdf8,
  text: 0xcad3f5,
  subtext1: 0xb8c0e0,
  subtext0: 0xa5adcb,
  overlay2: 0x939ab7,
  overlay1: 0x8087a2,
  overlay0: 0x6e738d,
  surface2: 0x5b6078,
  surface1: 0x494d64,
  surface0: 0x363a4f,
  base: 0x24273a,
  mantle: 0x1e2030,
  crust: 0x181926,
} as const;

export const BrandColors = {
  primary: Macchiato.mauve, // 0xc6a0f6 - Signature Catppuccin Mauve
  secondary: Macchiato.surface1, // 0x494d64 - Muted Surface
  success: Macchiato.green, // 0xa6da95 - Macchiato Green
  danger: Macchiato.red, // 0xed8796 - Macchiato Red
  warning: Macchiato.peach, // 0xf5a97f - Macchiato Peach
  info: Macchiato.sapphire, // 0x7dc4e4 - Macchiato Sapphire
  purple: Macchiato.mauve, // 0xc6a0f6 - Macchiato Mauve
  blue: Macchiato.blue, // 0x8aadf4 - Macchiato Blue
  teal: Macchiato.teal, // 0x8bd5ca - Macchiato Teal
  lavender: Macchiato.lavender, // 0xb7bdf8 - Macchiato Lavender
  yellow: Macchiato.yellow, // 0xeed49f - Macchiato Yellow
  rosewater: Macchiato.rosewater, // 0xf4dbd6 - Macchiato Rosewater
  pink: Macchiato.pink, // 0xf5bde6 - Macchiato Pink
  maroon: Macchiato.maroon, // 0xee99a0 - Macchiato Maroon
  sky: Macchiato.sky, // 0x91d7e3 - Macchiato Sky
  github: Macchiato.base, // 0x24273a - Macchiato Base
  dark: Macchiato.crust, // 0x181926 - Macchiato Crust
};
