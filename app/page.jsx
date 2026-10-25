'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CFG = {
  easy:   { grid: 3, label: 'Easy 3×3',   par: { time: 60,  moves: 20 }, pinch: 10 },
  medium: { grid: 4, label: 'Medium 4×4', par: { time: 120, moves: 40 }, pinch: 10 },
  hard:   { grid: 5, label: 'Hard 5×5',   par: { time: 240, moves: 80 }, pinch: 10 }
};

const HCONN = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],[0,17]
];

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function HandPuzzleApp() {
  const [diff, setDiff] = useState('easy');
  const [phase, setPhase] = useState('start'); // start | capture | play | complete
  const [modal, setModal] = useState(null); // 'how' | 'pause' | null
  const [loader, setLoader] = useState({ on: true, text: 'Loading AI model…', pct: 0 });
  const [scores, setScores] = useState({ best_time: null, best_moves: null, games: 0 });
  const [flash, setFlash] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Capture UI state
  const [handL, setHandL] = useState(false);
  const [handR, setHandR] = useState(false);
  const [capInstr, setCapInstr] = useState('Show both hands');
  const [capSub, setCapSub] = useState('We need 2 hands to frame the shot');
  const [ggFrame, setGgFrame] = useState(''); // '' | 'active' | 'done'
  const [ggOpen, setGgOpen] = useState('');   // '' | 'active' | 'done'

  // Play UI state
  const [puzTimerText, setPuzTimerText] = useState('0:00');
  const [progVal, setProgVal] = useState(0);
  const [totalTiles, setTotalTiles] = useState(9);
  const [progPct, setProgPct] = useState(0);
  const [badgeText, setBadgeText] = useState('🤏 Pinch to grab a tile');
  const [badgeClass, setBadgeClass] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  // Complete UI state
  const [winData, setWinData] = useState({ time: '0:00', moves: 0, score: 0, isNew: false, stars: 3, preview: '' });

  // DOM Refs
  const gameRef = useRef(null);
  const capVidRef = useRef(null);
  const capOvlRef = useRef(null);
  const phOvlRef = useRef(null);
  const hcurRef = useRef(null);
  const gridWrapRef = useRef(null);
  const confettiCvRef = useRef(null);

  // Logic Refs
  const handsModelRef = useRef(null);
  const camStreamRef = useRef(null);
  const trackRAFRef = useRef(null);
  const confettiRAFRef = useRef(null);
  const timerIvRef = useRef(null);
  const timerSecRef = useRef(0);
  const moveCountRef = useRef(0);
  const phaseRef = useRef('start');
  const pausedRef = useRef(false);
  const diffRef = useRef('easy');
  const capturedUrlRef = useRef(null);
  const tilesRef = useRef([]);
  const slotsRef = useRef([]);
  const frameRectRef = useRef(null);
  const captureReadyRef = useRef(false);
  const frameLastSeenRef = useRef(0);
  const isSendingRef = useRef(false);
  const pinchFramesRef = useRef(0);
  const draggingRef = useRef(null);
  const mouseGRef = useRef(null);
  const touchGRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    diffRef.current = diff;
    loadScores(diff);
  }, [diff]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Audio helper
  const getAudio = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq, dur, type = 'sine', gain = 0.18, delay = 0) => {
    try {
      const a = getAudio();
      if (!a) return;
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.connect(g);
      g.connect(a.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, a.currentTime + delay);
      g.gain.setValueAtTime(gain, a.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + dur);
      osc.start(a.currentTime + delay);
      osc.stop(a.currentTime + delay + dur);
    } catch (e) {}
  }, [getAudio]);

  const sfxGrab = useCallback(() => playTone(440, 0.06, 'square', 0.1), [playTone]);
  const sfxDrop = useCallback(() => playTone(220, 0.1, 'sine', 0.12), [playTone]);
  const sfxLock = useCallback(() => {
    playTone(523, 0.1, 'sine', 0.15);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.15), 80);
  }, [playTone]);
  const sfxWin = useCallback(() => {
    [523, 659, 784, 1047].forEach((n, i) => playTone(n, 0.3, 'sine', 0.2, i * 0.1));
  }, [playTone]);

  // Scores
  const loadScores = (d) => {
    try {
      const s = JSON.parse(localStorage.getItem('hp_' + d) || '{}');
      setScores({
        best_time: s.best_time ?? null,
        best_moves: s.best_moves ?? null,
        games: s.games || 0
      });
    } catch (e) {}
  };

  const saveScore = (d, time, moves) => {
    try {
      const s = JSON.parse(localStorage.getItem('hp_' + d) || '{}');
      s.games = (s.games || 0) + 1;
      if (!s.best_time || time < s.best_time) {
        s.best_time = time;
        s.is_new = true;
      } else {
        s.is_new = false;
      }
      if (!s.best_moves || moves < s.best_moves) s.best_moves = moves;
      localStorage.setItem('hp_' + d, JSON.stringify(s));
      loadScores(d);
      return s;
    } catch (e) {
      return { is_new: false };
    }
  };

  // MediaPipe Init
  const initMP = useCallback(() => {
    return new Promise((resolve, reject) => {
      let n = 0;
      const iv = setInterval(() => {
        if (typeof window !== 'undefined' && window.Hands) {
          clearInterval(iv);
          const handsModel = new window.Hands({
            locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
          });
          handsModel.setOptions({
            maxNumHands: 2,
            modelComplexity: 0,
            minDetectionConfidence: 0.4,
            minTrackingConfidence: 0.4
          });
          handsModel.onResults(onResults);
          handsModelRef.current = handsModel;
          resolve(handsModel);
        } else if (++n > 100) {
          clearInterval(iv);
          reject(new Error('MediaPipe Hands library load timed out'));
        }
      }, 100);
    });
  }, []);

  // Initial Loader setup
  useEffect(() => {
    let p = 0;
    const biv = setInterval(() => {
      p = Math.min(p + 2, 45);
      setLoader({ on: true, text: 'Loading AI model…', pct: p });
    }, 80);

    initMP()
      .then(() => {
        clearInterval(biv);
        setLoader({ on: true, text: 'Ready!', pct: 100 });
        setTimeout(() => setLoader({ on: false, text: '', pct: 100 }), 300);
      })
      .catch(() => {
        clearInterval(biv);
        setLoader({ on: true, text: 'Loaded offline', pct: 100 });
        setTimeout(() => setLoader({ on: false, text: '', pct: 100 }), 600);
      });

    loadScores('easy');

    return () => {
      clearInterval(biv);
      cleanup();
    };
  }, [initMP]);

  const syncOvl = (cv, vid) => {
    if (!cv || !vid) return;
    const w = vid.videoWidth || vid.clientWidth || 640;
    const h = vid.videoHeight || vid.clientHeight || 480;
    cv.width = w;
    cv.height = h;
  };

  const drawSkel = (ctx, lm, W, H) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    HCONN.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo((1 - lm[a].x) * W, lm[a].y * H);
      ctx.lineTo((1 - lm[b].x) * W, lm[b].y * H);
      ctx.stroke();
    });
    lm.forEach((l, i) => {
      const isKey = i === 4 || i === 8;
      ctx.beginPath();
      ctx.arc((1 - l.x) * W, l.y * H, isKey ? 7 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === 4 ? '#f59e0b' : i === 8 ? '#a5b4fc' : 'rgba(255,255,255,0.7)';
      if (isKey) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = i === 4 ? '#f59e0b' : '#6366f1';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  };

  const getFingers = (lm) => {
    const ex = [];
    const w = lm[0];
    const dT = Math.hypot(lm[4].x - lm[17].x, lm[4].y - lm[17].y);
    const dP = Math.hypot(lm[2].x - lm[17].x, lm[2].y - lm[17].y);
    ex.push(dT > dP * 1.2);
    for (let i of [8, 12, 16, 20]) {
      const dt = Math.hypot(lm[i].x - w.x, lm[i].y - w.y);
      const dp = Math.hypot(lm[i - 2].x - w.x, lm[i - 2].y - w.y);
      ex.push(dt > dp);
    }
    return ex;
  };

  const handleCaptureResults = (res) => {
    const lms = res.multiHandLandmarks || [];
    const cv = capOvlRef.current;
    const vid = capVidRef.current;
    if (!cv || !vid) return;

    syncOvl(cv, vid);
    const W = cv.width, H = cv.height;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    lms.forEach((lm) => drawSkel(ctx, lm, W, H));

    const hasL = lms.length >= 1;
    const hasR = lms.length >= 2;
    setHandL(hasL);
    setHandR(hasR);

    if (hasR) {
      const f1 = getFingers(lms[0]);
      const f2 = getFingers(lms[1]);
      const isFrame1 = f1[0] && f1[1] && !f1[2] && !f1[3] && !f1[4];
      const isFrame2 = f2[0] && f2[1] && !f2[2] && !f2[3] && !f2[4];
      const isOpen1 = f1[0] && f1[1] && f1[2] && f1[3] && f1[4];
      const isOpen2 = f2[0] && f2[1] && f2[2] && f2[3] && f2[4];

      if (isFrame1 && isFrame2) {
        let minX = 999, minY = 999, maxX = -999, maxY = -999;
        [lms[0][4], lms[0][8], lms[1][4], lms[1][8]].forEach((pt) => {
          const px = 1 - pt.x;
          minX = Math.min(minX, px);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, pt.y);
        });
        const pdX = (maxX - minX) * -0.08, pdY = (maxY - minY) * -0.08;
        frameRectRef.current = {
          x: Math.max(0, minX - pdX),
          y: Math.max(0, minY - pdY),
          w: Math.min(1 - (minX - pdX), maxX - minX + pdX * 2),
          h: Math.min(1 - (minY - pdY), maxY - minY + pdY * 2)
        };
        captureReadyRef.current = true;
        frameLastSeenRef.current = Date.now();

        setCapInstr('Good! Now size your frame.');
        setCapSub('Move hands apart to make it bigger.');
        setGgFrame('active');
        setGgOpen('');
      }

      if (captureReadyRef.current && Date.now() - frameLastSeenRef.current > 1500) {
        captureReadyRef.current = false;
        frameRectRef.current = null;
      }

      if (isOpen1 && isOpen2) {
        if (captureReadyRef.current) {
          setGgFrame('done');
          setGgOpen('done');
          doCapture(frameRectRef.current);
          captureReadyRef.current = false;
          return;
        } else {
          doCapture({ x: 0, y: 0, w: 1, h: 1 });
          return;
        }
      }
    } else {
      setCapInstr('Show both hands');
      setCapSub('Frame shot OR open both hands for full screen');
      setGgFrame('');
      setGgOpen('');
    }

    if (captureReadyRef.current && frameRectRef.current) {
      const r = frameRectRef.current;
      ctx.strokeStyle = 'rgba(16,185,129,0.8)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(r.x * W, r.y * H, r.w * W, r.h * H);
      ctx.setLineDash([]);

      const cx = r.x * W, cy = r.y * H, cw = r.w * W, ch = r.h * H, L = 30;
      ctx.beginPath();
      ctx.moveTo(cx, cy + L); ctx.lineTo(cx, cy); ctx.lineTo(cx + L, cy);
      ctx.moveTo(cx + cw - L, cy); ctx.lineTo(cx + cw, cy); ctx.lineTo(cx + cw, cy + L);
      ctx.moveTo(cx, cy + ch - L); ctx.lineTo(cx, cy + ch); ctx.lineTo(cx + L, cy + ch);
      ctx.moveTo(cx + cw - L, cy + ch); ctx.lineTo(cx + cw, cy + ch); ctx.lineTo(cx + cw, cy + ch - L);
      ctx.stroke();

      ctx.fillStyle = 'rgba(16,185,129,0.15)';
      ctx.fillRect(r.x * W, r.y * H, r.w * W, r.h * H);

      if (!(lms.length === 2 && getFingers(lms[0])[0] && !getFingers(lms[0])[2])) {
        setCapInstr('Open hands to SNAP!');
        setCapSub('Spread all 10 fingers open to take the picture');
        setGgFrame('done');
        setGgOpen('active');
      }
    }
  };

  const handlePlayResults = (res) => {
    const lms = res.multiHandLandmarks || [];
    const lm = lms.length > 0 ? lms[0] : null;
    const game = gameRef.current;
    const cv = phOvlRef.current;
    const cur = hcurRef.current;
    if (!game || !cv || !cur) return;

    syncOvl(cv, game);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);

    if (!lm) {
      cur.style.display = 'none';
      return;
    }

    drawSkel(ctx, lm, cv.width, cv.height);
    const pr = game.getBoundingClientRect();
    const nx = 1 - lm[8].x, ny = lm[8].y;
    const sx = pr.left + nx * pr.width, sy = pr.top + ny * pr.height;
    const tx2 = pr.left + (1 - lm[4].x) * pr.width, ty2 = pr.top + lm[4].y * pr.height;
    const pd = Math.hypot(sx - tx2, sy - ty2);
    const isPinch = pd < Math.min(46, pr.width * 0.08);

    cur.style.display = 'block';
    cur.style.left = sx + 'px';
    cur.style.top = sy + 'px';
    cur.classList.toggle('pinch', isPinch);

    if (isPinch) {
      pinchFramesRef.current++;
      setBadgeClass('p');
      if (pinchFramesRef.current === CFG[diffRef.current].pinch && !draggingRef.current) {
        const tile = tileAt(sx, sy);
        if (tile && !tile.locked) {
          sfxGrab();
          startHDrag(tile);
        }
      } else if (draggingRef.current) {
        moveHDrag(sx, sy);
      }
      setBadgeText(
        draggingRef.current
          ? '🤏 Release to drop'
          : `🤏 ${pinchFramesRef.current}/${CFG[diffRef.current].pinch} hold…`
      );
    } else {
      if (draggingRef.current) endHDrag();
      pinchFramesRef.current = 0;
      setBadgeClass('');
      setBadgeText('🤏 Pinch to grab');
    }
  };

  const onResults = (res) => {
    if (phaseRef.current === 'capture') {
      handleCaptureResults(res);
    } else if (phaseRef.current === 'play' && !pausedRef.current) {
      handlePlayResults(res);
    }
  };

  const startTrack = (vid) => {
    const loop = async () => {
      trackRAFRef.current = requestAnimationFrame(loop);
      if (pausedRef.current && phaseRef.current === 'play') return;
      if (isSendingRef.current) return;
      if (vid && vid.readyState >= 2 && handsModelRef.current) {
        isSendingRef.current = true;
        try {
          await handsModelRef.current.send({ image: vid });
        } catch (e) {}
        isSendingRef.current = false;
      }
    };
    loop();
  };

  // Start Camera
  const startGame = async () => {
    setLoader({ on: true, text: 'Requesting camera…', pct: 20 });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      camStreamRef.current = stream;
      if (capVidRef.current) {
        capVidRef.current.srcObject = stream;
        await capVidRef.current.play().catch(() => {});
      }
      setLoader({ on: true, text: 'Loading AI model…', pct: 50 });
      if (!handsModelRef.current) await initMP();
      setLoader({ on: true, text: 'Ready!', pct: 100 });
      await new Promise((r) => setTimeout(r, 400));
      setLoader({ on: false, text: '', pct: 100 });

      frameRectRef.current = null;
      captureReadyRef.current = false;
      setPhase('capture');
      if (capOvlRef.current && capVidRef.current) syncOvl(capOvlRef.current, capVidRef.current);
      startTrack(capVidRef.current);
    } catch (e) {
      setLoader({ on: false, text: '', pct: 0 });
      alert('Camera error: ' + e.message);
    }
  };

  // Capture
  const doCapture = (rect) => {
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    playTone(880, 0.1, 'square', 0.1);
    setTimeout(() => playTone(1047, 0.2, 'square', 0.1), 100);

    cancelAnimationFrame(trackRAFRef.current);
    const vid = capVidRef.current;
    const w = vid?.videoWidth || 640;
    const h = vid?.videoHeight || 480;

    const rw = Math.max(0.1, Math.min(1, rect?.w || 1));
    const rh = Math.max(0.1, Math.min(1, rect?.h || 1));
    const rx = Math.max(0, Math.min(1 - rw, rect?.x || 0));
    const ry = Math.max(0, Math.min(1 - rh, rect?.y || 0));

    const srcX = Math.round((1 - rx - rw) * w);
    const srcY = Math.round(ry * h);
    const srcW = Math.max(20, Math.round(rw * w));
    const srcH = Math.max(20, Math.round(rh * h));

    const tmp = document.createElement('canvas');
    tmp.width = srcW;
    tmp.height = srcH;
    const tc = tmp.getContext('2d');
    tc.translate(srcW, 0);
    tc.scale(-1, 1);
    tc.drawImage(vid, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    const dataUrl = tmp.toDataURL('image/jpeg', 0.9);
    capturedUrlRef.current = dataUrl;
    setTimeout(() => buildPuzzle({ w: srcW, h: srcH }), 400);
  };

  const manualSnap = () => {
    if (frameRectRef.current) doCapture(frameRectRef.current);
    else doCapture({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  };

  const uploadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        capturedUrlRef.current = evt.target.result;
        cancelAnimationFrame(trackRAFRef.current);
        buildPuzzle({ w: img.naturalWidth || 640, h: img.naturalHeight || 480 });
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Build Puzzle
  const buildPuzzle = ({ w: imgW, h: imgH }) => {
    setPhase('play');
    tilesRef.current = [];
    slotsRef.current = [];
    moveCountRef.current = 0;
    timerSecRef.current = 0;
    pausedRef.current = false;
    setIsPaused(false);
    clearInterval(timerIvRef.current);
    setPuzTimerText('0:00');

    const curDiff = diffRef.current;
    const GRID = CFG[curDiff].grid;
    setTotalTiles(GRID * GRID);
    setProgVal(0);
    setProgPct(0);
    setBadgeText('Shuffling tiles…');

    const game = gameRef.current;
    const pw = (game?.clientWidth || 800) - 40;
    const ph = (game?.clientHeight || 600) - 130;
    const imgAspect = imgW / imgH;
    const areaAspect = pw / ph;
    let finalW, finalH;
    if (imgAspect > areaAspect) {
      finalW = pw;
      finalH = pw / imgAspect;
    } else {
      finalH = ph;
      finalW = ph * imgAspect;
    }

    const wrap = gridWrapRef.current;
    if (wrap) {
      wrap.innerHTML = '';
      wrap.style.width = finalW + 'px';
      wrap.style.height = finalH + 'px';
    }

    const tw = finalW / GRID, th = finalH / GRID;

    // Slots
    const newSlots = [];
    for (let i = 0; i < GRID * GRID; i++) {
      const c = i % GRID, r = Math.floor(i / GRID);
      const el = document.createElement('div');
      el.className = 'gslot';
      el.dataset.s = i;
      el.style.cssText = `width:${tw}px;height:${th}px;left:${c * tw}px;top:${r * th}px;`;
      wrap?.appendChild(el);
      newSlots.push({ el });
    }
    slotsRef.current = newSlots;

    // Shuffled tiles
    const order = Array.from({ length: GRID * GRID }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    const newTiles = [];
    for (let i = 0; i < GRID * GRID; i++) {
      const c = i % GRID, r = Math.floor(i / GRID);
      const ns = order[i];
      const sc = ns % GRID, sr = Math.floor(ns / GRID);
      const el = document.createElement('div');
      el.className = 'tile';
      el.style.cssText =
        `width:${tw}px;height:${th}px;left:${sc * tw}px;top:${sr * th}px;` +
        `background-image:url(${capturedUrlRef.current});background-size:${finalW}px ${finalH}px;` +
        `background-position:${-c * tw}px ${-r * th}px;`;

      el.addEventListener('mousedown', (e) => mDown(e, i));
      el.addEventListener('touchstart', (e) => tDown(e, i), { passive: false });

      wrap?.appendChild(el);
      newTiles.push({ id: i, el, slot: ns, locked: false });
    }
    tilesRef.current = newTiles;

    timerIvRef.current = setInterval(() => {
      if (!pausedRef.current) {
        timerSecRef.current++;
        setPuzTimerText(fmt(timerSecRef.current));
      }
    }, 1000);

    setBadgeText('🤏 Pinch to grab a tile');
    if (capVidRef.current) startTrack(capVidRef.current);
  };

  // Tile Drag & Matching
  const tileAt = (sx, sy) => {
    const wrap = gridWrapRef.current;
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    const GRID = CFG[diffRef.current].grid;
    const tw = parseInt(tilesRef.current[0]?.el.style.width || 90);
    const th = parseInt(tilesRef.current[0]?.el.style.height || 90);
    const c = Math.floor((sx - r.left) / tw);
    const rr = Math.floor((sy - r.top) / th);
    if (c < 0 || c >= GRID || rr < 0 || rr >= GRID) return null;
    return tilesRef.current.find((t) => t.slot === rr * GRID + c && !t.locked) || null;
  };

  const nearSlot = (sx, sy) => {
    const wrap = gridWrapRef.current;
    if (!wrap) return 0;
    const gr = wrap.getBoundingClientRect();
    const GRID = CFG[diffRef.current].grid;
    const tw = parseInt(tilesRef.current[0]?.el.style.width || 90);
    const th = parseInt(tilesRef.current[0]?.el.style.height || 90);
    const c = Math.max(0, Math.min(GRID - 1, Math.round((sx - gr.left - tw / 2) / tw)));
    const r = Math.max(0, Math.min(GRID - 1, Math.round((sy - gr.top - th / 2) / th)));
    return r * GRID + c;
  };

  const startHDrag = (tile) => {
    draggingRef.current = { tile };
    tile.el.classList.add('drag');
    tile.el.style.zIndex = '100';
    tile.el.style.transition = 'none';
  };

  const moveHDrag = (sx, sy) => {
    if (!draggingRef.current) return;
    const wrap = gridWrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const tw = parseInt(draggingRef.current.tile.el.style.width);
    const th = parseInt(draggingRef.current.tile.el.style.height);
    draggingRef.current.tile.el.style.left = sx - r.left - tw / 2 + 'px';
    draggingRef.current.tile.el.style.top = sy - r.top - th / 2 + 'px';

    const ns = nearSlot(sx, sy);
    const isLocked = tilesRef.current.some((t) => t.slot === ns && t.locked);
    slotsRef.current.forEach((s, i) => s.el.classList.toggle('hl', i === ns && !isLocked));
  };

  const endHDrag = () => {
    if (!draggingRef.current) return;
    const tile = draggingRef.current.tile;
    const tr = tile.el.getBoundingClientRect();
    const tw = parseInt(tile.el.style.width);
    const th = parseInt(tile.el.style.height);
    sfxDrop();
    snapTo(tile, nearSlot(tr.left + tw / 2, tr.top + th / 2), tw, th);
    draggingRef.current = null;
    slotsRef.current.forEach((s) => s.el.classList.remove('hl'));
  };

  // Mouse fallback
  const mDown = (e, tid) => {
    if (phaseRef.current !== 'play' || pausedRef.current) return;
    e.preventDefault();
    const tile = tilesRef.current.find((t) => t.id === tid);
    if (!tile || tile.locked) return;
    const tr = tile.el.getBoundingClientRect();
    mouseGRef.current = { tile, ox: e.clientX - tr.left, oy: e.clientY - tr.top };
    tile.el.classList.add('drag');
    tile.el.style.zIndex = '100';
    tile.el.style.transition = 'none';
    sfxGrab();
    document.addEventListener('mousemove', mMove);
    document.addEventListener('mouseup', mUp, { once: true });
  };

  const mMove = (e) => {
    if (!mouseGRef.current) return;
    const wrap = gridWrapRef.current;
    if (!wrap) return;
    const gr = wrap.getBoundingClientRect();
    mouseGRef.current.tile.el.style.left = e.clientX - gr.left - mouseGRef.current.ox + 'px';
    mouseGRef.current.tile.el.style.top = e.clientY - gr.top - mouseGRef.current.oy + 'px';

    const ns = nearSlot(e.clientX, e.clientY);
    const isLocked = tilesRef.current.some((t) => t.slot === ns && t.locked);
    slotsRef.current.forEach((s, i) => s.el.classList.toggle('hl', i === ns && !isLocked));
  };

  const mUp = (e) => {
    document.removeEventListener('mousemove', mMove);
    if (!mouseGRef.current) return;
    const tile = mouseGRef.current.tile;
    const tr = tile.el.getBoundingClientRect();
    const tw = parseInt(tile.el.style.width);
    const th = parseInt(tile.el.style.height);
    sfxDrop();
    snapTo(tile, nearSlot(tr.left + tw / 2, tr.top + th / 2), tw, th);
    slotsRef.current.forEach((s) => s.el.classList.remove('hl'));
    mouseGRef.current = null;
  };

  // Touch fallback
  const tDown = (e, tid) => {
    if (phaseRef.current !== 'play' || pausedRef.current) return;
    e.preventDefault();
    const tile = tilesRef.current.find((t) => t.id === tid);
    if (!tile || tile.locked) return;
    const t = e.touches[0];
    const tw = parseInt(tile.el.style.width);
    const th = parseInt(tile.el.style.height);
    touchGRef.current = { tile, id: t.identifier, ox: tw / 2, oy: th / 2 };
    tile.el.classList.add('drag');
    tile.el.style.zIndex = '100';
    tile.el.style.transition = 'none';
    sfxGrab();
    document.addEventListener('touchmove', tMove, { passive: false });
    document.addEventListener('touchend', tUp, { once: true });
  };

  const tMove = (e) => {
    e.preventDefault();
    if (!touchGRef.current) return;
    const t = Array.from(e.touches).find((x) => x.identifier === touchGRef.current.id) || e.touches[0];
    const wrap = gridWrapRef.current;
    if (!wrap) return;
    const gr = wrap.getBoundingClientRect();
    touchGRef.current.tile.el.style.left = t.clientX - gr.left - touchGRef.current.ox + 'px';
    touchGRef.current.tile.el.style.top = t.clientY - gr.top - touchGRef.current.oy + 'px';

    const ns = nearSlot(t.clientX, t.clientY);
    const isLocked = tilesRef.current.some((t) => t.slot === ns && t.locked);
    slotsRef.current.forEach((s, i) => s.el.classList.toggle('hl', i === ns && !isLocked));
  };

  const tUp = () => {
    document.removeEventListener('touchmove', tMove);
    if (!touchGRef.current) return;
    const tile = touchGRef.current.tile;
    const tr = tile.el.getBoundingClientRect();
    const tw = parseInt(tile.el.style.width);
    const th = parseInt(tile.el.style.height);
    sfxDrop();
    snapTo(tile, nearSlot(tr.left + tw / 2, tr.top + th / 2), tw, th);
    slotsRef.current.forEach((s) => s.el.classList.remove('hl'));
    touchGRef.current = null;
  };

  const snapTo = (tile, ns, tw, th) => {
    const GRID = CFG[diffRef.current].grid;
    if (tilesRef.current.some((t) => t.slot === ns && t.locked)) ns = tile.slot;
    const prev = tile.slot;
    const occ = tilesRef.current.find((t) => t.slot === ns && t !== tile && !t.locked);
    if (occ) {
      occ.slot = prev;
      occ.el.style.transition = 'left 0.28s,top 0.28s';
      occ.el.style.left = (prev % GRID) * tw + 'px';
      occ.el.style.top = Math.floor(prev / GRID) * th + 'px';
      setTimeout(() => (occ.el.style.transition = ''), 300);
    }
    tile.slot = ns;
    tile.el.style.transition = 'left 0.28s,top 0.28s';
    tile.el.style.left = (ns % GRID) * tw + 'px';
    tile.el.style.top = Math.floor(ns / GRID) * th + 'px';
    tile.el.style.zIndex = '1';
    tile.el.classList.remove('drag');
    setTimeout(() => (tile.el.style.transition = ''), 300);

    if (ns !== prev) {
      if (tile.slot === tile.id) {
        setTimeout(() => {
          tile.locked = true;
          tile.el.classList.add('locked');
          slotsRef.current[tile.id].el.classList.add('ok');
          sfxLock();
          moveCountRef.current++;
          updateProgress();
          setTimeout(checkWin, 450);
        }, 220);
      } else {
        moveCountRef.current++;
      }
    }
  };

  const updateProgress = () => {
    const locked = tilesRef.current.filter((t) => t.locked).length;
    const total = tilesRef.current.length;
    setProgVal(locked);
    setProgPct(Math.round((locked / total) * 100));
  };

  const checkWin = () => {
    if (phaseRef.current !== 'play') return;
    if (tilesRef.current.every((t) => t.slot === t.id)) {
      clearInterval(timerIvRef.current);
      cancelAnimationFrame(trackRAFRef.current);
      sfxWin();
      const elp = timerSecRef.current;
      const par = CFG[diffRef.current].par;
      const sc = saveScore(diffRef.current, elp, moveCountRef.current);
      const starCount =
        elp <= par.time && moveCountRef.current <= par.moves
          ? 3
          : elp <= par.time * 1.8 || moveCountRef.current <= par.moves * 1.8
          ? 2
          : 1;

      const calculatedScore = Math.max(
        0,
        Math.round(
          (par.time / Math.max(elp, 1)) * 1000 + (par.moves / Math.max(moveCountRef.current, 1)) * 500
        )
      );

      setWinData({
        time: fmt(elp),
        moves: moveCountRef.current,
        score: calculatedScore,
        isNew: sc.is_new,
        stars: starCount,
        preview: capturedUrlRef.current
      });

      setTimeout(() => {
        setPhase('complete');
        startConfetti();
      }, 500);
    }
  };

  // Confetti
  const startConfetti = () => {
    const cv = confettiCvRef.current;
    const game = gameRef.current;
    if (!cv || !game) return;
    cv.width = game.clientWidth;
    cv.height = game.clientHeight;
    const ctx = cv.getContext('2d');
    const cols = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b', '#a5b4fc'];
    const parts = Array.from({ length: 140 }, () => ({
      x: Math.random() * cv.width,
      y: -30 - Math.random() * 150,
      s: 4 + Math.random() * 10,
      c: cols[Math.floor(Math.random() * cols.length)],
      vy: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2.5,
      spin: Math.random() * Math.PI * 2,
      ds: (Math.random() - 0.5) * 0.2,
      shape: Math.random() < 0.3 ? 'circle' : 'rect'
    }));

    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.c;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6);
        }
        ctx.restore();
        p.y += p.vy;
        p.x += p.vx;
        p.spin += p.ds;
        if (p.y > cv.height + 30) {
          p.y = -30;
          p.x = Math.random() * cv.width;
        }
      });
      if (phaseRef.current === 'complete') confettiRAFRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const togglePause = () => {
    if (phase !== 'play') return;
    const next = !isPaused;
    setIsPaused(next);
    setModal(next ? 'pause' : null);
  };

  const restartGame = () => {
    setModal(null);
    const wrap = gridWrapRef.current;
    buildPuzzle({ w: parseInt(wrap?.style.width || 600), h: parseInt(wrap?.style.height || 600) });
  };

  const quitGame = () => {
    setModal(null);
    cleanup();
    loadScores(diffRef.current);
    setPhase('start');
  };

  const playAgain = () => {
    cleanup();
    setPhase('capture');
    startGame();
  };

  const changeDiff = () => {
    cleanup();
    loadScores(diffRef.current);
    setPhase('start');
  };

  const nextLevel = () => {
    const next = diff === 'easy' ? 'medium' : diff === 'medium' ? 'hard' : 'easy';
    setDiff(next);
    cleanup();
    loadScores(next);
    setPhase('capture');
    startGame();
  };

  const randomLevel = () => {
    const diffs = ['easy', 'medium', 'hard'];
    const chosen = diffs[Math.floor(Math.random() * diffs.length)];
    setDiff(chosen);
    cleanup();
    loadScores(chosen);
    setPhase('capture');
    startGame();
  };

  const cleanup = () => {
    cancelAnimationFrame(trackRAFRef.current);
    cancelAnimationFrame(confettiRAFRef.current);
    clearInterval(timerIvRef.current);
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    tilesRef.current = [];
    slotsRef.current = [];
    draggingRef.current = null;
    mouseGRef.current = null;
    touchGRef.current = null;
    moveCountRef.current = 0;
    timerSecRef.current = 0;
    pinchFramesRef.current = 0;
    setIsPaused(false);
    pausedRef.current = false;

    if (confettiCvRef.current) {
      const ctx = confettiCvRef.current.getContext('2d');
      ctx?.clearRect(0, 0, confettiCvRef.current.width, confettiCvRef.current.height);
    }
  };

  return (
    <div id="app">
      <div id="game" ref={gameRef}>
        <video id="cap-vid" ref={capVidRef} autoPlay playsInline muted />

        {/* Loader */}
        <div id="loader" className={loader.on ? 'on' : ''}>
          <div className="spin" />
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginTop: '10px' }}>
            HandPuzzle Pro
          </div>
          <div className="ld-bar-wrap">
            <div className="ld-bar" style={{ width: `${loader.pct}%` }} />
          </div>
          <div className="ld-text">{loader.text}</div>
        </div>

        <div id="flash" className={flash ? 'on' : ''} />

        {/* ── START SCREEN (FIGMA LANDING PAGE) ── */}
        <div className={`screen ${phase === 'start' ? 'active' : ''}`} id="ss">
          {/* Top Navbar */}
          <header className="figma-navbar">
            <div className="figma-nav-inner">
              <span className="figma-brand">Hand Puzzle Pro</span>
              <nav className="figma-nav-links">
                <a
                  href="#home"
                  className="figma-nav-item active"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('ss')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Home
                </a>
                <a
                  href="#how-to-play"
                  className="figma-nav-item"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  How to Play
                </a>
                <div className="settings-popover-wrap">
                  <button
                    type="button"
                    className="figma-nav-item"
                    onClick={() => setShowSettings((prev) => !prev)}
                  >
                    Settings
                  </button>
                  {showSettings && (
                    <div className="settings-dropdown">
                      <div className="settings-popover-head">
                        <span className="settings-popover-title">Settings</span>
                        <button
                          type="button"
                          className="settings-popover-close"
                          onClick={() => setShowSettings(false)}
                        >
                          &times;
                        </button>
                      </div>
                      <p className="settings-popover-desc">
                        Sound and difficulty controls become available when a game starts.
                      </p>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </header>

          {/* Hero Section */}
          <section className="figma-hero-section" id="home">
            <div className="figma-hand-icon-card">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-4 0v4"/>
                <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
                <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
                <path d="M18 8a2 2 0 0 1 4 4c0 4.418-3.582 8-8 8h-2c-3.14 0-5.836-1.808-7.14-4.44L3.38 12.62a1.5 1.5 0 0 1 2.38-1.84L7.5 12.5"/>
              </svg>
            </div>
            <div className="figma-badge">CAMERA PUZZLE GAME</div>
            <h1 className="figma-hero-title">Hand Puzzle Pro</h1>
            <p className="figma-hero-subtitle">
              Frame your shot with your hands. Capture, solve, and sharpen your visual thinking.
            </p>
            <div className="figma-hero-btns">
              <button className="btn-figma-blue" onClick={startGame}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Start playing</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
              <a
                href="#how-to-play"
                className="btn-figma-dark"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                How it works
              </a>
            </div>
          </section>

          {/* Setup Card: Select Difficulty & Current Board */}
          <section className="figma-setup-card" id="difficulty-section">
            <div className="figma-section-label">SELECT DIFFICULTY</div>
            <div className="figma-diff-grid">
              {/* Easy */}
              <div
                className={`figma-diff-card ${diff === 'easy' ? 'active' : ''}`}
                onClick={() => setDiff('easy')}
              >
                <div className="figma-diff-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="4.5" height="4.5" rx="1"/>
                    <rect x="9.75" y="3" width="4.5" height="4.5" rx="1"/>
                    <rect x="16.5" y="3" width="4.5" height="4.5" rx="1"/>
                    <rect x="3" y="9.75" width="4.5" height="4.5" rx="1"/>
                    <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1"/>
                    <rect x="16.5" y="9.75" width="4.5" height="4.5" rx="1"/>
                    <rect x="3" y="16.5" width="4.5" height="4.5" rx="1"/>
                    <rect x="9.75" y="16.5" width="4.5" height="4.5" rx="1"/>
                    <rect x="16.5" y="16.5" width="4.5" height="4.5" rx="1"/>
                  </svg>
                </div>
                <div className="figma-diff-title">Easy</div>
                <div className="figma-diff-sub">3 × 3 grid</div>
              </div>

              {/* Medium */}
              <div
                className={`figma-diff-card ${diff === 'medium' ? 'active' : ''}`}
                onClick={() => setDiff('medium')}
              >
                <div className="figma-diff-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <g transform="rotate(45 12 12)">
                      <rect x="6" y="6" width="3.5" height="3.5" rx="0.8"/>
                      <rect x="11.5" y="6" width="3.5" height="3.5" rx="0.8"/>
                      <rect x="6" y="11.5" width="3.5" height="3.5" rx="0.8"/>
                      <rect x="11.5" y="11.5" width="3.5" height="3.5" rx="0.8"/>
                    </g>
                  </svg>
                </div>
                <div className="figma-diff-title">Medium</div>
                <div className="figma-diff-sub">4 × 4 grid</div>
              </div>

              {/* Hard */}
              <div
                className={`figma-diff-card ${diff === 'hard' ? 'active' : ''}`}
                onClick={() => setDiff('hard')}
              >
                <div className="figma-diff-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6"/>
                    <circle cx="8" cy="8" r="1.2"/>
                    <circle cx="12" cy="8" r="1.2"/>
                    <circle cx="16" cy="8" r="1.2"/>
                    <circle cx="8" cy="12" r="1.2"/>
                    <circle cx="12" cy="12" r="1.2"/>
                    <circle cx="16" cy="12" r="1.2"/>
                    <circle cx="8" cy="16" r="1.2"/>
                    <circle cx="12" cy="16" r="1.2"/>
                    <circle cx="16" cy="16" r="1.2"/>
                  </svg>
                </div>
                <div className="figma-diff-title">Hard</div>
                <div className="figma-diff-sub">5 × 5 grid</div>
              </div>
            </div>

            <div className="figma-setup-btns">
              <button className="btn-figma-blue" onClick={startGame}>
                <span>Start game</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
              <a
                href="#how-to-play"
                className="btn-figma-dark"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                How to play
              </a>
            </div>

            {/* Current Board */}
            <div className="figma-current-board">
              <div className="figma-board-info">
                <div className="figma-section-label">CURRENT BOARD</div>
                <div className="figma-board-dim">
                  {diff === 'easy' ? '3 × 3' : diff === 'medium' ? '4 × 4' : '5 × 5'}
                </div>
              </div>
              <div className={`figma-mini-board grid-${diff}`}>
                {Array.from({ length: diff === 'easy' ? 9 : diff === 'medium' ? 16 : 25 }).map((_, i) => (
                  <div key={i} className="figma-mini-tile" />
                ))}
              </div>
            </div>
          </section>

          {/* Stats Row */}
          <section className="figma-stats-row">
            <div className="figma-stat-card">
              <div className="figma-section-label">BEST TIME</div>
              <div className="figma-stat-val">
                {scores.best_time ? fmt(scores.best_time) : '00:42'}
              </div>
              <div className="figma-stat-sub">Personal record</div>
            </div>
            <div className="figma-stat-card">
              <div className="figma-section-label">BEST MOVES</div>
              <div className="figma-stat-val">{scores.best_moves ?? 18}</div>
              <div className="figma-stat-sub">Fewest moves</div>
            </div>
            <div className="figma-stat-card">
              <div className="figma-section-label">GAMES</div>
              <div className="figma-stat-val">{scores.games ?? 0}</div>
              <div className="figma-stat-sub">Games started</div>
            </div>
          </section>

          {/* How to Play Section */}
          <section className="figma-htp-section" id="how-to-play">
            <div className="figma-htp-header">
              <div>
                <div className="figma-section-label">HOW TO PLAY</div>
                <h2 className="figma-htp-title">Three steps. One sharp eye.</h2>
              </div>
              <p className="figma-htp-tagline">
                Designed to be simple to learn and satisfying to master.
              </p>
            </div>
            <div className="figma-htp-divider" />
            <div className="figma-htp-grid">
              <div className="figma-htp-card">
                <div className="figma-htp-num">01</div>
                <h3 className="figma-htp-card-title">Frame the puzzle</h3>
                <p className="figma-htp-card-desc">
                  Use both hands to create a clear rectangular frame.
                </p>
              </div>
              <div className="figma-htp-card">
                <div className="figma-htp-num">02</div>
                <h3 className="figma-htp-card-title">Capture your shot</h3>
                <p className="figma-htp-card-desc">
                  Hold steady while the camera detects the hand frame.
                </p>
              </div>
              <div className="figma-htp-card">
                <div className="figma-htp-num">03</div>
                <h3 className="figma-htp-card-title">Solve the challenge</h3>
                <p className="figma-htp-card-desc">
                  Review the captured puzzle and enter your answer.
                </p>
              </div>
            </div>
          </section>

          <footer className="figma-footer">
            <span>Hand Puzzle Pro &bull; Camera Puzzle Game</span>
            <span>Created with Precision</span>
          </footer>
        </div>

        {/* ── CAPTURE SCREEN ── */}
        <div className={`screen ${phase === 'capture' ? 'active' : ''}`} id="cs">
          <canvas id="cap-ovl" ref={capOvlRef} />
          <div id="cap-ui">
            <div className="cap-top">
              <div className="cap-top-row">
                <div className="cap-title">📸 Capture Mode</div>
                <div className="cap-badge">{CFG[diff].label}</div>
              </div>
            </div>
            <div className="cap-bot">
              <div id="cap-instr">{capInstr}</div>
              <div id="cap-sub">{capSub}</div>
              <div className="hd-row" style={{ marginTop: '16px' }}>
                <div className="hd-item">
                  <div className={`hd-dot ${handL ? 'on' : ''}`} />
                  <div className={`hd-text ${handL ? 'on' : ''}`}>Left Hand</div>
                </div>
                <div className="hd-item">
                  <div className={`hd-dot ${handR ? 'on' : ''}`} />
                  <div className={`hd-text ${handR ? 'on' : ''}`}>Right Hand</div>
                </div>
              </div>
              <div className="gesture-guide">
                <div className={`gg-pill ${ggFrame}`}>1. Frame with Index & Thumb</div>
                <div className={`gg-pill ${ggOpen}`}>2. Open Hands to Capture</div>
              </div>
              <div style={{ pointerEvents: 'all', display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                <button className="btn btn-glass btn-xs" onClick={manualSnap}>📸 Click to Snap</button>
                <label className="btn btn-glass btn-xs" style={{ cursor: 'pointer' }}>
                  📁 Upload Photo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadImage} />
                </label>
                <button className="btn btn-glass btn-xs" onClick={quitGame}>Cancel</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── PUZZLE SCREEN ── */}
        <div className={`screen ${phase === 'play' ? 'active' : ''}`} id="ps">
          <div id="puz-hdr">
            <div className="ph-diff">{CFG[diff].label}</div>
            <div className="ph-prog">
              Tiles: <span>{progVal}</span>/<span>{totalTiles}</span>
            </div>
            <div id="puz-timer">{puzTimerText}</div>
            <button id="pause-btn" onClick={togglePause}>
              {isPaused ? '▶' : '⏸'}
            </button>
          </div>
          <div id="prog-bar-wrap">
            <div id="prog-bar" style={{ width: `${progPct}%` }} />
          </div>
          <div id="grid-wrap" ref={gridWrapRef} />
          <canvas id="ph-ovl" ref={phOvlRef} />
          <div id="hcur" ref={hcurRef} />
          <div id="gbadge" className={badgeClass}>{badgeText}</div>
        </div>

        {/* ── COMPLETE SCREEN ── */}
        <div className={`screen ${phase === 'complete' ? 'active' : ''}`} id="ws">
          <canvas id="confetti-cv" ref={confettiCvRef} />
          <div className="w-emoji">🎉</div>
          <div className="w-title">Puzzle Solved!</div>
          <div className="stars">
            <span className={`star ${winData.stars >= 1 ? 'lit' : ''}`}>⭐</span>
            <span className={`star ${winData.stars >= 2 ? 'lit' : ''}`}>⭐</span>
            <span className={`star ${winData.stars >= 3 ? 'lit' : ''}`}>⭐</span>
          </div>
          {winData.preview && (
            <img id="w-preview" className="w-preview" src={winData.preview} alt="Your photo" />
          )}
          <div className="w-stats">
            <div className="wstat">
              <div className="wstat-l">Time</div>
              <div className="wstat-v">{winData.time}</div>
            </div>
            <div className="wstat">
              <div className="wstat-l">Moves</div>
              <div className="wstat-v">{winData.moves}</div>
            </div>
            <div className="wstat">
              <div className="wstat-l">Score</div>
              <div className="wstat-v">{winData.score}</div>
            </div>
          </div>
          {winData.isNew && <div className="new-best">🏆 New Best Time!</div>}
          <div className="w-btns">
            <button className="btn btn-glass btn-sm" onClick={changeDiff}>⚙️ Difficulty</button>
            <button className="btn btn-primary btn-sm" onClick={playAgain}>🔄 Replay</button>
            <button className="btn btn-success btn-sm" onClick={nextLevel}>⏭ Next Level</button>
            <button className="btn btn-violet btn-sm" onClick={randomLevel}>🎲 Random Grid</button>
          </div>
        </div>

        {/* ── HOW TO PLAY MODAL ── */}
        <div className={`modal-bd ${modal === 'how' ? 'show' : ''}`}>
          <div className="modal">
            <div className="modal-title">🎮 How to Play</div>
            <p className="modal-sub">Solve the selfie puzzle using hand gestures</p>
            <div className="htp-step">
              <div className="htp-icon">🔲</div>
              <div className="htp-text">
                <strong>Frame the shot:</strong> Use the index and thumb of BOTH hands to draw a rectangle in the air.
              </div>
            </div>
            <div className="htp-step">
              <div className="htp-icon">👐</div>
              <div className="htp-text">
                <strong>Capture:</strong> When you like the frame, quickly <strong>open all your fingers</strong> to snap the photo!
              </div>
            </div>
            <div className="htp-step">
              <div className="htp-icon">🤏</div>
              <div className="htp-text">
                <strong>Solve:</strong> Pinch your thumb and index finger to grab a tile, move it, and release to drop.
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary btn-lg" onClick={() => setModal(null)}>
                Got it! 👍
              </button>
            </div>
          </div>
        </div>

        {/* ── PAUSE MODAL ── */}
        <div className={`modal-bd ${modal === 'pause' ? 'show' : ''}`}>
          <div className="modal">
            <div className="modal-title">⏸ Paused</div>
            <div id="pause-time">{puzTimerText}</div>
            <div className="modal-actions">
              <button className="btn btn-success btn-lg" onClick={togglePause}>
                ▶ Resume
              </button>
              <div className="modal-row">
                <button className="btn btn-glass btn-sm" onClick={restartGame}>
                  🔄 Restart
                </button>
                <button className="btn btn-danger btn-sm" onClick={quitGame}>
                  🚪 Quit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
