// ============================================================
//  真实性核查：把每台设备的 1:1 实际尺寸量出来，
//  与真实工业设备典型规格对照，输出差距清单
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

// ---- 真实工业设备典型规格对照（名称, 典型长×宽×高 m）----
var REF = {
  'V-101': '皮带机 B800 长20~40m / 堆场 30×20×6',
  'B-102': 'PE-600×900 颚破 2.3×1.9×2.2',
  'B-103': 'PYB-1200 圆锥破 2.6×2.4×3.2',
  'M-104': 'φ2.4×4.5 湿式球磨 8.5×5×4.5',
  'H-105': 'φ350 旋流器组 3×3×4.5（8~12台成组）',
  'T-106': 'φ12 浓密机 φ12×4.5',
  'S-201': '双轴搅拌混合机 4×2.2×2.5',
  'K-202': 'φ2.5×30 m 回转窑（教学示范级，L/D=12）',
  'D-203': '布袋除尘器 10×6×14（含灰斗/净气室）',
  'C-204': '链板冷却机 18×2.4×3.5',
  'R-301': 'φ6×6.5 浸出槽（带搅拌）',
  'R-302': 'φ6×6.5 浸出槽',
  'R-303': 'φ6×6.5 浸出槽',
  'T-303': 'φ18 CCD 高效浓密机 φ18×5.5',
  'P-303': 'XMZ300/1250 板框压滤机 8.5×1.9×2.0',
  'F-304': '密闭精密过滤器 4.4×2.6×2.5',
  'E-401': '箱式混合澄清槽 5级 18×2.6×3.6',
  'X-502': 'D201 离子交换柱 ×3 8×6×3',
  'P-501': 'φ5×5.5 沉钒结晶罐（夹套加热）',
  'T-502': 'φ12 浓密机 φ12×4.5',
  'P-503': '板框压滤机 7×1.8×2.0',
  'K-601': 'APV 煅烧回转窑 φ1.6×26',
  'V-602': '振动筛 3×1.6×1.6',
  'W-603': '自动包装机 3×2.5×3.2',
  'Y-604': '码垛区 10×8×4',
  'A-701': 'φ4×16 洗涤塔 φ4×17',
  'A-702': 'φ3×14 氨回收塔 φ3×15',
  'W-703': '废水处理站 25×18×4',
  'C-704': '冷却塔 φ8×9（800m³/h 机械通风）',
  'S-801': 'φ6×6 硫酸储罐（40m³×2）',
  'S-802': 'φ6×7 储罐',
  'U-804': '管廊 60×4×6 + 泵组',
  'E-805': '配电房 18×10×5',
  'C-806': '中控室 20×12×5',
  'A-807': '空压站 12×8×4',
  'B-808': '锅炉房 20×12×8（含烟囱 20m）',
  'B-901': '道路/绿化',
  'L-901': '化验室 15×10×4'
};

console.log('===== 设备实测尺寸 vs 真实规格 =====');
console.log('位号    实测 长(X)×高(Y)×宽(Z) m             参考规格');
EQUIPMENT.forEach(function(e){
  var g = equipMeshes.get(e.tag);
  var b = new THREE.Box3().setFromObject(g);
  var s = b.getSize(new THREE.Vector3());
  console.log(
    (e.tag+'        ').slice(0,7) + ' ' +
    (s.x.toFixed(1)+' × '+s.y.toFixed(1)+' × '+s.z.toFixed(1)).padEnd(26) + ' ' +
    (REF[e.tag] || '—')
  );
});

// ---- 运转动画覆盖 ----
console.log('\n===== 运转部件覆盖 =====');
var mot = 0, noMot = [];
EQUIPMENT.forEach(function(e){
  var g = equipMeshes.get(e.tag);
  var n = 0;
  g.traverse(function(o){ if (o.userData && o.userData.motion) n++; });
  if (n > 0) { mot++; console.log('  ' + e.tag + ' ' + e.name + ' → ' + n + ' 个运动部件'); }
  else noMot.push(e.tag + '(' + e.name + ')');
});
console.log('  有运转: ' + mot + '/' + EQUIPMENT.length);
console.log('  无运转: ' + noMot.join(', '));

// ---- 设备互相穿插核查（真实工厂：设备之间必须留检修/消防通道）----
console.log('\n===== 设备互相穿插核查 =====');
var boxes = [];
EQUIPMENT.forEach(function(e){
  if (e.section === '场景') return;
  var b = new THREE.Box3().setFromObject(equipMeshes.get(e.tag));
  boxes.push({tag: e.tag, name: e.name, box: b});
});
var clash = 0, clashList = [];
for (var i = 0; i < boxes.length; i++) {
  for (var j = i + 1; j < boxes.length; j++) {
    var a = boxes[i].box, b = boxes[j].box;
    var ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    var oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    if (ox > 0.4 && oz > 0.4) {
      clash++;
      clashList.push(boxes[i].tag + ' ↔ ' + boxes[j].tag + ' 重叠 ' +
        ox.toFixed(1) + '×' + oz.toFixed(1) + ' m');
    }
  }
}
console.log('  重叠对数: ' + clash);
clashList.slice(0, 25).forEach(function(s){ console.log('    ' + s); });

// ---- 结构件统计（平台/楼梯/栏杆/厂房）----
console.log('\n===== 结构件统计 =====');
var stat = {platform:0, stair:0, rail:0, building:0, foundation:0};
scene.traverse(function(o){
  if (!o.userData) return;
  var k = o.userData.kind;
  if (k && stat[k] !== undefined) stat[k]++;
});
console.log('  ' + JSON.stringify(stat));
