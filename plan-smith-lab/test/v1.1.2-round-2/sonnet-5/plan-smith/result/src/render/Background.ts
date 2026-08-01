/**
 * Plan §매트릭스 #11 (배경/아트): "build(최소)" via procedural background
 * rather than authored art assets — a stage-distinguishing gradient + simple
 * silhouette motif per backgroundTheme, no external image files.
 */
const THEME_COLORS: Record<string, { sky: [string, string]; accent: string }> = {
  meadow: { sky: ['#8fd3f4', '#e8f7d4'], accent: '#6fbf73' },
  cliffside: { sky: ['#7fb8d9', '#f0e6c8'], accent: '#a9895c' },
  hills: { sky: ['#a8d8ea', '#f4f1bb'], accent: '#7a9e5c' },
  canyon: { sky: ['#f4a259', '#f7dba7'], accent: '#c46d3e' },
  'twilight-towers': { sky: ['#5b5f97', '#b6a6ca'], accent: '#3a3d5c' },
  desert: { sky: ['#f6d186', '#fbeec7'], accent: '#d99c5b' },
  cave: { sky: ['#3a3f52', '#6d7285'], accent: '#22232e' },
  'fortress-dusk': { sky: ['#5c3a5b', '#a3607a'], accent: '#2e1f2e' },
  'finale-storm': { sky: ['#2b2d42', '#6b7089'], accent: '#1b1c2b' },
};

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: string,
) {
  const t = THEME_COLORS[theme] ?? THEME_COLORS.meadow;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, t.sky[0]);
  gradient.addColorStop(1, t.sky[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = t.accent;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.85, width * 0.5, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.7, height * 0.9, width * 0.4, Math.PI, 0);
  ctx.fill();
  ctx.globalAlpha = 1;
}
