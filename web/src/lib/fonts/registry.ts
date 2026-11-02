// Font choices offered by the layout controls. The @font-face rules and the
// --font-* variables live in src/styles/fonts.css; this file only names them.
// Every sans option currently renders Geist (offline-friendly: the font files
// ship in the bundle, nothing is fetched from Google Fonts).
export const fontRegistry = {
  geist: { label: "Geist" },
  inter: { label: "Inter" },
  notoSans: { label: "Noto Sans" },
  nunitoSans: { label: "Nunito Sans" },
  figtree: { label: "Figtree" },
  roboto: { label: "Roboto" },
  raleway: { label: "Raleway" },
  dmSans: { label: "DM Sans" },
  publicSans: { label: "Public Sans" },
  outfit: { label: "Outfit" },
  geistMono: { label: "Geist Mono" },
  geistPixelSquare: { label: "Geist Pixel Square" },
  jetBrainsMono: { label: "JetBrains Mono" },
  notoSerif: { label: "Noto Serif" },
  robotoSlab: { label: "Roboto Slab" },
  merriweather: { label: "Merriweather" },
  lora: { label: "Lora" },
  playfairDisplay: { label: "Playfair Display" },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontOptions = (Object.entries(fontRegistry) as [FontKey, { label: string }][]).map(([key, f]) => ({
  key,
  label: f.label,
}));
