// Equipos de la Liga Profesional 2026 (IDs de ESPN).
// base = puntos y partidos de 2024 + 2025 para la tabla de promedios
// (fuente: El Gráfico, "Cómo arrancará la tabla de promedios en la temporada 2026").
// q = búsqueda de noticias en Google News.
export const TEAMS = {
  "5":     { name: "Boca Juniors",            short: "Boca",            base: [129, 73], q: '"Boca Juniors"', col: ["#0033a0", "#ffcc00"] },
  "16":    { name: "River Plate",             short: "River",           base: [123, 73], q: '"River Plate"', col: ["#ffffff", "#e30613"] },
  "15":    { name: "Racing Club",             short: "Racing",          base: [123, 73], q: '"Racing Club"', col: ["#6cace4", "#ffffff"] },
  "11":    { name: "Independiente",           short: "Independiente",   base: [110, 73], q: '"Independiente" Rojo fútbol', col: ["#e30613", "#ffffff"] },
  "18":    { name: "San Lorenzo",             short: "San Lorenzo",     base: [96, 73],  q: '"San Lorenzo" fútbol', col: ["#003a8c", "#d50032"] },
  "21":    { name: "Vélez Sarsfield",         short: "Vélez",           base: [116, 73], q: '"Vélez Sarsfield"', col: ["#ffffff", "#1d4fa0"] },
  "10":    { name: "Huracán",                 short: "Huracán",         base: [109, 73], q: '"Huracán" fútbol Parque Patricios', col: ["#ffffff", "#e30613"] },
  "3":     { name: "Argentinos Juniors",      short: "Argentinos",      base: [113, 73], q: '"Argentinos Juniors"', col: ["#e30613", "#ffffff"] },
  "17":    { name: "Rosario Central",         short: "Rosario Central", base: [113, 73], q: '"Rosario Central"', col: ["#003a8c", "#ffd200"] },
  "14":    { name: "Newell's Old Boys",       short: "Newell's",        base: [82, 73],  q: '"Newell\'s"', col: ["#e30613", "#111111"] },
  "12":    { name: "Lanús",                   short: "Lanús",           base: [109, 73], q: '"Lanús" fútbol', col: ["#7a1f2b", "#ffffff"] },
  "19":    { name: "Talleres (Córdoba)",      short: "Talleres",        base: [106, 73], q: '"Talleres" Córdoba fútbol', col: ["#0b2d6b", "#ffffff"] },
  "4":     { name: "Belgrano (Córdoba)",      short: "Belgrano",        base: [86, 73],  q: '"Belgrano" Córdoba fútbol', col: ["#5bc2e7", "#ffffff"] },
  "2975":  { name: "Instituto (Córdoba)",     short: "Instituto",       base: [87, 73],  q: '"Instituto" Córdoba fútbol', col: ["#e30613", "#ffffff"] },
  "8":     { name: "Estudiantes de La Plata", short: "Estudiantes (LP)",base: [105, 73], q: '"Estudiantes de La Plata"', col: ["#e30613", "#ffffff"] },
  "9":     { name: "Gimnasia y Esgrima (LP)", short: "Gimnasia (LP)",   base: [86, 73],  q: '"Gimnasia" "La Plata" fútbol', col: ["#0b2d6b", "#ffffff"] },
  "20":    { name: "Unión (Santa Fe)",        short: "Unión",           base: [99, 73],  q: '"Unión de Santa Fe"', col: ["#e30613", "#ffffff"] },
  "17702": { name: "Deportivo Riestra",       short: "Riestra",         base: [100, 73], q: '"Deportivo Riestra"', col: ["#111111", "#ffffff"] },
  "10060": { name: "Barracas Central",        short: "Barracas",        base: [98, 73],  q: '"Barracas Central"', col: ["#e30613", "#ffffff"] },
  "8950":  { name: "Defensa y Justicia",      short: "Defensa",         base: [96, 73],  q: '"Defensa y Justicia"', col: ["#ffd200", "#007a3d"] },
  "7764":  { name: "Platense",                short: "Platense",        base: [92, 73],  q: '"Platense" fútbol', col: ["#6b3a1f", "#ffffff"] },
  "9744":  { name: "Independiente Rivadavia", short: "Ind. Rivadavia",  base: [89, 73],  q: '"Independiente Rivadavia"', col: ["#003a8c", "#ffffff"] },
  "7767":  { name: "Tigre",                   short: "Tigre",           base: [88, 73],  q: '"Tigre" fútbol Victoria', col: ["#003a8c", "#e30613"] },
  "9785":  { name: "Atlético Tucumán",        short: "Atl. Tucumán",    base: [84, 73],  q: '"Atlético Tucumán"', col: ["#6cace4", "#ffffff"] },
  "11989": { name: "Central Córdoba (SdE)",   short: "Central Córdoba", base: [84, 73],  q: '"Central Córdoba" Santiago fútbol', col: ["#111111", "#ffffff"] },
  "235":   { name: "Banfield",                short: "Banfield",        base: [76, 73],  q: '"Banfield" fútbol', col: ["#007a3d", "#ffffff"] },
  "9739":  { name: "Aldosivi",                short: "Aldosivi",        base: [33, 32],  q: '"Aldosivi"', col: ["#007a3d", "#ffd200"] },
  "10158": { name: "Sarmiento (Junín)",       short: "Sarmiento",       base: [70, 73],  q: '"Sarmiento de Junín"', col: ["#007a3d", "#ffffff"] },
  "11972": { name: "Gimnasia (Mendoza)",      short: "Gimnasia (M)",    base: [0, 0],    q: '"Gimnasia de Mendoza"', col: ["#111111", "#ffffff"] },
  "19685": { name: "Estudiantes (Río Cuarto)",short: "Est. Río Cuarto", base: [0, 0],    q: '"Estudiantes de Río Cuarto"', col: ["#6cace4", "#ffffff"] },
};

export const logo = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
// Nombres de clubes que no están en TEAMS (Primera Nacional), se completan con los datos de ESPN
export const NAMES = {};
export const teamName = (id, fallback = "") => TEAMS[id]?.short || NAMES[id] || (fallback || "").trim() || "A confirmar";
