// 管线端点/支撑核查：每条管线的首末端点必须落在设备本体表面上；水平管段下方必须有管墩
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = __dirname;
global.self = global;
THREE = require('./lib/three.min.js');

function load(f) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), {filename: f});
}
load('equipment_data.js');
load('instrument_data.js');
load('lib/equip_builders.js');
load('lib/pipes.js');
load('lib/instrument_builders.js');

// ---------- 构建设备（标记每台设备的网格归属） ----------
var scene = new THREE.Scene();
var equipMeshes = new Map();
EQUIPMENT.forEach(function(e) {
  var fn = EQUIP_BUILDERS[e.tag] || EQUIP_BUILDERS._default;
  var g = fn.call(EQUIP_BUILDERS, scene, e);
  g.position.set(e.pos[0], e.pos[1], e.pos[2]);
  scene.add(g);
  equipMeshes.set(e.tag, g);
  g.traverse(function(o) { if (o.isMesh) { o.userData.isEquip = true; o.userData.equipTag = e.tag; } });
});
console.log('设备:', equipMeshes.size);

// ---------- 构建管线 ----------
buildPipes(scene, equipMeshes);
scene.updateMatrixWorld(true);
// 双面材质：测点可能在壳体内部
scene.traverse(function(o) { if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });

var allMeshes = [];
scene.traverse(function(o) { if (o.isMesh) allMeshes.push(o); });
var equipMeshList = allMeshes.filter(function(m) { return m.userData.isEquip; });

// ---------- 工具：到某组网格的最小真实间隙（26 方向射线采样） ----------
var DIRS = [];
for (var ix = -1; ix <= 1; ix++) for (var iy = -1; iy <= 1; iy++) for (var iz = -1; iz <= 1; iz++) {
  if (!ix && !iy && !iz) continue;
  DIRS.push(new THREE.Vector3(ix, iy, iz).normalize());
}
function clearance(point, meshes, maxD) {
  var near = [], box = new THREE.Box3();
  for (var i = 0; i < meshes.length; i++) {
    box.setFromObject(meshes[i]);
    box.expandByScalar(maxD || 3);
    if (box.containsPoint(point)) near.push(meshes[i]);
  }
  if (!near.length) return {d: Infinity, mesh: null};
  var ray = new THREE.Raycaster();
  ray.far = maxD || 3;
  var best = Infinity, bestM = null;
  for (var k = 0; k < DIRS.length; k++) {
    ray.set(point, DIRS[k]);
    var hits = ray.intersectObjects(near, false);
    if (hits.length && hits[0].distance < best) { best = hits[0].distance; bestM = hits[0].object; }
  }
  return {d: best, mesh: bestM};
}

// ---------- 1. 端点连接核查 ----------
console.log('\n===== 管线端点核查（端点必须贴在设备表面，允许 0.60m 接管伸出量）=====');
var badEnd = 0;
PIPE_DEFS.forEach(function(def, idx) {
  var r = PIPE_ROUTES[idx];
  if (!r) { console.log('#' + idx, def[0] + '->' + def[1], '无路径!'); return; }
  [['起点', r[0], def[0]], ['终点', r[r.length - 1], def[1]]].forEach(function(ent) {
    var p = ent[1], tag = ent[2];
    var own = equipMeshes.get(tag);
    var ownList = [];
    if (own) own.traverse(function(o) { if (o.isMesh) ownList.push(o); });
    var res = clearance(p, ownList, 4);
    var resAny = clearance(p, equipMeshList, 4);
    var ok = res.d <= 0.60;
    if (!ok) {
      badEnd++;
      console.log('#' + idx, def[0] + '→' + def[1], ent[0], '所属设备 ' + tag,
        '离本体 ' + (res.d === Infinity ? '>4m' : res.d.toFixed(2) + 'm'),
        '离最近设备 ' + (resAny.d === Infinity ? '>4m' : resAny.d.toFixed(2) + 'm'),
        (resAny.mesh ? '(' + resAny.mesh.userData.equipTag + ')' : ''),
        'pt=(' + p.x.toFixed(1) + ',' + p.y.toFixed(2) + ',' + p.z.toFixed(1) + ')');
    }
  });
});
console.log('脱空端点:', badEnd, '/', PIPE_DEFS.length * 2);

// ---------- 2. 水平管段支撑核查 ----------
console.log('\n===== 水平管段管墩核查（管底下方应有落地管墩）=====');
// 收集混凝土/钢结构支撑：y 跨度从地面到管道附近的细长体
var supportMeshes = allMeshes.filter(function(m) {
  if (m.userData.isEquip || m.userData.isPipe) return false;
  var b = new THREE.Box3().setFromObject(m);
  var w = b.max.x - b.min.x, h = b.max.y - b.min.y, d = b.max.z - b.min.z;
  return h > 0.15 && w < 1.2 && d < 1.2 && b.min.y < 0.35;
});
console.log('候选支撑构件:', supportMeshes.length);
var badSup = 0, supTotal = 0;
PIPE_DEFS.forEach(function(def, idx) {
  var r = PIPE_ROUTES[idx];
  if (!r) return;
  var rad = def[2] + 0.07;
  for (var j = 0; j < r.length - 1; j++) {
    var a = r[j], b = r[j + 1];
    var len = Math.sqrt((b.x-a.x)*(b.x-a.x) + (b.z-a.z)*(b.z-a.z));
    if (Math.abs(a.y - b.y) > 0.05 || len < 3.0) continue;     // 只看较长的水平段
    var n = Math.max(1, Math.floor(len / 5.5));
    for (var i = 1; i <= n; i++) {
      var t = i / (n + 1);
      var px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
      supTotal++;
      // 找该点下方是否有支撑（水平 1.2m 内、顶部接近管底）
      var found = false;
      for (var s = 0; s < supportMeshes.length; s++) {
        var bb = new THREE.Box3().setFromObject(supportMeshes[s]);
        var cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
        var dhor = Math.sqrt((px-cx)*(px-cx) + (pz-cz)*(pz-cz));
        if (dhor < 1.2 && Math.abs(bb.max.y - (a.y - rad)) < 0.45) { found = true; break; }
      }
      if (!found) {
        badSup++;
        console.log('#' + idx, def[0] + '→' + def[1], '水平段 y=' + a.y.toFixed(2),
          '缺支撑点 (' + px.toFixed(1) + ',' + pz.toFixed(1) + ')');
      }
    }
  }
});
console.log('缺支撑采样点:', badSup, '/', supTotal);

// ---------- 3. 管道穿越设备本体核查 ----------
// 沿每条管段每 1.0 m 采样，检查点是否落在"非本管线所连设备"的真实壳体内部
console.log('\n===== 管道穿越设备本体核查 =====');
var boxes = [];
equipMeshes.forEach(function(g, tag) {
  var b = new THREE.Box3().setFromObject(g);
  boxes.push({tag: tag, box: b, group: g});
});
function insideAnyEquip(point, exclA, exclB) {
  for (var i = 0; i < boxes.length; i++) {
    var e = boxes[i];
    if (e.tag === exclA || e.tag === exclB) continue;
    if (!e.box.containsPoint(point)) continue;
    // 粗筛命中 → 四向射线确认是否真在壳体内（三面以上被围住即判为穿过内部）
    var ray = new THREE.Raycaster(point, new THREE.Vector3(1,0,0), 0.1, 30);
    var n = 0;
    if (ray.intersectObject(e.group, true).length) n++;
    ray.set(point, new THREE.Vector3(-1,0,0)); if (ray.intersectObject(e.group, true).length) n++;
    ray.set(point, new THREE.Vector3(0,1,0));   if (ray.intersectObject(e.group, true).length) n++;
    ray.set(point, new THREE.Vector3(0,-1,0));  if (ray.intersectObject(e.group, true).length) n++;
    if (n >= 3) return e.tag;
  }
  return null;
}
var badCross = 0, sampleTotal = 0;
PIPE_DEFS.forEach(function(def, idx) {
  var r = PIPE_ROUTES[idx];
  if (!r) return;
  for (var j = 0; j < r.length - 1; j++) {
    var a = r[j], b = r[j+1];
    var len = a.distanceTo(b);
    var n = Math.max(1, Math.round(len / 1.0));
    for (var i = 1; i < n; i++) {          // 跳过端点（端点本就在设备壁上）
      var t = i / n;
      var p = new THREE.Vector3().lerpVectors(a, b, t);
      sampleTotal++;
      var hit = insideAnyEquip(p, def[0], def[1]);
      if (hit) {
        badCross++;
        console.log('#' + idx, def[0] + '→' + def[1], '管段#' + j,
          '穿越设备 ' + hit, 'pt=(' + p.x.toFixed(1) + ',' + p.y.toFixed(2) + ',' + p.z.toFixed(1) + ')');
      }
    }
  }
});
console.log('穿越采样点:', badCross, '/', sampleTotal);

// ---------- 3b. 管道不得沉入地面以下 ----------
console.log('\n===== 管道标高核查（管底不得低于地面）=====');
var badLow = 0;
PIPE_DEFS.forEach(function(def, idx) {
  var r = PIPE_ROUTES[idx];
  if (!r) return;
  var rad = def[2] + 0.07;
  for (var j = 0; j < r.length; j++) {
    if (r[j].y - rad < -0.05) {
      badLow++;
      console.log('#' + idx, def[0] + '→' + def[1], '折点#' + j,
        'y=' + r[j].y.toFixed(2), '管底=' + (r[j].y - rad).toFixed(2));
    }
  }
});
console.log('沉地折点:', badLow);

// ---------- 4. 设备落地核查 ----------
console.log('\n===== 设备落地核查（底面应贴地）=====');
var badGround = 0;
equipMeshes.forEach(function(g, tag) {
  var b = new THREE.Box3().setFromObject(g);
  if (b.min.y < -0.15 || b.min.y > 0.45) {
    badGround++;
    console.log(tag, '底面 y=' + b.min.y.toFixed(2), '顶面 y=' + b.max.y.toFixed(2));
  }
});
console.log('未落地设备:', badGround, '/', equipMeshes.size);
