// Equipos de la Liga Profesional 2026 (IDs de ESPN).
// base = puntos y partidos de 2024 + 2025 para la tabla de promedios
// (fuente: El Gráfico, "Cómo arrancará la tabla de promedios en la temporada 2026").
// q = búsqueda de noticias en Google News.
export const TEAMS = {
  "5":     { name: "Boca Juniors",            short: "Boca",            base: [129, 73], q: '"Boca Juniors"' },
  "16":    { name: "River Plate",             short: "River",           base: [123, 73], q: '"River Plate"' },
  "15":    { name: "Racing Club",             short: "Racing",          base: [123, 73], q: '"Racing Club"' },
  "11":    { name: "Independiente",           short: "Independiente",   base: [110, 73], q: '"Independiente" Rojo fútbol' },
  "18":    { name: "San Lorenzo",             short: "San Lorenzo",     base: [96, 73],  q: '"San Lorenzo" fútbol' },
  "21":    { name: "Vélez Sarsfield",         short: "Vélez",           base: [116, 73], q: '"Vélez Sarsfield"' },
  "10":    { name: "Huracán",                 short: "Huracán",         base: [109, 73], q: '"Huracán" fútbol Parque Patricios' },
  "3":     { name: "Argentinos Juniors",      short: "Argentinos",      base: [113, 73], q: '"Argentinos Juniors"' },
  "17":    { name: "Rosario Central",         short: "Rosario Central", base: [113, 73], q: '"Rosario Central"' },
  "14":    { name: "Newell's Old Boys",       short: "Newell's",        base: [82, 73],  q: '"Newell\'s"' },
  "12":    { name: "Lanús",                   short: "Lanús",           base: [109, 73], q: '"Lanús" fútbol' },
  "19":    { name: "Talleres (Córdoba)",      short: "Talleres",        base: [106, 73], q: '"Talleres" Córdoba fútbol' },
  "4":     { name: "Belgrano (Córdoba)",      short: "Belgrano",        base: [86, 73],  q: '"Belgrano" Córdoba fútbol' },
  "2975":  { name: "Instituto (Córdoba)",     short: "Instituto",       base: [87, 73],  q: '"Instituto" Córdoba fútbol' },
  "8":     { name: "Estudiantes de La Plata", short: "Estudiantes (LP)",base: [105, 73], q: '"Estudiantes de La Plata"' },
  "9":     { name: "Gimnasia y Esgrima (LP)", short: "Gimnasia (LP)",   base: [86, 73],  q: '"Gimnasia" "La Plata" fútbol' },
  "20":    { name: "Unión (Santa Fe)",        short: "Unión",           base: [99, 73],  q: '"Unión de Santa Fe"' },
  "17702": { name: "Deportivo Riestra",       short: "Riestra",         base: [100, 73], q: '"Deportivo Riestra"' },
  "10060": { name: "Barracas Central",        short: "Barracas",        base: [98, 73],  q: '"Barracas Central"' },
  "8950":  { name: "Defensa y Justicia",      short: "Defensa",         base: [96, 73],  q: '"Defensa y Justicia"' },
  "7764":  { name: "Platense",                short: "Platense",        base: [92, 73],  q: '"Platense" fútbol' },
  "9744":  { name: "Independiente Rivadavia", short: "Ind. Rivadavia",  base: [89, 73],  q: '"Independiente Rivadavia"' },
  "7767":  { name: "Tigre",                   short: "Tigre",           base: [88, 73],  q: '"Tigre" fútbol Victoria' },
  "9785":  { name: "Atlético Tucumán",        short: "Atl. Tucumán",    base: [84, 73],  q: '"Atlético Tucumán"' },
  "11989": { name: "Central Córdoba (SdE)",   short: "Central Córdoba", base: [84, 73],  q: '"Central Córdoba" Santiago fútbol' },
  "235":   { name: "Banfield",                short: "Banfield",        base: [76, 73],  q: '"Banfield" fútbol' },
  "9739":  { name: "Aldosivi",                short: "Aldosivi",        base: [33, 32],  q: '"Aldosivi"' },
  "10158": { name: "Sarmiento (Junín)",       short: "Sarmiento",       base: [70, 73],  q: '"Sarmiento de Junín"' },
  "11972": { name: "Gimnasia (Mendoza)",      short: "Gimnasia (M)",    base: [0, 0],    q: '"Gimnasia de Mendoza"' },
  "19685": { name: "Estudiantes (Río Cuarto)",short: "Est. Río Cuarto", base: [0, 0],    q: '"Estudiantes de Río Cuarto"' },
};

export const logo = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
export const teamName = (id, fallback = "") => TEAMS[id]?.short || fallback || "A confirmar";
