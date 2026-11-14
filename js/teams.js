// Equipos de la Liga Profesional 2026 (IDs de ESPN).
// base = puntos y partidos de 2024 + 2025 para la tabla de promedios
// (fuente: El Gráfico, "Cómo arrancará la tabla de promedios en la temporada 2026").
// q = búsqueda de noticias en Google News.
export const TEAMS = {
  "5":     { name: "Boca Juniors",            short: "Boca",            base: [129, 73], q: '"Boca Juniors" OR Xeneize', col: ["#0033a0", "#ffcc00"], kw: ["Boca", "Xeneize"], neg: [] },
  "16":    { name: "River Plate",             short: "River",           base: [123, 73], q: '"River Plate"', col: ["#ffffff", "#e30613"], kw: ["River"], neg: ["River Plate de Uruguay"] },
  "15":    { name: "Racing Club",             short: "Racing",          base: [123, 73], q: '"Racing Club"', col: ["#6cace4", "#ffffff"], kw: ["Racing", "Academia"], neg: ["Racing de Córdoba", "Racing (Córdoba)", "Racing de Montevideo", "Racing Club de Montevideo"] },
  "11":    { name: "Independiente",           short: "Independiente",   base: [110, 73], q: '"Independiente" Rojo fútbol', col: ["#e30613", "#ffffff"], kw: ["Independiente", "Rojo de Avellaneda"], neg: ["Rivadavia", "Independiente del Valle", "Independiente Medellín", "Independiente Santa Fe", "Independiente Petrolero"] },
  "18":    { name: "San Lorenzo",             short: "San Lorenzo",     base: [96, 73],  q: '"San Lorenzo" fútbol', col: ["#003a8c", "#d50032"], kw: ["San Lorenzo", "Ciclón"], neg: [] },
  "21":    { name: "Vélez Sarsfield",         short: "Vélez",           base: [116, 73], q: '"Vélez Sarsfield"', col: ["#ffffff", "#1d4fa0"], kw: ["Vélez", "Fortín"], neg: [] },
  "10":    { name: "Huracán",                 short: "Huracán",         base: [109, 73], q: '"Huracán" fútbol Parque Patricios', col: ["#ffffff", "#e30613"], kw: ["Huracán", "Globo"], neg: ["Huracán Las Heras", "Huracán de Tres Arroyos", "Huracán de Comodoro"] },
  "3":     { name: "Argentinos Juniors",      short: "Argentinos",      base: [113, 73], q: '"Argentinos Juniors"', col: ["#e30613", "#ffffff"], kw: ["Argentinos", "Bicho"], neg: [] },
  "17":    { name: "Rosario Central",         short: "Rosario Central", base: [113, 73], q: '"Rosario Central" OR Canalla', col: ["#003a8c", "#ffd200"], kw: ["Rosario Central", "Canalla"], neg: [] },
  "14":    { name: "Newell's Old Boys",       short: "Newell's",        base: [82, 73],  q: '"Newell\'s" OR "Lepra rosarina"', col: ["#e30613", "#111111"], kw: ["Newell's", "Newells", "Lepra"], neg: ["Lepra mendocina"] },
  "12":    { name: "Lanús",                   short: "Lanús",           base: [109, 73], q: '"Lanús" fútbol', col: ["#7a1f2b", "#ffffff"], kw: ["Lanús", "Granate"], neg: [] },
  "19":    { name: "Talleres (Córdoba)",      short: "Talleres",        base: [106, 73], q: '"Talleres" Córdoba fútbol', col: ["#0b2d6b", "#ffffff"], kw: ["Talleres"], neg: ["Talleres de Remedios", "Talleres (RE)"] },
  "4":     { name: "Belgrano (Córdoba)",      short: "Belgrano",        base: [86, 73],  q: '"Belgrano" Córdoba fútbol', col: ["#5bc2e7", "#ffffff"], kw: ["Belgrano", "Pirata"], neg: [] },
  "2975":  { name: "Instituto (Córdoba)",     short: "Instituto",       base: [87, 73],  q: '"Instituto" Córdoba fútbol', col: ["#e30613", "#ffffff"], kw: ["Instituto", "Gloria"], neg: [] },
  "8":     { name: "Estudiantes de La Plata", short: "Estudiantes (LP)",base: [105, 73], q: '"Estudiantes de La Plata"', col: ["#e30613", "#ffffff"], kw: ["Estudiantes", "Pincha"], neg: ["Río Cuarto", "Caseros", "Estudiantes de Buenos Aires", "Estudiantes (BA)", "Estudiantes de Mérida", "Estudiantes (RC)"] },
  "9":     { name: "Gimnasia y Esgrima (LP)", short: "Gimnasia (LP)",   base: [86, 73],  q: '"Gimnasia" "La Plata" fútbol', col: ["#0b2d6b", "#ffffff"], kw: ["Gimnasia", "Lobo platense", "Tripero"], neg: ["Mendoza", "Jujuy", "Gimnasia (M)", "Gimnasia y Tiro", "Mza"] },
  "20":    { name: "Unión (Santa Fe)",        short: "Unión",           base: [99, 73],  q: '"Unión de Santa Fe" OR Tatengue', col: ["#e30613", "#ffffff"], kw: ["Unión", "Tatengue"], neg: ["Unión Europea", "Unión Industrial", "Unión de Sunchales", "Unión Española", "Unión La Calera", "Unión Cívica"] },
  "17702": { name: "Deportivo Riestra",       short: "Riestra",         base: [100, 73], q: '"Deportivo Riestra"', col: ["#111111", "#ffffff"], kw: ["Riestra"], neg: [] },
  "10060": { name: "Barracas Central",        short: "Barracas",        base: [98, 73],  q: '"Barracas Central"', col: ["#e30613", "#ffffff"], kw: ["Barracas"], neg: [] },
  "8950":  { name: "Defensa y Justicia",      short: "Defensa",         base: [96, 73],  q: '"Defensa y Justicia"', col: ["#ffd200", "#007a3d"], kw: ["Defensa y Justicia", "Halcón de Varela"], neg: [] },
  "7764":  { name: "Platense",                short: "Platense",        base: [92, 73],  q: '"Platense" fútbol', col: ["#6b3a1f", "#ffffff"], kw: ["Platense", "Calamar"], neg: [] },
  "9744":  { name: "Independiente Rivadavia", short: "Ind. Rivadavia",  base: [89, 73],  q: '"Independiente Rivadavia"', col: ["#003a8c", "#ffffff"], kw: ["Independiente Rivadavia", "Rivadavia", "Lepra mendocina"], neg: [] },
  "7767":  { name: "Tigre",                   short: "Tigre",           base: [88, 73],  q: '"Tigre" fútbol Victoria', col: ["#003a8c", "#e30613"], kw: ["Tigre", "Matador de Victoria"], neg: [] },
  "9785":  { name: "Atlético Tucumán",        short: "Atl. Tucumán",    base: [84, 73],  q: '"Atlético Tucumán"', col: ["#6cace4", "#ffffff"], kw: ["Atlético Tucumán", "Decano"], neg: [] },
  "11989": { name: "Central Córdoba (SdE)",   short: "Central Córdoba", base: [84, 73],  q: '"Central Córdoba" Santiago fútbol', col: ["#111111", "#ffffff"], kw: ["Central Córdoba", "Ferroviario"], neg: [] },
  "235":   { name: "Banfield",                short: "Banfield",        base: [76, 73],  q: '"Banfield" fútbol', col: ["#007a3d", "#ffffff"], kw: ["Banfield", "Taladro"], neg: [] },
  "9739":  { name: "Aldosivi",                short: "Aldosivi",        base: [33, 32],  q: '"Aldosivi"', col: ["#007a3d", "#ffd200"], kw: ["Aldosivi", "Tiburón"], neg: [] },
  "10158": { name: "Sarmiento (Junín)",       short: "Sarmiento",       base: [70, 73],  q: '"Sarmiento de Junín"', col: ["#007a3d", "#ffffff"], kw: ["Sarmiento"], neg: [] },
  "11972": { name: "Gimnasia (Mendoza)",      short: "Gimnasia (M)",    base: [0, 0],    q: '"Gimnasia de Mendoza"', col: ["#111111", "#ffffff"], kw: ["Gimnasia de Mendoza", "Gimnasia (M)", "Gimnasia y Esgrima de Mendoza", "Lobo mendocino", "Gimnasia Mendoza"], neg: [] },
  "19685": { name: "Estudiantes (Río Cuarto)",short: "Est. Río Cuarto", base: [0, 0],    q: '"Estudiantes de Río Cuarto"', col: ["#6cace4", "#ffffff"], kw: ["Estudiantes de Río Cuarto", "Río Cuarto", "Estudiantes (RC)", "Celeste de Río Cuarto"], neg: [] },
};

export const logo = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
// Nombres de clubes que no están en TEAMS (Primera Nacional), se completan con los datos de ESPN
export const NAMES = {};
export const teamName = (id, fallback = "") => TEAMS[id]?.short || NAMES[id] || (fallback || "").trim() || "A confirmar";
