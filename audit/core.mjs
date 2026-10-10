// Core game logic harness: concatenates the shipped sections into ONE Function
// whose scope contains everything the game needs; returns an API object.
// Rendering-only sections (groundPlane, plot border, camera, thumbs) are excluded;
// the scene creation lines that sit between world constants and asset builders are
// neutralized with no-op stubs.
import { section } from './extract.mjs';
import { createRequire } from 'module';
const require0 = createRequire(import.meta.url);
const THREE = require0('three');

export function buildCore(opts = {}) {
  const stubUpdateStats = () => {};
  const stubTip = () => {};
  const audioCalls = { plop: 0, bonk: 0 };
  const stubPlop = () => { audioCalls.plop++; };
  const stubBonk = () => { audioCalls.bonk++; };

  const src = [
    // utils + world constants + renderer stub + scene const (the real scene lines
    // between renderer setup and camera are included but THREE renderer calls are
    // neutralized by stubbing THREE.WebGLRenderer in the Function preamble below)
    '; const innerWidth=1280, innerHeight=800, devicePixelRatio=1; ' +
    'THREE.WebGLRenderer=function(){return{setPixelRatio(){},setSize(){},shadowMap:{},render(){},dispose(){},forceContextLoss(){},domElement:{toDataURL(){return ""}}}};' +
    '; const scene=new THREE.Scene(); ' +
    section('/* ---------- tiny utils ---------- */', 'const camera=new THREE.PerspectiveCamera').replace('const scene=new THREE.Scene();','').replace(/scene\.fog=[^;]+;/,'').replace(/renderer\.[a-zA-Z]+=[^;]+;/g,''),
    // the real camera line is inside the section below; we let it compile as-is
    // (THREE.PerspectiveCamera exists in r128 without a DOM)
    section('const camera=new THREE.PerspectiveCamera', '/* ---------- merged-geometry builder (1 draw call per object) ---------- */')
      .replace(/groundPlane\(1200[\s\S]*?\.03\);/,'')
      .replace(/groundPlane\(WORLD[\s\S]*?\);/,''),
    section('/* ---------- merged-geometry builder (1 draw call per object) ---------- */', '/* ================================================================\n   ASSET BUILDERS'),
    section('/* ================================================================\n   ASSET BUILDERS', '/* ================================================================\n   DEFINITIONS'),
    section('/* ================================================================\n   DEFINITIONS', '/* ================================================================\n   TRAINS'),
    section('/* ================================================================\n   TRAINS', '/* ================================================================\n   WANDERERS'),
    section('/* ================================================================\n   WANDERERS', '/* ================================================================\n   PARTICLES'),
    section('/* ================================================================\n   PARTICLES (dust + smoke + litter) & TWEENS', '/* ================================================================\n   CLOUDS'),
    // canPlace lives in the browser section but is pure world-state logic
    section('function canPlace(def,tx,tz){', 'function placeUserAt('),
    // API surface
    '; function updateStats(){} function tipOnce(){} ' +
    'return { objects, entities, walkSpots, bins, groundMap, objMap, isRailAt, railConns,' +
    ' place, removeRec, restoreRec, canPlace, updateTrain, nextWaypoint, initTrain,' +
    ' updateWander, pickTargetW, binTick, groundYAt, blockedAt, spawnPuff, updatePuffs,' +
    ' updateTweens, dropAnim, DEFS, GRID, TILE, WORLD, HALF, HB, MAXO, DIRS, key, t2w, w2t, inGrid,' +
    ' scene };',
  ].join('\n');

  // eslint-disable-next-line no-new-func
  const fn = new Function('THREE', 'updateStatsX', 'tipOnceX', 'toastX', 'plopX', 'bonkX', 'document', src
    .replace(/(^|\n)updateStats\(\)/g, '$1updateStatsX()')
    .replace(/(^|\n)(tipOnce\()/g, '$1tipOnceX2(')
    .replace(/(^|\n)plop\(\)/g, '$1plopX()')
    .replace(/(^|\n)bonk\(\)/g, '$1bonkX()'));

  const mk2dStub = () => ({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), fillRect(){}, fillStyle:'', fillText(){} });
  const stubCanvasEl = { addEventListener(){}, style:{}, getContext: () => mk2dStub() };
  const stubDoc = { createElement: () => ({ width: 0, height: 0, getContext: () => mk2dStub() }), getElementById: () => stubCanvasEl };
  const C = fn(THREE, stubUpdateStats, stubTip, () => {}, stubPlop, stubBonk, stubDoc);
  C.audioCalls = audioCalls;
  return C;
}
