# Liga Profesional 2026

Sitio estático con resultados en vivo (aviso con campanita en cada gol), zonas, tabla anual, promedios, playoffs, página por club y noticias.

- **En vivo**: el navegador consulta ESPN cada 12 s mientras hay partidos.
- **Fixture y noticias**: GitHub Actions (`.github/workflows/datos.yml`) regenera `data/partidos.json` y `data/noticias.json` cada 30 min.
- **Promedios**: base 2024+2025 en `js/teams.js` (El Gráfico) + puntos 2026 de la tabla anual.
- Publicado con GitHub Pages.
