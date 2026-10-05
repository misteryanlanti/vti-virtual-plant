// 仪表悬空检测：加载 three + 数据 + 构建器，实测每个仪表安装件末端到设备/管道表面的距离
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = __dirname;
global.self = global;
THREE = require('./lib/three.min.js');

function load(f) {
  var code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { vm.runInThisContext(code, {filename: f}); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
load('equipment_data.js');
load('instrument_data.js');
load('lib/equip_builders.js');
load('lib/pipes.js');
load('lib/instrument_builders.js');

// ---------- 构建设备 ----------
var scene = new THREE.Scene();
var equipMeshes = new Map();
EQUIPMENT.forEach(function(e) {
  var fn = EQUIP_BUILDERS[e.tag] || EQUIP_BUILDERS._default;
  if (typeof fn !== 'function') { console.log('NO BUILDER', e.tag); return; }
  var g = fn.call(EQUIP_BUILDERS, scene, e);
  g.position.set(e.pos[0], e.pos[1], e.pos[2]);
  scene.add(g);
  equipMeshes.set(e.tag, g);
});
console.log('设备构建:', equipMeshes.size);

// ---------- 构建管线（仪表取压要用 PIPE_ROUTES） ----------
buildPipes(scene, equipMeshes);
console.log('PIPE_ROUTES:', PIPE_ROUTES.filter(Boolean).length);

// ---------- 构建仪表 ----------
var res = INSTRUMENT_BUILDERS.mountAll(scene, equipMeshes);
console.log('仪表:', res.instruments.size, '阀门:', res.valves.size);

// ---------- 检测 ----------
scene.updateMatrixWorld(true);   // 仪表挂载后补一次全场景矩阵更新
// 测点常位于管道轴线（圆柱内部）：把所有材质临时设为双面，使内壁可被射线命中
scene.traverse(function(o){ if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });
var sceneList = [];
scene.traverse(function(o){ if (o.isMesh) sceneList.push(o); });

// 收集管道网格
var pipeMeshes = sceneList.filter(function(m){ return m.userData.isPipe; });

function distToMeshes(point, meshes, maxD) {
  // 包围盒粗筛
  var near = [];
  var box = new THREE.Box3();
  for (var i = 0; i < meshes.length; i++) {
    box.setFromObject(meshes[i]);
    box.expandByScalar(maxD || 3);
    if (box.containsPoint(point)) near.push(meshes[i]);
  }
  if (!near.length) return {d: Infinity, mesh: null};
  // 26 方向射线采样：净空 = 任意方向命中表面的最小距离
  var dirs = [];
  for (var ix = -1; ix <= 1; ix++) for (var iy = -1; iy <= 1; iy++) for (var iz = -1; iz <= 1; iz++) {
    if (!ix && !iy && !iz) continue;
    dirs.push(new THREE.Vector3(ix, iy, iz).normalize());
  }
  var best = Infinity, bestM = null;
  var ray = new THREE.Raycaster();
  ray.far = maxD || 3;
  for (var k = 0; k < dirs.length; k++) {
    ray.set(point, dirs[k]);
    var hits = ray.intersectObjects(near, false);
    if (hits.length && hits[0].distance < best) { best = hits[0].distance; bestM = hits[0].object; }
  }
  return {d: best, mesh: bestM};
}

// 对每个仪表：取其安装附件最远端点（世界坐标），测到设备/管道表面的距离
var bad = [];
res.instruments.forEach(function(rec, tag) {
  var g = rec.group;
  var mount = g.userData.mount;
  var isAnalyzer = (rec.instr.type === 'A' && rec.instr.tag.charAt(1) === 'I');
  // 附件末端（局部坐标）：analyzer → 探头尖端；wall → z=-0.46；pipe → y=-0.39；post → y=-1.56
  var tipLocal = new THREE.Vector3(0,0,0);
  if (isAnalyzer) tipLocal.set(0, 0.75, -0.96);
  else if (rec.instr.type === 'L') tipLocal.set(0, -0.08, 0);   // 液位计：法兰在底部
  else if (mount === 'pipe') tipLocal.set(0, -0.39, 0);
  else if (mount === 'post') tipLocal.set(0, -1.56, 0);
  else tipLocal.set(0, 0, -0.46);
  var tip = tipLocal.clone().applyMatrix4(g.matrixWorld);

  // 排除仪表自身网格后测距
  var own = new Set();
  g.traverse(function(o){ if (o.isMesh) own.add(o); });
  var others = sceneList.filter(function(m){ return !own.has(m); });

  var near = distToMeshes(tip, others, 5);
  var grounded = (mount === 'post' && Math.abs(tip.y) < 0.05);   // 落地支架：底座贴地即合格
  var ok = grounded || near.d < 0.30;   // 允许 30cm 安装间隙
  if (!ok) bad.push({tag: tag, mount: mount, gap: near.d.toFixed(2), tip: [tip.x.toFixed(1), tip.y.toFixed(1), tip.z.toFixed(1)], host: rec.host});
});

bad.sort(function(a,b){ return b.gap - a.gap; });
console.log('\n===== 悬空仪表 (安装件末端距任何设备/管道表面 > 0.30m) =====');
bad.forEach(function(b){ console.log(b.tag, b.mount, 'gap=' + b.gap + 'm', 'tip=(' + b.tip.join(',') + ')', 'host=' + b.host); });
console.log('悬空总数:', bad.length, '/', res.instruments.size);

// 阀门检测：阀体中心应在管道上
console.log('\n===== 阀门位置检测 =====');
var badV = 0;
res.valves.forEach(function(rec, tag) {
  var p = new THREE.Vector3();
  rec.group.getWorldPosition(p);
  var near = distToMeshes(p, pipeMeshes, 2);
  if (near.d > 0.35) { badV++; if (badV <= 40) console.log(tag, '距最近管道', near.d.toFixed(2) + 'm', 'pos=(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ',' + p.z.toFixed(1) + ')'); }
});
console.log('悬空阀门:', badV, '/', res.valves.size);
