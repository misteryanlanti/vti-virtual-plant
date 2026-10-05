// ============================================================
//  运转核查：模拟动画，检查每个运动部件是否漂移/入地/上天
// ============================================================
var fs = require('fs'), path = require('path'), vm = require('vm');
global.self = global;
THREE = require('./lib/three.min.js');
function load(f){ vm.runInThisContext(fs.readFileSync(path.join(__dirname,f),'utf8'), {filename:f}); }
load('equipment_data.js'); load('instrument_data.js');
load('lib/equip_builders.js'); load('lib/pipes.js'); load('lib/instrument_builders.js');

var scene = new THREE.Scene();
var equipMeshes = new Map();
EQUIPMENT.forEach(function(e){
  var fn = EQUIP_BUILDERS[e.tag] || EQUIP_BUILDERS._default;
  var g = fn.call(EQUIP_BUILDERS, scene, e);
  g.position.set(e.pos[0], e.pos[1], e.pos[2]);
  scene.add(g); equipMeshes.set(e.tag, g);
});
scene.updateMatrixWorld(true);

// 收集运动部件
var movers = [];
EQUIPMENT.forEach(function(e){
  var g = equipMeshes.get(e.tag);
  g.traverse(function(o){
    if (o.userData && o.userData.motion) movers.push({tag: e.tag, obj: o, m: o.userData.motion,
                                                      home: o.position.clone()});
  });
});
console.log('运动部件总数: ' + movers.length);

// 复刻 factory.js 的 updateMotion（含 collectMotionParts 的 pivot 自动取值）
var q = new THREE.Quaternion(), ax = new THREE.Vector3();
function axisVec(a){ return a === 'x' ? new THREE.Vector3(1,0,0) : a === 'y' ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1); }
movers.forEach(function(mv){
  var m = mv.m;
  m._base = mv.obj.position.clone();
  m._phase = 0;
  if (m.kind === 'spin') {
    if (m.pivot) { m._pivot = m.pivot.clone(); }
    else {
      var b = new THREE.Box3().setFromObject(mv.obj);
      var c = b.getCenter(new THREE.Vector3());
      if (isFinite(c.x) && isFinite(c.y) && isFinite(c.z) && mv.obj.parent) mv.obj.parent.worldToLocal(c);
      else c.set(0,0,0);
      m._pivot = c;
    }
  }
});
function updateMotion(dt){
  movers.forEach(function(mv){
    var o = mv.obj, m = mv.m;
    if (m.kind === 'spin') {
      var w = m.rpm / 60 * Math.PI * 2 * dt;
      ax.copy(axisVec(m.axis));
      q.setFromAxisAngle(ax, w);
      o.position.sub(m._pivot).applyQuaternion(q).add(m._pivot);
      o.quaternion.premultiply(q);
    } else if (m.kind === 'osc') {
      var t = performance ? 0 : 0;
      mv.t = (mv.t || 0) + dt;
      var ph = Math.sin(mv.t * m.freq * Math.PI * 2);
      if (Array.isArray(m.amp)) {
        o.position.set(mv.home.x + m.amp[0]*ph, mv.home.y + m.amp[1]*ph, mv.home.z + m.amp[2]*ph);
      } else {
        var k = m.axis || 'x';
        o.position.copy(mv.home);
        o.position[k] += m.amp * ph;
      }
    }
  });
}

// 采样 20 秒
var stat = new Map();
var bad = [];
for (var step = 0; step < 400; step++) {
  updateMotion(0.05);
  if (step % 20 !== 0) continue;
  scene.updateMatrixWorld(true);
  movers.forEach(function(mv, idx){
    // 必须测包围盒而非原点：旋转组的原点会绕轴心画圆，但几何体本身位置正确
    var b = new THREE.Box3().setFromObject(mv.obj);
    if (!isFinite(b.min.y)) return;
    var rec = stat.get(idx);
    var c = b.getCenter(new THREE.Vector3());
    if (!rec) { rec = {minY: Infinity, maxY: -Infinity, minX: Infinity, maxX: -Infinity,
                       minZ: Infinity, maxZ: -Infinity, tag: mv.tag}; stat.set(idx, rec); }
    // 判据：几何体【包围盒中心】随时间的位移 = 真正的漂移；包围盒本身尺寸变化不算漂移
    rec.minY = Math.min(rec.minY, b.min.y); rec.maxY = Math.max(rec.maxY, b.max.y);
    rec.minX = Math.min(rec.minX, c.x); rec.maxX = Math.max(rec.maxX, c.x);
    rec.minZ = Math.min(rec.minZ, c.z); rec.maxZ = Math.max(rec.maxZ, c.z);
  });
}

var nDrift = 0, nSink = 0, nFly = 0;
stat.forEach(function(rec, idx){
  var dx = rec.maxX - rec.minX, dy = rec.maxY - rec.minY, dz = rec.maxZ - rec.minZ;
  var horiz = Math.max(dx, dz);
  if (horiz > 2.5) { nDrift++; var mv0 = movers[idx]; var kd = mv0.m.kind + (mv0.m.kind==='spin' ? (':' + mv0.m.axis + '@' + mv0.m.rpm) : (':osc ' + JSON.stringify(mv0.m.amp)));
    bad.push(rec.tag + ' [' + kd + '] 水平漂移 ' + horiz.toFixed(2) + ' m  X:' + dx.toFixed(1) + ' Z:' + dz.toFixed(1)); }
  if (rec.minY < -0.5) { nSink++; bad.push(rec.tag + ' 入地 y=' + rec.minY.toFixed(2)); }
  if (rec.maxY > 40)  { nFly++;  bad.push(rec.tag + ' 上天 y=' + rec.maxY.toFixed(2)); }
});
console.log('\n===== 运转轨迹核查 =====');
console.log('异常漂移(>2.5m): ' + nDrift);
console.log('入地(y<-0.5):    ' + nSink);
console.log('上天(y>40):      ' + nFly);
bad.slice(0, 20).forEach(function(b){ console.log('  ' + b); });
