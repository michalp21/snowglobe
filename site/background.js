import * as THREE from 'three';

export function createBackground() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const SCALE = 0.5;
  const HW = 45;                       // half horizontal diagonal
  const HH = 30;                       // half vertical diagonal
  const BLINK_SPEED = 0.25;            // phase units per second (~8 s full cycle)
  const BLINKS_PER_SEC = 3;

  const PALETTE = [
    [250, 200, 210],   // pink
    [200, 220, 245],   // blue
    [205, 240, 205],   // green
    [250, 248, 210],   // yellow
    [225, 210, 245],   // lavender
    [250, 225, 205],   // peach
    [205, 240, 230],   // mint
  ];

  let tiles = [];
  let w, h;

  function rebuild(width, height) {
    w = Math.ceil(width * SCALE);
    h = Math.ceil(height * SCALE);
    canvas.width = w;
    canvas.height = h;
    tiles = [];

    const cols = Math.ceil(w / HW) + 4;
    const rows = Math.ceil(h / HH) + 4;

    for (let j = -2; j <= rows; j++) {
      for (let i = -2; i <= cols; i++) {
        if (((i + j) % 2 + 2) % 2 !== 0) continue;
        const base = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        tiles.push({
          cx: i * HW,
          cy: j * HH,
          base,
          color: [...base],
          target: null,
          phase: -1,
        });
      }
    }
    draw();
  }

  function ease(t) {
    return t * t * (3 - 2 * t);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const t of tiles) {
      ctx.beginPath();
      ctx.moveTo(t.cx, t.cy - HH);
      ctx.lineTo(t.cx + HW, t.cy);
      ctx.lineTo(t.cx, t.cy + HH);
      ctx.lineTo(t.cx - HW, t.cy);
      ctx.closePath();
      ctx.fillStyle = `rgb(${t.color[0]},${t.color[1]},${t.color[2]})`;
      ctx.fill();
    }
  }

  function update(dt) {
    let dirty = false;

    // start new blinks
    if (Math.random() < BLINKS_PER_SEC * dt) {
      const tile = tiles[Math.floor(Math.random() * tiles.length)];
      if (tile.phase < 0) {
        tile.phase = 0;
        let tgt;
        do {
          tgt = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        } while (tgt === tile.base);
        tile.target = tgt;
        dirty = true;
      }
    }

    for (const tile of tiles) {
      if (tile.phase < 0) continue;
      dirty = true;
      tile.phase += BLINK_SPEED * dt;

      if (tile.phase < 1) {
        const f = ease(tile.phase);
        for (let c = 0; c < 3; c++)
          tile.color[c] = Math.round(tile.base[c] + (tile.target[c] - tile.base[c]) * f);
      } else if (tile.phase < 2) {
        const f = ease(tile.phase - 1);
        for (let c = 0; c < 3; c++)
          tile.color[c] = Math.round(tile.target[c] + (tile.base[c] - tile.target[c]) * f);
      } else {
        tile.color = [...tile.base];
        tile.phase = -1;
      }
    }

    if (dirty) {
      draw();
      texture.needsUpdate = true;
    }
  }

  rebuild(window.innerWidth, window.innerHeight);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  function resize(width, height) {
    rebuild(width, height);
    texture.needsUpdate = true;
  }

  return { texture, update, resize };
}
