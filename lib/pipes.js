// ============================================================
// 管线系统 — 按真实化工厂「管廊敷设」方式构建
// ------------------------------------------------------------
// 真实工厂管线不是从设备顶部凌空飞过，而是：
//   ① 从设备侧壁的接管口（低标高）引出
//   ② 沿管廊（管墩/支架支撑）低标高敷设，走直角折线
//   ③ 到目的地后立管升起，接入下一台设备的接管口
// 本模块按此逻辑生成：接口点 → 立管 → 水平管廊 → 立管 → 接口点
// 并配套管墩、管卡、弯头、闸阀、色环等管件
// ============================================================

var PIPE_DEFS = [
  // [起点设备tag, 终点设备tag, 钢管公称半径(m), 颜色, 介质类型, 名称]
  // ============ 主工艺线：钠化焙烧 → 水浸 → CCD洗涤 → 除杂 → 富集 → 沉钒 → 煅烧 ============
  ['V-101','B-102', 0.13, 0x9a9a9a, 'solid',   '钒渣皮带输送'],
  ['B-102','B-103', 0.13, 0x9a9a9a, 'solid',   '粗碎料输送'],
  ['B-103','M-104', 0.13, 0x9a9a9a, 'solid',   '细碎料输送'],
  ['M-104','H-105', 0.14, 0x33aa77, 'liquid',  '磨矿矿浆'],
  ['H-105','T-106', 0.14, 0x33aa77, 'liquid',  '分级溢流'],
  ['T-106','S-201', 0.14, 0x33aa77, 'liquid',  '浓密矿浆去配料'],
  ['S-201','K-202', 0.15, 0xcc6633, 'hot',     '钠化配料入窑'],
  ['K-202','C-204', 0.16, 0xcc6633, 'hot',     '焙烧熟料去冷却'],
  ['C-204','M-205', 0.15, 0xcc6633, 'hot',     '冷却熟料去湿磨'],
  ['M-205','R-301', 0.15, 0x33aa77, 'liquid',  '熟料矿浆入浸出'],
  ['R-301','R-302', 0.14, 0x33aa77, 'liquid',  '一级浸出矿浆'],
  ['R-302','R-303', 0.14, 0x33aa77, 'liquid',  '二级逆流矿浆'],
  ['R-303','T-303', 0.14, 0x33aa77, 'liquid',  '浸出矿浆入CCD浓密'],
  // CCD 逆流洗涤：溢流(含钒浸出液)去除杂；底流(尾渣)去压滤脱水
  ['T-303','R-305', 0.13, 0x33aa77, 'liquid',  '浓密溢流去除杂'],
  ['R-305','F-305', 0.12, 0x8a7a4a, 'liquid',  '除杂渣浆去压滤'],
  ['F-305','F-304', 0.12, 0x33aa77, 'liquid',  '除杂滤液去精滤'],
  ['F-304','E-401', 0.14, 0x33aa77, 'liquid',  '净化液去萃取'],
  ['T-303','P-303', 0.13, 0x8a7a4a, 'liquid',  '浓密底流(尾渣)去压滤'],
  ['P-303','T-303', 0.11, 0x44aacc, 'liquid',  '压滤滤液返回洗涤'],
  ['E-401','X-502', 0.13, 0x9966cc, 'organic', '负载有机相去离子交换'],
  ['X-502','P-501', 0.13, 0x33aa77, 'liquid',  '反萃/解吸富钒液'],
  ['P-501','T-502', 0.14, 0x33aa77, 'liquid',  'APV 沉钒料浆'],
  ['T-502','E-504', 0.12, 0x44aacc, 'liquid',  '沉钒母液去蒸发结晶'],
  ['T-502','P-503', 0.13, 0x33aa77, 'liquid',  'APV 底流'],
  ['P-503','K-601', 0.14, 0xcc6633, 'hot',     'APV 滤饼入煅烧窑'],
  ['K-601','V-602', 0.13, 0xcc6633, 'hot',     '煅烧成品 V2O5'],
  ['V-602','W-603', 0.13, 0x9a9a9a, 'solid',   '筛下成品'],
  ['W-603','Y-604', 0.13, 0x9a9a9a, 'solid',   '包装入库'],
  // ============ 烟气与环保线 ============
  ['K-202','D-203', 0.22, 0x8a7a6a, 'hot',     '窑尾烟气'],
  ['D-203','P-204', 0.22, 0x8a7a6a, 'hot',     '除尘后烟气'],
  ['P-204','A-701', 0.22, 0x8a7a6a, 'hot',     '引风机送烟气去洗涤'],
  ['K-601','A-702', 0.18, 0x8a7a6a, 'hot',     '煅烧含氨尾气'],
  ['A-701','A-702', 0.15, 0x44aacc, 'liquid',  '洗涤循环液'],
  ['A-702','W-703', 0.15, 0x44aacc, 'liquid',  '含氨废水'],
  ['T-106','W-703', 0.15, 0x44aacc, 'liquid',  '浓密机溢流水'],
  ['P-303','W-703', 0.13, 0x44aacc, 'liquid',  '尾渣滤液'],
  // ============ 公用工程（药剂 / 蒸汽 / 冷却水 / 仪表风）============
  ['S-801','P-501', 0.11, 0xaa8833, 'acid',    '硫酸（沉钒调酸）'],
  ['S-801','W-703', 0.11, 0xaa8833, 'acid',    '硫酸（废水中和）'],
  ['S-802','P-501', 0.11, 0x66aacc, 'liquid',  '硫酸铵溶液（沉钒加铵）'],
  ['S-802','T-303', 0.09, 0x66aacc, 'liquid',  '絮凝剂溶液'],
  ['S-802','R-305', 0.09, 0x66aacc, 'liquid',  '除杂剂溶液'],
  ['B-808','R-301', 0.12, 0xcc5533, 'steam',   '加热蒸汽（一级浸出）'],
  ['B-808','R-302', 0.12, 0xcc5533, 'steam',   '加热蒸汽（二级浸出）'],
  ['B-808','R-303', 0.12, 0xcc5533, 'steam',   '加热蒸汽（三级浸出）'],
  ['B-808','E-504', 0.12, 0xcc5533, 'steam',   '加热蒸汽（蒸发结晶）'],
  ['C-704','R-301', 0.16, 0x44aacc, 'liquid',  '循环冷却水'],
  ['C-704','K-202', 0.16, 0x44aacc, 'liquid',  '窑体冷却水'],
  ['C-704','K-601', 0.14, 0x44aacc, 'liquid',  '煅烧窑冷却水'],
  ['A-807','U-804', 0.10, 0x88aadd, 'air',     '仪表风'],
  ['A-807','K-601', 0.10, 0x88aadd, 'air',     '仪表风（煅烧）'],
  ['A-807','P-303', 0.10, 0x88aadd, 'air',     '压滤吹扫风'],
];


// ============================================================
//  设备接管参数（由实测设备包围盒标定）
//  sx/sz : 设备水平半跨（用于确定接管口在设备表面的位置）
//  portY : 接管口标高（真实工厂接管多在设备侧壁中下部，而非顶部）
// ============================================================
var PORTS = {
  'V-101': {sx: 5.50, sz: 5.50, portY: 1.20},
  'B-102': {sx: 2.15, sz: 1.27, portY: 1.80},
  'B-103': {sx: 2.30, sz: 2.20, portY: 1.90},
  'M-104': {sx: 3.65, sz: 1.25, portY: 1.00},
  'H-105': {sx: 1.28, sz: 1.28, portY: 1.60},
  'T-106': {sx: 5.10, sz: 5.10, portY: 1.20},
  'S-201': {sx: 2.20, sz: 1.25, portY: 1.60},
  // 注意：cx 为设备几何中心相对 pos 的 X 偏移（个别设备因烟囱等偏置）
  'K-202': {sx: 2.80, sz: 10.55, portY: 2.20, cx: 1.40},
  'B-808': {sx: 4.06, sz: 2.25, portY: 1.50, cx: -0.10},
  'D-203': {sx: 2.50, sz: 1.50, portY: 1.80},
  'C-204': {sx: 3.45, sz: 1.48, portY: 1.40},
  'R-301': {sx: 2.94, sz: 2.80, portY: 1.40},
  'R-302': {sx: 2.25, sz: 2.25, portY: 1.40},
  'R-303': {sx: 2.25, sz: 2.25, portY: 1.40},
  'T-303': {sx: 4.90, sz: 4.90, portY: 1.30},
  'P-303': {sx: 3.90, sz: 1.30, portY: 1.60},
  'F-304': {sx: 2.45, sz: 1.03, portY: 1.20},
  'E-401': {sx: 5.40, sz: 1.80, portY: 1.40},
  'X-502': {sx: 1.28, sz: 0.75, portY: 1.60},
  'P-501': {sx: 2.12, sz: 2.03, portY: 1.50},
  'T-502': {sx: 4.10, sz: 4.10, portY: 1.20},
  'P-503': {sx: 3.10, sz: 1.10, portY: 1.50},
  'K-601': {sx: 4.00, sz: 1.93, portY: 1.80},
  'V-602': {sx: 1.75, sz: 1.33, portY: 1.60},
  'W-603': {sx: 1.50, sz: 1.35, portY: 1.20},
  'Y-604': {sx: 2.00, sz: 1.50, portY: 0.80},
  'A-701': {sx: 2.65, sz: 2.50, portY: 1.20},
  'A-702': {sx: 1.83, sz: 1.75, portY: 1.20},
  'W-703': {sx: 2.75, sz: 2.00, portY: 1.00},
  'C-704': {sx: 2.80, sz: 2.50, portY: 1.20},
  'S-801': {sx: 4.00, sz: 2.50, portY: 0.90},
  'S-802': {sx: 3.00, sz: 2.50, portY: 0.90},
  'U-804': {sx: 4.00, sz: 1.66, portY: 0.80},
  'E-805': {sx: 3.09, sz: 2.00, portY: 1.20},
  'C-806': {sx: 2.75, sz: 2.25, portY: 1.20},
  'A-807': {sx: 2.00, sz: 1.50, portY: 1.00},
  'B-808': {sx: 4.06, sz: 2.25, portY: 1.50},
  'B-901': {sx: 3.00, sz: 3.00, portY: 0.80},
  'L-901': {sx: 2.00, sz: 1.50, portY: 1.20}
};

// 管廊敷设标高（管中心）。真实工厂低管廊 0.8~1.2 m，跨路段抬高到 4.5 m
var RACK_Y    = 1.05;
var RACK_HIGH = 4.60;   // 跨越厂区道路时的桁架标高

// 保温层厚度：管道外径 = 钢管半径 + 保温层（真实工业管道多带保温）
var INSUL = 0.07;

// 管线路径缓存：buildPipes() 后填充，每条管线一组路径点（Vector3 数组）
// 用途：① 物料流动指示沿路径移动 ② 流量计/压力变送器按真实做法装在管道上
var PIPE_ROUTES = [];

// ============================================================
//  接管口定位：射线实测设备真实表面
//  ----------------------------------------------------------
//  说明：PORTS 里的 sx/sz 是早期按名义尺寸标定的矩形半跨，
//  在设备改为 1:1 真实尺寸后已失真（如回转窑实际筒体半径仅 0.75 m，
//  而 PORTS 写 sx=2.80 → 接管口被推到距窑壳 3.9 m 的空中，
//  造成"管道既没来处也没去处"）。故改为对已建好的设备网格发射线，
//  命中真实壳体表面后再沿外法向让接管法兰伸出 0.30 m。
// ============================================================
function buildPipes(scene, equipMeshes) {
  var B = EQUIP_BUILDERS;
  var _surfCache = {};

  // 射线实测接管口前，必须保证设备世界矩阵是最新
  if (scene) scene.updateMatrixWorld(true);
  // ---------- 材质 ----------
  var pipeMat = {
    solid:   B.makePaint(0x9a9a9a),   // 固相/粉料 — 灰
    hot:     B.makePaint(0xcc6633),   // 热料/烟气 — 橙红（带保温）
    liquid:  B.makePaint(0x33aa77),   // 料液 — 绿
    organic: B.makePaint(0x9966cc),   // 有机相 — 紫
    acid:    B.makePaint(0xaa8833),   // 酸 — 土黄
    steam:   B.makePaint(0xcc5533),   // 蒸汽 — 红
    air:     B.makePaint(0x88aadd)    // 仪表风 — 浅蓝
  };
  var steelMat    = B.makeMetal(0x7a838c);
  var concreteMat = B.makeConcrete();
  var pierCount = 0, segCount = 0, routeAvoid = 0;
  var _pairCount = {};

  // ---------- 设备包围盒（用于管线避障选路） ----------
  var EQUIP_BOXES = [];
  if (typeof equipMeshes !== 'undefined' && equipMeshes) {
    equipMeshes.forEach(function(g, tag) {
      EQUIP_BOXES.push({tag: tag, box: new THREE.Box3().setFromObject(g)});
    });
  }
  // 点是否落在"非本管线所连设备"的本体范围内（真实工厂管廊必须绕开设备基础）
  function pointInsideEquip(p, exclA, exclB) {
    for (var i = 0; i < EQUIP_BOXES.length; i++) {
      var e = EQUIP_BOXES[i];
      if (e.tag === exclA || e.tag === exclB) continue;
      if (e.box.containsPoint(p)) return true;
    }
    return false;
  }

  // ---------- 设备中心 ----------
  var centerOf = {};
  EQUIPMENT.forEach(function(e){ centerOf[e.tag] = {x: e.pos[0], z: e.pos[2]}; });

  // ---------- 求设备表面接管口：射线实测真实壳体 ----------
  //        命中不了（极少数）才退回 PORTS 矩形近似
  function surfacePoint(tag, towardX, towardZ) {
    var c = centerOf[tag];
    var p = PORTS[tag] || {sx: 1.5, sz: 1.5, portY: 1.2};
    if (!c) return new THREE.Vector3(0, 1, 0);
    var host = (typeof equipMeshes !== 'undefined' && equipMeshes) ? equipMeshes.get(tag) : null;

    if (host) {
      var key = tag + '|' + towardX.toFixed(1) + '|' + towardZ.toFixed(1);
      if (_surfCache[key]) return _surfCache[key].clone();

      var box = new THREE.Box3().setFromObject(host);
      var cc = box.getCenter(new THREE.Vector3());
      var dx = towardX - cc.x, dz = towardZ - cc.z;
      var len = Math.sqrt(dx*dx + dz*dz);
      if (len < 0.01) { dx = 1; dz = 0; len = 1; }
      var ux = dx/len, uz = dz/len;

      // 接管标高候选：设计接管标高 → 收进设备真实标高范围 → 设备中部
      var yLo = box.min.y + 0.4;
      var yHi = Math.max(box.min.y + 0.9, box.max.y - 0.4);
      var yc  = Math.max(yLo, Math.min(p.portY, yHi));
      var tryY = [p.portY, yc, (box.min.y + box.max.y) / 2];
      // 方向候选：指向对方设备 → 轴向兜底（细长设备如回转窑）
      var dirs = [[ux, uz], [ux >= 0 ? 1 : -1, 0], [0, uz >= 0 ? 1 : -1]];

      for (var d = 0; d < dirs.length; d++) {
        for (var k = 0; k < tryY.length; k++) {
          var origin = new THREE.Vector3(cc.x + dirs[d][0]*50, tryY[k], cc.z + dirs[d][1]*50);
          var ray = new THREE.Raycaster(origin,
            new THREE.Vector3(-dirs[d][0], 0, -dirs[d][1]), 0.1, 100);
          var hits = ray.intersectObject(host, true);
          if (hits.length) {
            var h = hits[0].point;
            // 接管法兰自设备表面伸出 0.30 m
            var rp = new THREE.Vector3(h.x + dirs[d][0]*0.30, tryY[k], h.z + dirs[d][1]*0.30);
            _surfCache[key] = rp.clone();
            return rp;
          }
        }
      }
    }

    // ---- 回退：矩形近似（旧算法） ----
    var cx2 = c.x + (p.cx || 0);
    var dx2 = towardX - cx2, dz2 = towardZ - c.z;
    var len2 = Math.sqrt(dx2*dx2 + dz2*dz2);
    if (len2 < 0.01) { dx2 = 1; dz2 = 0; len2 = 1; }
    var ux2 = dx2/len2, uz2 = dz2/len2;
    var tX = Math.abs(ux2) > 1e-4 ? (p.sx / Math.abs(ux2)) : Infinity;
    var tZ = Math.abs(uz2) > 1e-4 ? (p.sz / Math.abs(uz2)) : Infinity;
    var d2 = Math.min(tX, tZ) + 0.35;
    return new THREE.Vector3(cx2 + ux2*d2, p.portY, c.z + uz2*d2);
  }

  // ---------- 画一段直管 ----------
  function seg(p1, p2, r, mat, type) {
    var dir = new THREE.Vector3().subVectors(p2, p1);
    var len = dir.length();
    if (len < 0.15) return;
    var mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    // 保温后外径
    var outer = r + (type === 'air' ? 0.02 : INSUL);
    var m = new THREE.Mesh(new THREE.CylinderGeometry(outer, outer, len, 14), mat);
    m.position.copy(mid);
    m.lookAt(p2);
    m.rotateX(Math.PI/2);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.isPipe = true;
    scene.add(m);
    segCount++;

    // 两端弯头（球关节）
    var eg = new THREE.SphereGeometry(outer*1.25, 10, 8);
    var e1 = new THREE.Mesh(eg, mat); e1.position.copy(p1); scene.add(e1);
    var e2 = new THREE.Mesh(eg, mat); e2.position.copy(p2); scene.add(e2);

    // 水平段：每隔约 5.5 m 设一个管墩/管卡
    if (Math.abs(p2.y - p1.y) < 0.05) {
      var n = Math.max(1, Math.floor(len / 5.5));
      for (var i = 1; i <= n; i++) {
        var t = i / (n + 1);
        var px = p1.x + (p2.x - p1.x) * t;
        var pz = p1.z + (p2.z - p1.z) * t;
        addPier(scene, concreteMat, steelMat, px, pz, p1.y, outer);
      }
    } else {
      // 立管：底部设一个管墩
      addPier(scene, concreteMat, steelMat, p1.x, p1.z, Math.min(p1.y, p2.y), outer);
    }
  }

  // ---------- 管墩 + 管卡 ----------
  function addPier(sc, cMat, sMat, x, z, pipeY, outer) {
    var top = pipeY - outer;               // 管底标高
    var h = top;
    if (h < 0.18) return;                  // 贴地不设墩
    var pier = new THREE.Mesh(new THREE.BoxGeometry(0.34, h, 0.34), cMat);
    pier.position.set(x, h/2, z);
    pier.castShadow = true; pier.receiveShadow = true;
    sc.add(pier);
    // 钢支架横梁
    var beam = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.16), sMat);
    beam.position.set(x, top - 0.03, z);
    sc.add(beam);
    // U 形管卡
    var clamp = new THREE.Mesh(new THREE.TorusGeometry(outer*1.15, 0.025, 6, 14), sMat);
    clamp.rotation.x = Math.PI/2;
    clamp.position.set(x, pipeY, z);
    sc.add(clamp);
    pierCount++;
  }

  // ---------- 闸阀（带手轮），装在起点立管上 ----------
  function addGateValve(p, r, mat) {
    var g = new THREE.Group();
    var outer = r + INSUL;
    var body = new THREE.Mesh(new THREE.CylinderGeometry(outer*1.35, outer*1.35, outer*2.2, 12), mat);
    g.add(body);
    var bonnet = new THREE.Mesh(new THREE.CylinderGeometry(outer*0.75, outer*0.95, outer*1.6, 10), steelMat);
    bonnet.position.y = outer*1.7; g.add(bonnet);
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, outer*1.4, 8), steelMat);
    stem.position.y = outer*2.6; g.add(stem);
    var wheel = new THREE.Mesh(new THREE.TorusGeometry(outer*1.15, 0.028, 8, 16), B.makePaint(0xcc3333));
    wheel.rotation.x = Math.PI/2;
    wheel.position.y = outer*3.3; g.add(wheel);
    g.position.copy(p);
    g.traverse(function(o){ if(o.isMesh) o.castShadow = true; });
    scene.add(g);
  }

  // ---------- 色环（介质标识，真实工厂每根管都有） ----------
  function addColorBand(p, outer, color) {
    var band = new THREE.Mesh(
      new THREE.CylinderGeometry(outer*1.12, outer*1.12, 0.16, 14),
      new THREE.MeshStandardMaterial({color: color, roughness: 0.5, metalness: 0.1})
    );
    band.position.copy(p);
    scene.add(band);
  }

  // ============================================================
  //  逐条管线生成：接口 →（立管）→ 管廊水平段 →（立管）→ 接口
  // ============================================================
  PIPE_DEFS.forEach(function(def, idx) {
    var tA = def[0], tB = def[1], r = def[2], color = def[3], type = def[4];
    var cA = centerOf[tA], cB = centerOf[tB];
    if (!cA || !cB) return;

    var mat = pipeMat[type] || pipeMat.liquid;

    // 两端接管口（朝对方方向引出，避免管道穿越设备本体）
    var A = surfacePoint(tA, cB.x, cB.z);
    var Bp = surfacePoint(tB, cA.x, cA.z);

    // 并行管线错开车道，避免所有管道重叠在同一条线上
    var lane = ((idx % 5) - 2) * 0.42;
    // 交替路由：偶数先沿 X 后沿 Z，奇数先沿 Z 后沿 X，减少相互重叠
    var firstX = (idx % 2) === 0;

    // 跨越厂区主干道（x=±22 / z=±40）时抬高到桁架标高
    function crossRoad(x1, z1, x2, z2) {
      var roadX = (Math.min(x1,x2) < -19 && Math.max(x1,x2) > -25) ||
                  (Math.min(x1,x2) <  19 && Math.max(x1,x2) >  25);
      var roadZ = (Math.min(z1,z2) < -37 && Math.max(z1,z2) > -43) ||
                  (Math.min(z1,z2) <  37 && Math.max(z1,z2) >  43);
      return (roadX || roadZ) ? RACK_HIGH : RACK_Y;
    }

    var yR = crossRoad(A.x, A.z, Bp.x, Bp.z);

    // ============================================================
    //  避障选路：生成多套候选路由（车道 + 折线顺序），按
    //  「穿越其他设备本体的采样点数」打分，取最优的一条
    //  ——真实工厂管廊就是这样绕开设备基础的
    // ============================================================
    var LANES   = [0, -0.42, 0.42, -0.84, 0.84, -1.26, 1.26, -2.1, 2.1];  // 横向车道偏移(m)
    var YOFFS   = [0, 0.105, -0.105, 0.21, -0.21];                          // 管廊标高微调(m)
    var DETOURS = [-6, -3, 3, 6, -9, 9, -13, 13];                           // 绕行横向距离(m)
    var PERIM_W = -52, PERIM_E = 46;                                        // 厂区外围管廊坐标
    // 注意：横向偏移(v)只作用于 X/Z 平面；管廊标高另用 yOff 微调，
    //      两者不能混用（否则大绕行量会把管廊标高算到地面以下）
    function makeRoute(kind, v, yOff) {
      var yL = yR + yOff;
      var pts = [A.clone(), new THREE.Vector3(A.x, yL, A.z)];
      if (kind === 'XZ') {          // 先沿 X 再沿 Z（车道偏移）
        pts.push(new THREE.Vector3(Bp.x, yL, A.z));
        pts.push(new THREE.Vector3(Bp.x, yL, Bp.z + v));
      } else if (kind === 'ZX') {   // 先沿 Z 再沿 X
        pts.push(new THREE.Vector3(A.x + v, yL, Bp.z));
        pts.push(new THREE.Vector3(Bp.x, yL, Bp.z));
      } else if (kind === 'ZXZ') {  // Z→X→Z 绕行（横向绕开设备基础）
        var zd = (A.z + Bp.z) / 2 + v;
        pts.push(new THREE.Vector3(A.x, yL, zd));
        pts.push(new THREE.Vector3(Bp.x, yL, zd));
        pts.push(new THREE.Vector3(Bp.x, yL, Bp.z));
      } else if (kind === 'PERIMW' || kind === 'PERIME') {
        // 外围公用管廊：长距离跨工段管线沿厂区围墙内侧敷设（真实工厂的公用主管廊做法）
        var px = (kind === 'PERIMW') ? PERIM_W : PERIM_E;
        pts.push(new THREE.Vector3(px, yL, A.z));
        pts.push(new THREE.Vector3(px, yL, Bp.z + v));
        pts.push(new THREE.Vector3(Bp.x, yL, Bp.z + v));
        pts.push(new THREE.Vector3(Bp.x, yL, Bp.z));
      } else {                      // XZX 绕行
        var xd = (A.x + Bp.x) / 2 + v;
        pts.push(new THREE.Vector3(xd, yL, A.z));
        pts.push(new THREE.Vector3(xd, yL, Bp.z));
        pts.push(new THREE.Vector3(Bp.x, yL, Bp.z));
      }
      pts.push(new THREE.Vector3(Bp.x, yL, Bp.z));   // 终点立管底
      pts.push(Bp.clone());
      return pts;
    }
    function routeCost(pts) {
      var hits = 0, len = 0;
      for (var j = 0; j < pts.length - 1; j++) {
        var a = pts[j], b = pts[j+1];
        var L = a.distanceTo(b);
        len += L;
        if (Math.abs(a.y - b.y) > 0.05) continue;      // 只查水平管廊段
        var n = Math.max(1, Math.floor(L / 1.2));
        for (var i = 1; i < n; i++) {
          var p = new THREE.Vector3().lerpVectors(a, b, i / n);
          if (pointInsideEquip(p, tA, tB)) hits++;
        }
      }
      return hits * 1000 + len;                        // 穿越优先否决，其次选短
    }

    var pairKey = tA + '>' + tB;
    _pairCount[pairKey] = (_pairCount[pairKey] || 0) + 1;
    var laneBias = (_pairCount[pairKey] - 1) % 3;      // 同起终点的多条管线错开车道

    var best = null, bestScore = Infinity;
    function consider(cand) {
      var sc = routeCost(cand);
      if (sc < bestScore) { bestScore = sc; best = cand; }
    }
    YOFFS.forEach(function(yo){
      LANES.forEach(function(v){
        consider(makeRoute('XZ', v, yo));
        consider(makeRoute('ZX', v, yo));
      });
    });
    // 外围公用管廊方案：常规折线绕不开时启用（成本函数会自然比较"绕远"与"穿越设备"）
    if (bestScore >= 1000) {
      YOFFS.forEach(function(yo){
        DETOURS.forEach(function(v){
          consider(makeRoute('ZXZ', v, yo));
          consider(makeRoute('XZX', v, yo));
        });
        consider(makeRoute('PERIMW', 0, yo));
        consider(makeRoute('PERIME', 0, yo));
        [-10, -5, 5, 10, -16, 16].forEach(function(v){
          consider(makeRoute('PERIMW', v, yo));
          consider(makeRoute('PERIME', v, yo));
        });
      });
    }

    var route = best;
    routeAvoid = routeAvoid + ((bestScore >= 1000) ? 1 : 0);

    // —— 起点：设备接口 → 降到管廊标高 ——
    addGateValve(new THREE.Vector3(A.x, yR + 0.35, A.z), r, mat);

    // —— 逐段成管：首尾为立管，中间为管廊水平段（遍历全部折点，杜绝中间断口） ——
    var bandDone = false;
    for (var sj = 0; sj < route.length - 1; sj++) {
      var p1 = route[sj], p2 = route[sj+1];
      seg(p1, p2, r, mat, type);
      if (!bandDone && Math.abs(p1.y - p2.y) < 0.05 && p1.distanceTo(p2) > 2.5) {
        addColorBand(new THREE.Vector3((p1.x+p2.x)/2, p1.y, (p1.z+p2.z)/2), r + INSUL, color);
        bandDone = true;
      }
    }

    // 存路径：idx 对应 PIPE_DEFS 下标
    PIPE_ROUTES[idx] = route;
    route.pipeR = r;
    route.pipeType = type;
    route.fromTag = tA;
    route.toTag = tB;
  });

  console.log('[管线] 生成 ' + PIPE_DEFS.length + ' 条，管段 ' + segCount + ' 节，管墩 ' + pierCount +
              ' 个' + (routeAvoid ? '，仍有 ' + routeAvoid + ' 条无法完全避开设备' : '，全部避开设备本体'));
}
