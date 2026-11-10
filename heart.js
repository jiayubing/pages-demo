'use strict';

const stage = document.querySelector('main');
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

if (context) start();

function start() {
  const heartButton = document.querySelector('.heart');
  const replayButton = document.querySelector('.replay');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const tau = Math.PI * 2;
  const heartCenterY = .075;
  const compact = matchMedia('(max-width: 640px), (max-height: 520px)').matches;
  const palette = ['127, 62, 216', '164, 90, 249', '198, 132, 255', '234, 176, 255', '251, 222, 255', '248, 134, 232'];
  const sprites = palette.map(makeSprite);
  const contour = makeContour();
  const streams = [
    { root: -.93, bend: .46, phase: 1.1 },
    { root: -.48, bend: .35, phase: 2.4 },
    { root: 0, bend: .26, phase: 4.8 },
    { root: .48, bend: -.37, phase: 3.2 },
    { root: .93, bend: -.48, phase: 5.6 },
  ];
  const streamHeads = streams.map((stream, index) => ({
    root: stream.root * 1.28, bend: stream.bend * 1.65, streamPhase: stream.phase,
    below: .23, target: edgeAt([.27, .78, .49, .19, .72][index]),
    delay: [.15, .49, .05, .72, .31][index], duration: [2.1, 2.6, 1.8, 2.45, 2.25][index],
    hue: [3, 5, 2, 3, 4][index],
  }));
  const streamPoint = { x: 0, y: 0 };
  const projected = { x: 0, y: 0, depth: 0, magnification: 1 };
  const particles = [];
  const rimFlow = Array.from({ length: compact ? 420 : 620 }, (_, index) => ({
    u: Math.random(), radius: range(.865, 1.075), phase: range(0, tau),
    speed: index % 4 === 0 ? range(-.093, -.055) : range(.045, .12),
    layer: index % 4 === 0 ? range(-.92, -.31) : range(.24, .97),
    size: range(4.5, 11), hue: [2, 3, 5, 1][index % 4],
  }));
  const stars = Array.from({ length: compact ? 86 : 168 }, () => ({
    x: Math.random(), y: Math.random(), size: range(1.2, 4), phase: range(0, tau),
    opacity: range(.09, .41), hue: Math.random() < .84 ? 1 : 4,
  }));
  const sparks = Array.from({ length: compact ? 28 : 54 }, () => ({
    angle: range(0, tau), radius: range(1.04, 1.52), size: range(1.8, 5.3), phase: range(0, tau),
  }));

  let width, height, unit, centerX, centerY;
  let pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0;
  let previousFrame = performance.now();
  let enteredAt = previousFrame;
  let touchedAt = -Infinity;
  let frame = 0;

  // A softly inflated shell, with extra points where the edge catches the light.
  for (let i = 0; i < (compact ? 1350 : 2370); i++) {
    const u = Math.random();
    const rim = i % 5 === 0;
    const radius = rim ? range(.90, 1.035) : Math.sqrt(Math.random()) * .994;
    const side = Math.random() > .32 ? 1 : -1;
    addParticle(u, radius, side, rim ? .94 : range(.42, .86), rim ? range(4.1, 9.5) : range(2.5, 6.4));
  }

  for (let i = 0; i < (compact ? 130 : 235); i++) {
    addParticle(Math.random(), 1.02 + Math.random() ** 2 * .18, 1, range(.09, .31), range(2.3, 7));
  }

  // Curving fibers give the heart structure between the brighter grains.
  const fiberCount = compact ? 21 : 33;
  for (let i = 0; i < fiberCount; i++) {
    const origin = i / fiberCount + range(-.022, .022);
    const radius = range(.4, .96);
    const bend = range(.14, .39);
    for (let j = 0; j < 43; j++) {
      const along = j / 42;
      const fade = Math.sin(Math.PI * along);
      addParticle(origin + along * bend, radius + .058 * fade + range(-.009, .009),
        1, fade * range(.26, .60), range(2.3, 4.8));
    }
  }

  const glints = particles.filter((_, index) => index % 199 === 37);

  function range(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function ease(value) {
    return value * value * (3 - 2 * value);
  }

  function edgeAt(u) {
    const index = Math.floor(((u % 1 + 1) % 1) * contour.length);
    return contour[index];
  }

  function shellDepth(radius, y) {
    return .77 * Math.sqrt(Math.max(0, 1 - radius ** 2)) * (1 - Math.max(0, y) * .31);
  }

  function makeContour() {
    const points = [];
    let length = 0;
    for (let i = 0; i <= 720; i++) {
      const t = i / 720 * tau;
      const x = Math.sin(t) ** 3;
      const y = (-13 * Math.cos(t) + 5 * Math.cos(2 * t) + 2 * Math.cos(3 * t) + Math.cos(4 * t) - 2.4) / 16;
      const previous = points[i - 1];
      if (previous) length += Math.hypot(x - previous.x, y - previous.y);
      points.push({ x, y, length });
    }
    return Array.from({ length: 720 }, (_, i) => {
      const distance = i / 720 * length;
      const end = points.findIndex(point => point.length >= distance);
      if (end === 0) return points[0];
      const a = points[end - 1];
      const b = points[end];
      const mix = (distance - a.length) / (b.length - a.length);
      return { x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix };
    });
  }

  function addParticle(u, radius, side, opacity, size) {
    const edge = edgeAt(u);
    const x = edge.x * radius;
    const y = heartCenterY + (edge.y - heartCenterY) * radius;
    const z = shellDepth(radius, y) * side + range(-.046, .046);
    const light = -x * .24 - y * .23 + range(0, .95) + (side < 0 ? -.16 : .08);
    let hue = Math.floor(clamp(light) * 4.99);
    if (x > .08 && Math.random() < .26) hue = 5;
    const stream = streams[Math.floor(Math.random() * streams.length)];
    particles.push({
      x, y, z, opacity, size, hue, u,
      phase: range(0, tau), speed: range(.6, 2.3),
      root: stream.root + range(-.15, .15), bend: stream.bend + range(-.085, .085),
      streamPhase: stream.phase + range(-.46, .46), below: range(.06, .72),
      delay: range(0, 1.07) + Math.abs(stream.root) * .22,
      duration: range(1.64, 2.75) + (.85 - y) * .52,
      comet: particles.length % 34 === 0,
    });
  }

  function followStream(particle, progress, targetX, targetY) {
    const left = 1 - progress;
    const curl = Math.sin(Math.PI * progress) * Math.sin(progress * 9 + particle.streamPhase);
    const rootX = centerX + particle.root * unit;
    const rootY = height + particle.below * unit;
    streamPoint.x = targetX + (rootX - targetX) * left ** 1.4
      + (curl * .27 + Math.sin(tau * progress) * particle.bend) * unit * left ** .4;
    streamPoint.y = targetY + (rootY - targetY) * left ** 1.85;
  }

  function makeSprite(color) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48;
    const brush = sprite.getContext('2d');
    const glow = brush.createRadialGradient(24, 24, 0, 24, 24, 24);
    glow.addColorStop(0, `rgba(${color}, 1)`);
    glow.addColorStop(.17, `rgba(${color}, .95)`);
    glow.addColorStop(.32, `rgba(${color}, .45)`);
    glow.addColorStop(.63, `rgba(${color}, .09)`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    brush.fillStyle = glow;
    brush.fillRect(0, 0, 48, 48);
    return sprite;
  }

  function drawDot(x, y, size, hue, alpha) {
    context.globalAlpha = clamp(alpha);
    context.drawImage(sprites[hue], x - size / 2, y - size / 2, size, size);
  }

  function drawAura(x, y, radius, color, alpha) {
    const aura = context.createRadialGradient(x, y, 0, x, y, radius);
    aura.addColorStop(0, `rgba(${color}, .21)`);
    aura.addColorStop(.50, `rgba(${color}, .09)`);
    aura.addColorStop(1, `rgba(${color}, 0)`);
    context.globalAlpha = alpha;
    context.fillStyle = aura;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function project(x, y, z, pose) {
    const turnedX = x * pose.cosYaw + z * pose.sinYaw;
    const turnedZ = z * pose.cosYaw - x * pose.sinYaw;
    const tiltedY = y * pose.cosPitch - turnedZ * pose.sinPitch;
    const depth = y * pose.sinPitch + turnedZ * pose.cosPitch;
    const magnification = 1 / (1 - depth * .27);
    const pixels = unit * magnification;
    projected.x = centerX + (turnedX * pose.cosRoll - tiltedY * pose.sinRoll) * pixels;
    projected.y = centerY + (turnedX * pose.sinRoll + tiltedY * pose.cosRoll) * pixels;
    projected.depth = depth;
    projected.magnification = magnification;
  }

  function placeOnRim(u, radius, layer, scale, pose) {
    const position = ((u % 1 + 1) % 1) * contour.length;
    const index = Math.floor(position);
    const a = contour[index];
    const b = contour[(index + 1) % contour.length];
    const mix = position - index;
    const x = (a.x + (b.x - a.x) * mix) * radius;
    const y = heartCenterY + (a.y + (b.y - a.y) * mix - heartCenterY) * radius;
    project(x * scale, y * scale, shellDepth(radius, y) * layer, pose);
  }

  function drawContourLight(leading, direction, length, strength, hue, scale, pose) {
    const count = 33;
    for (let i = 0; i < count; i++) {
      const fraction = i / count;
      const shimmer = .76 + .24 * Math.cos(i * 1.67);
      const u = leading - direction * fraction * length;
      const alpha = strength * (1 - fraction) ** 1.5 * shimmer;
      const radius = .976 + .024 * Math.sin(i * .48);
      placeOnRim(u, radius, .22, scale, pose);
      drawDot(projected.x, projected.y, (5.2 + (1 - fraction) * 7) * projected.magnification, hue, alpha);
      placeOnRim(u, radius - .062, .66, scale, pose);
      drawDot(projected.x, projected.y, (8 + (1 - fraction) * 9) * projected.magnification, hue, alpha * .42);
    }
  }

  function drawRimFlow(t, reveal, scale, pose) {
    // Grains travel in both directions through three faster bands of light.
    const front = t * .115;
    const widthScale = .88 + Math.min(1, unit / 260) * .18;
    for (const grain of rimFlow) {
      const u = grain.u + t * grain.speed;
      const wave = (.5 + .5 * Math.cos((u - front) * 3 * tau)) ** 4;
      const radius = grain.radius + Math.sin(t * 2.3 + grain.phase) * .032;
      const flicker = .82 + .18 * Math.sin(t * 3.4 + grain.phase);
      placeOnRim(u, radius, grain.layer, scale, pose);
      const depthLight = .76 + projected.depth * .40;
      drawDot(projected.x, projected.y, grain.size * widthScale * (1 + wave * .33) * projected.magnification,
        grain.hue, reveal * (.32 + wave * .68) * flicker * depthLight);
    }

    for (let i = 0; i < 3; i++) {
      const leading = front + i / 3 + .019;
      const strength = reveal * (.52 + .19 * Math.sin(t * 1.65 + i * 2.1));
      drawContourLight(leading, 1, .116, strength, i === 1 ? 5 : 3, scale, pose);
    }
  }

  function drawStreamHeads(elapsed) {
    for (const head of streamHeads) {
      const progress = (elapsed - head.delay) / head.duration;
      if (progress <= 0 || progress >= 1) continue;
      const tail = Math.max(0, progress - .23);
      const targetX = centerX + head.target.x * unit;
      const targetY = centerY + head.target.y * unit;
      const strength = ease(clamp(progress * 8)) * (1 - ease(clamp((progress - .76) / .24)));
      followStream(head, progress, targetX, targetY);
      const tipX = streamPoint.x;
      const tipY = streamPoint.y;
      followStream(head, tail, targetX, targetY);
      const gradient = context.createLinearGradient(streamPoint.x, streamPoint.y, tipX, tipY);
      gradient.addColorStop(0, `rgba(${palette[head.hue]}, 0)`);
      gradient.addColorStop(.7, `rgba(${palette[head.hue]}, .35)`);
      gradient.addColorStop(1, `rgba(${palette[4]}, .92)`);
      context.beginPath();
      context.moveTo(streamPoint.x, streamPoint.y);
      for (let i = 1; i <= 22; i++) {
        followStream(head, tail + (progress - tail) * i / 22, targetX, targetY);
        context.lineTo(streamPoint.x, streamPoint.y);
      }
      context.strokeStyle = gradient;
      context.lineCap = 'round';
      context.globalAlpha = strength * .26;
      context.lineWidth = 6;
      context.stroke();
      context.globalAlpha = strength;
      context.lineWidth = 2.3;
      context.stroke();
      drawDot(tipX, tipY, 32, head.hue, strength * .73);
      drawDot(tipX, tipY, 12, 4, strength);
    }
  }

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    const density = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    unit = Math.min(width * .375, height * .31, 300);
    centerX = width / 2;
    centerY = height * .47;
    if (reducedMotion.matches) draw(0, true);
  }

  function draw(time, still) {
    const elapsed = still ? 5.5 : Math.max(0, (time - enteredAt) / 1000);
    const t = still ? 0 : time / 1000;
    const reveal = ease(clamp((elapsed - 1.25) / 2.7));
    const touchAge = still ? Infinity : (time - touchedAt) / 1000;
    const breath = still ? 0 : Math.sin(t * 1.25);
    const scale = 1 + breath * reveal * .008;
    const turn = Math.max(0, elapsed - 3.1);
    const yaw = still ? .24 : (Math.sin(turn * .62) * .59 + tiltX * .20) * reveal;
    const pitch = still ? -.12 : (-.11 + Math.sin(turn * .78) * .16 + tiltY * .12) * reveal;
    const roll = still ? 0 : Math.sin(turn * .62) * .075 * reveal;
    const pose = {
      cosYaw: Math.cos(yaw), sinYaw: Math.sin(yaw),
      cosPitch: Math.cos(pitch), sinPitch: Math.sin(pitch),
      cosRoll: Math.cos(roll), sinRoll: Math.sin(roll),
    };

    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, width, height);
    for (const star of stars) {
      drawDot(star.x * width, star.y * height, star.size, star.hue,
        star.opacity * (.76 + Math.sin(t * 1.25 + star.phase) * .24));
    }

    const risingGlow = ease(clamp(elapsed / .65)) * (1 - ease(clamp((elapsed - .8) / 2.2)));
    if (risingGlow > 0) drawAura(centerX, height * .86, unit * 1.45, '145, 54, 232', risingGlow * .72);
    const glow = reveal * (.84 + .1 * breath);
    project(-.33, -.36, .47, pose);
    drawAura(projected.x, projected.y, unit * .94, '138, 70, 227', glow);
    project(.39, -.20, .14, pose);
    drawAura(projected.x, projected.y, unit * .85, '173, 46, 181', glow * .65);

    context.globalCompositeOperation = 'lighter';
    if (elapsed < 3.4) drawStreamHeads(elapsed);
    for (const p of particles) {
      const local = clamp((elapsed - p.delay) / p.duration);
      if (local === 0) continue;
      const phase = t * p.speed + p.phase;
      const ripple = Math.sin(p.u * tau * 3 - t * 2.4 + p.z * 5);
      const wave = still ? 0 : (ripple * .015 + Math.sin(phase) * .009) * reveal;
      const x = p.x * (scale + wave);
      const y = p.y * (scale + wave);
      const z = p.z + (still ? 0 : Math.sin(phase * .8) * .032);
      project(x, y, z, pose);
      const px = projected.x;
      const py = projected.y;
      const shimmer = .77 + Math.sin(phase) * .14 + ripple * .22;
      const depthLight = .79 + projected.depth * .48;
      const size = p.size * (.85 + Math.min(1, unit / 285) * .25) * projected.magnification;
      if (local < 1) {
        const fade = ease(clamp(local * 8));
        const streak = Math.sin(Math.PI * local);
        if (p.comet) {
          for (let i = 9; i >= 1; i--) {
            followStream(p, Math.max(0, local - i * .007), px, py);
            drawDot(streamPoint.x, streamPoint.y, size * (1.87 - i * .092), p.hue, streak * fade * (1 - i / 10) * .78);
          }
        }
        followStream(p, local, px, py);
        drawDot(streamPoint.x, streamPoint.y, size * (1 + streak * .82 + (1 - local) * .27), p.hue,
          fade * p.opacity * (shimmer + streak * .25) * (1 + (depthLight - 1) * local));
        p.screenX = streamPoint.x;
        p.screenY = streamPoint.y;
      } else {
        drawDot(px, py, size, p.hue, p.opacity * shimmer * depthLight);
        p.screenX = px;
        p.screenY = py;
      }
    }

    // Two lights climb from the tip and trace the lobes as the streams settle.
    const tracing = clamp((elapsed - 1.35) / 2.1);
    if (tracing > 0 && tracing < 1) {
      const advance = ease(tracing) * .5;
      const strength = Math.sin(Math.PI * tracing) ** .65;
      const tail = Math.min(advance, .105);
      drawContourLight(.5 - advance, -1, tail, strength * .85, 5, scale, pose);
      drawContourLight(.5 + advance, 1, tail, strength, 4, scale, pose);
    }

    const rimReveal = ease(clamp((elapsed - 2.65) / 1.55));
    if (rimReveal > 0) drawRimFlow(t, rimReveal, scale, pose);

    for (const spark of sparks) {
      const angle = spark.angle + (still ? 0 : t * .074);
      const radius = spark.radius + Math.sin(t * .6 + spark.phase) * .058;
      const x = centerX + Math.cos(angle) * radius * unit;
      const y = centerY + Math.sin(angle) * radius * unit * .72;
      drawDot(x, y, spark.size, 2, reveal * (.22 + .19 * Math.sin(t * 1.5 + spark.phase)));
    }

    for (const p of glints) {
      const flash = Math.max(0, Math.sin(t * p.speed + p.phase)) ** 9 * reveal;
      if (flash < .12 || elapsed <= p.delay) continue;
      const radius = 3 + flash * 4;
      const x = p.screenX, y = p.screenY;
      drawDot(x, y, radius * 3, 3, flash * .36);
      context.globalAlpha = flash * .75;
      context.fillStyle = '#f7d8ff';
      context.beginPath();
      context.moveTo(x, y - radius);
      context.quadraticCurveTo(x + .52, y - .52, x + radius * .72, y);
      context.quadraticCurveTo(x + .52, y + .52, x, y + radius);
      context.quadraticCurveTo(x - .52, y + .52, x - radius * .72, y);
      context.quadraticCurveTo(x - .52, y - .52, x, y - radius);
      context.fill();
    }

    if (touchAge >= 0 && touchAge < 1.25) {
      const progress = touchAge / 1.25;
      const radius = .62 + ease(progress) * 1.11;
      for (const spark of sparks) {
        const x = centerX + Math.cos(spark.angle) * unit * radius;
        const y = centerY + Math.sin(spark.angle) * unit * radius * .76;
        drawDot(x, y, spark.size * 1.6, 3, (1 - progress) ** 2 * .85);
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function animate(time) {
    const smoothing = 1 - Math.exp(-Math.min(80, time - previousFrame) / 145);
    previousFrame = time;
    tiltX += (pointerX - tiltX) * smoothing;
    tiltY += (pointerY - tiltY) * smoothing;
    draw(time, false);
    frame = requestAnimationFrame(animate);
  }

  function applyMotionPreference() {
    cancelAnimationFrame(frame);
    heartButton.hidden = replayButton.hidden = reducedMotion.matches;
    if (reducedMotion.matches) draw(0, true);
    else {
      enteredAt = previousFrame = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }

  replayButton.addEventListener('click', () => {
    enteredAt = performance.now();
    touchedAt = -Infinity;
  });
  heartButton.addEventListener('click', () => { touchedAt = performance.now(); });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointerX = clamp(event.clientX / width) * 2 - 1;
    pointerY = 1 - clamp(event.clientY / height) * 2;
  });
  stage.addEventListener('pointerleave', () => { pointerX = pointerY = 0; });
  reducedMotion.addEventListener('change', applyMotionPreference);
  new ResizeObserver(resize).observe(stage);
  resize();
  document.querySelector('.fallback').setAttribute('hidden', '');
  applyMotionPreference();
}
