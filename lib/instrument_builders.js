// ============================================================
// 3D 仪表模型构建器 — 按真实工业仪表的安装形式与外形构建
// 依赖: THREE, INSTRUMENTS, INSTR_META, CONTROL_LOOPS, INTERLOCKS
//       PIPE_ROUTES（管道路径，供管道上仪表取点）
// 加载顺序: lib/equip_builders.js → lib/pipes.js → lib/instrument_builders.js
// ============================================================
// ------------------------------------------------------------
//  可视化放大说明
//  真实就地压力表表盘 ⌀100~150 mm，在 120 m 厂区里远观不可见。
//  故表盘按 3:1 放大到 ⌀0.42 m，支架/引压管按同比例配套。
//  外形比例（表盘:表壳:支架:引压管）与真实仪表一致。
// ------------------------------------------------------------
var INSTR_SCALE = 1.0;
var GAUGE_R = 0.21;          // 表盘半径（放大后）

// ============================================================
//  设备「仪表挂载盒」——只覆盖设备主体，不含烟囱/管架等附属件
// ============================================================
var MOUNT_BOX = {
  'K-202': {sx: 2.20, sz: 9.00, h: 4.20},
  'A-701': {sx: 2.20, sz: 2.20, h: 8.00},
  'A-702': {sx: 1.70, sz: 1.60, h: 4.60},
  'B-808': {sx: 3.20, sz: 2.20, h: 3.40},
  'K-601': {sx: 3.20, sz: 1.90, h: 3.60},
  'C-704': {sx: 2.60, sz: 2.40, h: 5.40},
  'S-801': {sx: 3.60, sz: 2.30, h: 5.00},
  'S-802': {sx: 2.80, sz: 2.30, h: 6.00},
  'T-106': {sx: 5.00, sz: 5.00, h: 2.60},
  'T-303': {sx: 4.30, sz: 4.30, h: 3.00},
  'T-502': {sx: 4.00, sz: 4.00, h: 2.60},
  'R-301': {sx: 2.80, sz: 2.70, h: 4.60},
  'R-302': {sx: 2.20, sz: 2.20, h: 4.00},
  'R-303': {sx: 2.20, sz: 2.20, h: 4.00},
  'E-401': {sx: 5.20, sz: 1.70, h: 3.40},
  'P-303': {sx: 3.60, sz: 1.30, h: 2.20},
  'P-503': {sx: 3.00, sz: 1.10, h: 2.10},
  'V-101': {sx: 4.50, sz: 4.50, h: 3.00},
  'B-901': {sx: 3.00, sz: 3.00, h: 1.50},
  'U-804': {sx: 3.60, sz: 1.50, h: 3.20}
};

var INSTRUMENT_BUILDERS = {
  _box: function(w,h,d,mat){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); },
  _cyl: function(r,r2,h,mat,seg){ return new THREE.Mesh(new THREE.CylinderGeometry(r,r2,h,seg||16),mat); },
  _sph: function(r,mat){ return new THREE.Mesh(new THREE.SphereGeometry(r,12,10),mat); },
  _tor: function(r,tube,mat){ return new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,20),mat); },

  makeMetal: function(c){ return new THREE.MeshStandardMaterial({color:c!==undefined?c:0x9aa5b1, roughness:0.35, metalness:0.7}); },
  makeCase:  function(c){ return new THREE.MeshStandardMaterial({color:c!==undefined?c:0x2f3f52, roughness:0.6, metalness:0.25}); },
  makeDial:  function(){ return new THREE.MeshStandardMaterial({color:0xf2f4f6, roughness:0.25, metalness:0.1}); },
  makeGlow:  function(c){ return new THREE.MeshStandardMaterial({color:c, emissive:c, emissiveIntensity:0.85, roughness:0.4}); },

  _colorOf: function(type){
    var hex = (INSTR_META[type] && INSTR_META[type].color) || '#8899aa';
    return parseInt(hex.replace('#','0x'), 16);
  },

  // ============================================================
  //  量程解析：'0~1200 ℃' → [0,1200]；'-500~0 Pa' → [-500,0]
  // ============================================================
  parseRange: function(instr){
    if (instr._rng) return instr._rng;
    var mn = 0, mx = 100;
    if (typeof instr.range === 'string') {
      var m = instr.range.match(/(-?[\d.]+)\s*[~～-]\s*(-?[\d.]+)/);
      if (m) { mn = parseFloat(m[1]); mx = parseFloat(m[2]); }
    }
    instr._rng = [mn, mx];
    return instr._rng;
  },

  // ============================================================
  //  表盘纹理（Canvas 绘制）：刻度 + 高低报警区 + 指针 + 数值
  //  这才是"现场能看到的仪表盘"，用户能直接读出当前工况
  // ============================================================
  makeGaugeTexture: function(instr){
    var S = 256, C = S/2;
    var canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    var ctx = canvas.getContext('2d');
    var R = C - 10;

    // 盘面（白）
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI*2); ctx.fill();

    var rng = this.parseRange(instr);
    var mn = rng[0], mx = rng[1];
    function normOf(v){ return Math.max(0, Math.min(1, (v - mn) / (mx - mn || 1))); }
    // 角度：0 位在左下(225°)，满量程在右下(135°)，顺时针扫过 270°
    function angOf(n){ return (225 + n * 270) * Math.PI / 180; }
    // canvas 弧度（0 → +X 方向），表盘 0° 指向 12 点
    function radOf(n){ return angOf(n) - Math.PI/2; }

    // 报警区（外圈色带）：低低-低 黄，高-高高 红
    function arcBand(n0, n1, color, w){
      if (n1 <= n0) return;
      ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(C, C, R - 8, radOf(n0), radOf(n1)); ctx.stroke();
    }
    if (instr.ll !== undefined) arcBand(normOf(instr.ll === undefined ? mn : instr.ll), normOf(instr.l !== undefined ? instr.l : mn), '#e8a33d', 7);
    if (instr.l  !== undefined && instr.ll !== undefined) arcBand(normOf(instr.ll), normOf(instr.l), '#e8a33d', 7);
    if (instr.h  !== undefined) arcBand(normOf(instr.h), normOf(instr.hh !== undefined ? instr.hh : mx), '#d64545', 7);

    // 刻度：20 大格 + 每格 5 小格
    ctx.strokeStyle = '#2b3440';
    for (var i = 0; i <= 20; i++){
      var n = i/20, a = radOf(n);
      var big = (i % 5 === 0);
      ctx.lineWidth = big ? 3 : 1.5;
      var r0 = R - (big ? 22 : 14), r1 = R - 8;
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(a)*r0, C + Math.sin(a)*r0);
      ctx.lineTo(C + Math.cos(a)*r1, C + Math.sin(a)*r1);
      ctx.stroke();
    }
    // 表盘外圈
    ctx.strokeStyle = '#7b8794'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(C, C, R - 2, 0, Math.PI*2); ctx.stroke();

    // 指针（当前值）
    var pv = (instr.faultPv !== undefined && instr._showFault) ? instr.faultPv : instr.pv;
    var np = normOf(pv);
    var ap = radOf(np);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(C - Math.cos(ap)*12, C - Math.sin(ap)*12);
    ctx.lineTo(C + Math.cos(ap)*(R - 26), C + Math.sin(ap)*(R - 26));
    ctx.stroke();
    // 中心轴
    ctx.fillStyle = '#2b3440';
    ctx.beginPath(); ctx.arc(C, C, 8, 0, Math.PI*2); ctx.fill();

    // 数值显示窗
    ctx.fillStyle = '#101c30';
    ctx.fillRect(C - 46, C + 24, 92, 34);
    ctx.fillStyle = '#7fe3a0';
    ctx.font = 'bold 22px Consolas, "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(pv), C, C + 34);
    ctx.fillStyle = '#9fb2c7';
    ctx.font = '13px Consolas, monospace';
    ctx.fillText(String(instr.unit || ''), C, C + 52);

    // 位号
    ctx.fillStyle = '#2b3440';
    ctx.font = 'bold 17px Consolas, monospace';
    ctx.fillText(instr.tag, C, C - 34);

    var tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  },

  // ============================================================
  //  就地指示仪表（现场仪表，带可见表盘）
  //  真实形式：PI 压力表 / TI 双金属温度计 / LI 玻璃板液位计 / FI 转子流量计
  //  mount: 'post'(落地支架) | 'wall'(设备壁支架) | 'pipe'(管道取压)
  // ============================================================
  buildLocalGauge: function(instr, mount){
    var g = new THREE.Group();
    g.name = 'INST_' + instr.tag;
    var mm = this.makeMetal();
    var accent = this._colorOf(instr.type);
    var caseMat = this.makeCase(accent);

    // —— 表壳（金属圆环 + 壳体）——
    var shell = this._cyl(GAUGE_R*1.10, GAUGE_R*1.10, 0.07, caseMat, 28);
    shell.rotation.x = Math.PI/2;
    g.add(shell);
    var bezel = this._tor(GAUGE_R*1.10, 0.022, mm);
    g.add(bezel);

    // —— 表盘（Canvas 贴图，带刻度与指针）——
    var faceMat;
    try {
      faceMat = new THREE.MeshStandardMaterial({
        map: this.makeGaugeTexture(instr), roughness: 0.35, metalness: 0.05
      });
    } catch (e) {
      faceMat = this.makeDial();
    }
    var face = new THREE.Mesh(new THREE.CircleGeometry(GAUGE_R, 32), faceMat);
    face.position.z = 0.037;
    g.add(face);
    g.userData.faceMat = faceMat;

    // —— 安装附件（这是"不悬空"的关键）——
    if (mount === 'pipe') {
      // 管道取压：表头 → 根部阀 → 引压短管 → 管顶
      var rootValve = this._cyl(0.035, 0.035, 0.09, mm, 10);
      rootValve.position.y = -0.10; g.add(rootValve);
      var hv = this._box(0.10, 0.05, 0.03, this.makeCase(0xcc3333));
      hv.position.y = -0.10; g.add(hv);
      var impulse = this._cyl(0.022, 0.022, 0.20, mm, 8);
      impulse.position.y = -0.24; g.add(impulse);
      var weld = this._cyl(0.06, 0.06, 0.05, mm, 12);
      weld.position.y = -0.36; g.add(weld);
    } else if (mount === 'post') {
      // 落地支架：立柱 + 底座（气体探测器/火焰检测器的真实安装形式）
      // 立柱从表头一直伸到地面（表头离地 1.55 m → 柱长 1.42 + 底座落地）
      var post = this._cyl(0.045, 0.045, 1.42, mm, 10);
      post.position.y = -0.81; g.add(post);
      var plate = this._box(0.24, 0.04, 0.24, mm);
      plate.position.y = -1.53; g.add(plate);
      var arm = this._cyl(0.03, 0.03, 0.22, mm, 8);
      arm.rotation.z = Math.PI/2;
      arm.position.set(-0.10, -0.16, 0); g.add(arm);
    } else {
      // 设备壁支架：引压管 + 根部阀 + 法兰（温度/压力最典型）
      // 注意：表盘经 lookAt 后 +Z 朝外（背离设备），附件必须沿 -Z 指向设备本体
      var neck = this._cyl(0.028, 0.028, 0.22, mm, 8);
      neck.rotation.x = Math.PI/2;
      neck.position.z = -0.24; g.add(neck);
      var rv = this._cyl(0.038, 0.038, 0.08, mm, 10);
      rv.rotation.x = Math.PI/2;
      rv.position.z = -0.38; g.add(rv);
      var fl = this._cyl(0.075, 0.075, 0.03, mm, 14);
      fl.rotation.x = Math.PI/2;
      fl.position.z = -0.445; g.add(fl);
    }

    // 仪表位号牌（挂在表下方，远观可辨）
    try {
      var tag = this.makeTagSprite(instr);
      tag.position.set(0, -GAUGE_R - 0.14, 0);
      tag.userData.isTag = true;
      g.add(tag);
    } catch (e) {}

    g.userData = {instr: instr, isInstrument: true, tag: instr.tag, mount: mount, faceMat: faceMat};
    g.traverse(function(o){ if(o.isMesh){ o.castShadow = true; } });
    return g;
  },

  // ============================================================
  //  变送器（远传型，无大表盘；本体小，带引压管与根部阀）
  //  真实形式：1151/3051 型压力变送器、温度变送器、雷达液位计
  // ============================================================
  buildTransmitter: function(instr, mount){
    var g = new THREE.Group();
    g.name = 'INST_' + instr.tag;
    var mm = this.makeMetal();
    var accent = this._colorOf(instr.type);
    var caseMat = this.makeCase(accent);

    var t = instr.type;
    if (t === 'L') {
      // 雷达/超声波液位计：法兰 + 喇叭天线朝下，装在设备顶部
      var flange = this._cyl(0.11, 0.11, 0.03, mm, 18);
      flange.position.y = -0.06; g.add(flange);
      var horn = this._cyl(0.05, 0.10, 0.12, mm, 18);
      horn.position.y = -0.13; g.add(horn);
      var lbody = this._box(0.17, 0.16, 0.13, caseMat);
      lbody.position.y = 0.06; g.add(lbody);
      var lface = this._box(0.10, 0.075, 0.01, this.makeDial());
      lface.position.set(0, 0.07, 0.07); g.add(lface);
    } else if (t === 'T') {
      // 温度变送器：热电偶套管（插入设备）+ 接线盒 + 变送模块
      // 套管沿 -Z 插入设备本体（lookAt 后 -Z 指向设备）
      var tube = this._cyl(0.028, 0.028, 0.42, mm, 10);
      tube.rotation.x = Math.PI/2;
      tube.position.z = -0.34; g.add(tube);
      var neckT = this._cyl(0.048, 0.048, 0.14, mm, 12);
      neckT.position.y = 0.10; g.add(neckT);
      var headT = this._cyl(0.085, 0.085, 0.10, caseMat, 18);
      headT.position.y = 0.21; g.add(headT);
      var lidT = this._cyl(0.088, 0.088, 0.02, mm, 18);
      lidT.position.y = 0.27; g.add(lidT);
    } else {
      // 通用变送器（压力/流量/分析）：引压管 + 根部阀 + 圆形本体
      // 引压管沿 -Z 指向设备
      var imp = this._cyl(0.022, 0.022, 0.26, mm, 8);
      imp.rotation.x = Math.PI/2;
      imp.position.z = -0.26; g.add(imp);
      var rv2 = this._cyl(0.040, 0.040, 0.08, mm, 10);
      rv2.rotation.x = Math.PI/2;
      rv2.position.z = -0.38; g.add(rv2);
      var body = this._cyl(0.10, 0.10, 0.13, mm, 18);
      body.rotation.z = Math.PI/2; g.add(body);
      var cover = this._cyl(0.095, 0.095, 0.02, caseMat, 18);
      cover.rotation.z = Math.PI/2;
      cover.position.x = 0.075; g.add(cover);
      var lcd = this._box(0.05, 0.035, 0.01, this.makeDial());
      lcd.position.set(0.095, 0, 0); g.add(lcd);
      var conduit = this._cyl(0.022, 0.022, 0.14, mm, 8);
      conduit.position.set(0, 0.12, 0); g.add(conduit);
    }

    try {
      var tg = this.makeTagSprite(instr);
      tg.position.set(0, 0.34, 0);
      tg.userData.isTag = true;
      g.add(tg);
    } catch (e) {}

    g.userData = {instr: instr, isInstrument: true, tag: instr.tag, mount: mount};
    g.traverse(function(o){ if(o.isMesh){ o.castShadow = true; } });
    return g;
  },

  // ============================================================
  //  分析仪（箱式机柜 + 显示屏，如 pH 计/烟气分析仪/浓度计）
  //  真实形式：落地或挂墙的分析小屋/分析柜，带取样管
  // ============================================================
  buildAnalyzer: function(instr){
    var g = new THREE.Group();
    g.name = 'INST_' + instr.tag;
    var mm = this.makeMetal();
    var accent = this._colorOf(instr.type);
    var caseMat = this.makeCase(accent);

    // 分析柜（落地，高 1.4 m）
    var cab = this._box(0.46, 1.10, 0.34, caseMat);
    cab.position.y = 0.55; g.add(cab);
    // 显示屏（自发光，远观可辨）
    var screen = this._box(0.34, 0.24, 0.02, this.makeGlow(0x2288cc));
    screen.position.set(0, 0.86, 0.175); g.add(screen);
    // 柜门分隔
    var door = this._box(0.40, 0.40, 0.01, this.makeMetal(0x3a4654));
    door.position.set(0, 0.36, 0.175); g.add(door);
    // 底座
    var plinth = this._box(0.50, 0.10, 0.38, mm);
    plinth.position.y = 0.05; g.add(plinth);
    // 取样管（从设备引来，接入柜体）—— 沿 -Z 指向设备
    var sample = this._cyl(0.025, 0.025, 0.55, mm, 8);
    sample.rotation.x = Math.PI/2;
    sample.position.set(0, 0.75, -0.50); g.add(sample);
    // 探头（插入工艺介质）
    var probe = this._cyl(0.035, 0.025, 0.30, mm, 10);
    probe.rotation.x = Math.PI/2;
    probe.position.set(0, 0.75, -0.80); g.add(probe);
    var tip = this._sph(0.035, this.makeGlow(0x33ccff));
    tip.position.set(0, 0.75, -0.96); g.add(tip);

    try {
      var ta = this.makeTagSprite(instr);
      ta.position.set(0, 1.32, 0);
      ta.userData.isTag = true;
      g.add(ta);
    } catch (e) {}

    g.userData = {instr: instr, isInstrument: true, tag: instr.tag, mount: 'post'};
    g.traverse(function(o){ if(o.isMesh){ o.castShadow = true; } });
    return g;
  },

  // ============================================================
  //  按位号判定仪表形式（HG/T 20505）
  //   第二位 I → 就地指示（带表盘）  T → 变送器   E → 检测元件
  // ============================================================
  isLocalIndicating: function(instr){
    var tag = instr.tag;
    var fn = tag.length >= 2 ? tag.charAt(1) : 'I';
    return fn === 'I';
  },
  isTransmitting: function(instr){
    var tag = instr.tag;
    var fn = tag.length >= 2 ? tag.charAt(1) : 'I';
    return fn === 'T';
  },

  build: function(instr, mount){
    if (instr.type === 'A' && this.isLocalIndicating(instr)) return this.buildAnalyzer(instr);
    if (this.isLocalIndicating(instr)) return this.buildLocalGauge(instr, mount || 'wall');
    return this.buildTransmitter(instr, mount || 'wall');
  },

  // ============================================================
  //  位号浮标：Canvas 贴图 Sprite
  // ============================================================
  makeTagSprite: function(instr){
    var canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    var hex = (INSTR_META[instr.type] && INSTR_META[instr.type].color) || '#8899aa';
    ctx.fillStyle = 'rgba(8,18,38,0.88)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 12, 64);
    ctx.strokeStyle = hex; ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 253, 61);
    ctx.fillStyle = '#eaf4ff';
    ctx.font = 'bold 30px Consolas, "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(instr.tag, 22, 34);
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false});
    var sp = new THREE.Sprite(mat);
    sp.scale.set(0.62, 0.155, 1);
    return sp;
  },

  // ============================================================
  //  管道取点（带方向）：返回设备相连管段上的点 + 该段水平方向单位向量
  //  用于流量计/调节阀/SIS切断阀按真实做法夹装在管道上
  // ============================================================
  pipePointEx: function(equipTag, seq){
    if (typeof PIPE_ROUTES === 'undefined') return null;
    var segs = [];
    for (var i = 0; i < PIPE_ROUTES.length; i++){
      var r = PIPE_ROUTES[i];
      if (!r || r.length < 3) continue;
      if (r.fromTag !== equipTag && r.toTag !== equipTag) continue;
      // 收集所有水平管廊段（y 基本相同的相邻点）
      for (var j = 0; j < r.length - 1; j++){
        var a = r[j], b = r[j+1];
        if (Math.abs(a.y - b.y) > 0.05) continue;
        var len = Math.sqrt((b.x-a.x)*(b.x-a.x) + (b.z-a.z)*(b.z-a.z));
        if (len < 1.6) continue;
        segs.push({a: a, b: b, len: len});
      }
    }
    if (!segs.length) return null;
    var sg = segs[seq % segs.length];          // 段数不够时循环复用
    var t = 0.30 + ((seq * 0.19) % 0.45);      // 同段内错开阀门/仪表
    return {
      p: new THREE.Vector3(sg.a.x + (sg.b.x-sg.a.x)*t, sg.a.y, sg.a.z + (sg.b.z-sg.a.z)*t),
      dx: (sg.b.x-sg.a.x)/sg.len, dz: (sg.b.z-sg.a.z)/sg.len
    };
  },

  // 兼容旧接口：只取点
  pipePoint: function(equipTag, seq){
    var ex = this.pipePointEx(equipTag, seq);
    return ex ? ex.p : null;
  },

  // ============================================================
  //  射线实测设备表面：从设备外 40m 处沿水平方向射向设备中心
  //  返回真实表面命中点（适配圆柱窑体、球罐、框架等任意外形）
  // ============================================================
  surfaceHit: function(host, center, dirX, dirZ, y){
    if (!host) return null;
    var origin = new THREE.Vector3(center.x + dirX*40, y, center.z + dirZ*40);
    var ray = new THREE.Raycaster(origin, new THREE.Vector3(-dirX, 0, -dirZ), 0.1, 80);
    var hits = ray.intersectObject(host, true);
    return hits.length ? hits[0].point : null;
  },

  // ============================================================
  //  挂载位置计算：贴到设备主体表面
  // ============================================================
  calcMountPos: function(instr, box, idx, sameTypeCount){
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    var mb = MOUNT_BOX[instr.equip];
    var sx = mb ? mb.sx : Math.min(size.x / 2, 6.0);
    var sz = mb ? mb.sz : Math.min(size.z / 2, 6.0);
    var H  = mb ? mb.h  : Math.min(size.y, 5.0);
    if (H < 1.2) H = 1.2;

    var ang;
    if (sameTypeCount > 1) {
      ang = (idx / sameTypeCount) * Math.PI * 2 + (instr.type.charCodeAt(0) % 7) * 0.35;
    } else {
      ang = ((instr.tag.charCodeAt(instr.tag.length-1) % 8) / 8) * Math.PI * 2;
    }

    var t = instr.type;
    var yFrac;
    if (t === 'L')       yFrac = 1.0;    // 液位：装顶部
    else if (t === 'F')  yFrac = 0.35;
    else if (t === 'P')  yFrac = 0.42;   // 压力：引压点在中部（便于观察）
    else if (t === 'T')  yFrac = 0.58;
    else if (t === 'A')  yFrac = 0.60;
    else if (t === 'S')  yFrac = 0.80;
    else if (t === 'W')  yFrac = 0.20;
    else if (t === 'I' || t === 'E') yFrac = 0.50;
    else if (t === 'G')  yFrac = 0.45;
    else if (t === 'B')  yFrac = 0.50;
    else                 yFrac = 0.64;
    var y = Math.max(1.35, H * yFrac);   // 表盘中心不低于 1.35 m（便于现场读数）
    if (t === 'G') y = 1.55;             // 气体探测器固定在呼吸带高度

    var ux = Math.cos(ang), uz = Math.sin(ang);
    var dist = 1 / Math.sqrt((ux/sx)*(ux/sx) + (uz/sz)*(uz/sz));
    if (dist > 3.5) dist = 3.5;
    var r = dist + 0.28;

    return new THREE.Vector3(center.x + Math.cos(ang)*r, y, center.z + Math.sin(ang)*r);
  },

  // ============================================================
  //  主入口：为所有设备挂载仪表 + 控制阀
  // ============================================================
  mountAll: function(scene, equipMeshes){
    var self = this;
    var created = new Map();
    var valveMap = new Map();

    scene.updateMatrixWorld(true);   // 射线检测前必须更新世界矩阵

    var byEquip = {};
    INSTRUMENTS.forEach(function(m){
      (byEquip[m.equip] = byEquip[m.equip] || []).push(m);
    });

    Object.keys(byEquip).forEach(function(eqTag){
      var host = equipMeshes.get(eqTag);
      if (!host) return;
      var box = new THREE.Box3().setFromObject(host);
      var c = box.getCenter(new THREE.Vector3());
      var sizeY = box.getSize(new THREE.Vector3()).y;
      var list = byEquip[eqTag];

      var typeIdx = {};
      list.forEach(function(m){ typeIdx[m.type] = (typeIdx[m.type]||0)+1; });
      var seen = {};
      var flowSeq = 0;   // 该设备上第几个流量计（用于在管道上错开位置）

      list.forEach(function(m){
        seen[m.type] = (seen[m.type] || 0);
        var mount = 'wall';
        var pos = null;
        var outX = null, outZ = null;   // 安装朝向（设备表面外法向），供 lookAt 使用
        var isAnalyzer = (m.type === 'A' && self.isLocalIndicating(m));
        var isPost = (m.type === 'G' || m.type === 'B');

        // ① 流量计：按真实做法夹装在管道上（取靠近本设备的一段水平管廊）
        //    若取到的管段离设备太远（跨工段长管线），退回设备壁安装，避免"仪表飘在半路"
        if (m.type === 'F') {
          var pp = self.pipePoint(eqTag, flowSeq);
          if (pp) {
            var dc = Math.sqrt((pp.x - c.x)*(pp.x - c.x) + (pp.z - c.z)*(pp.z - c.z));
            // 管廊本就敷设在设备之间的通道上，12 m 内均属该设备的正常取压范围
            if (dc <= 12.0) {
              pos = pp.clone();
              pos.y += 0.34;        // 表头在管顶上方（真实：管顶取压 + 表头抬高便于读数）
              mount = 'pipe';
            }
          }
        }
        // ② 气体探测器 / 火焰检测器：落地支架安装（真实：立柱 + 底座）
        if (!pos && isPost) mount = 'post';

        // ③ 通用定位：射线实测设备表面，安装件精确贴到本体上
        if (!pos) {
          var ang;
          if (typeIdx[m.type] > 1) {
            ang = (seen[m.type] / typeIdx[m.type]) * Math.PI * 2 + (m.type.charCodeAt(0) % 7) * 0.35;
          } else {
            ang = ((m.tag.charCodeAt(m.tag.length-1) % 8) / 8) * Math.PI * 2;
          }
          var ux = Math.cos(ang), uz = Math.sin(ang);
          var mb = MOUNT_BOX[m.equip];
          var sx = mb ? mb.sx : Math.min(box.getSize(new THREE.Vector3()).x / 2, 6.0);
          var sz = mb ? mb.sz : Math.min(box.getSize(new THREE.Vector3()).z / 2, 6.0);
          var H  = mb ? mb.h  : Math.min(sizeY, 5.0);
          if (H < 1.2) H = 1.2;

          var t = m.type;
          var yFrac;
          if (t === 'L')       yFrac = 1.0;
          else if (t === 'F')  yFrac = 0.35;
          else if (t === 'P')  yFrac = 0.42;
          else if (t === 'T')  yFrac = 0.58;
          else if (t === 'A')  yFrac = 0.60;
          else if (t === 'S')  yFrac = 0.80;
          else if (t === 'W')  yFrac = 0.20;
          else if (t === 'I' || t === 'E') yFrac = 0.50;
          else if (t === 'G')  yFrac = 0.45;
          else if (t === 'B')  yFrac = 0.50;
          else                 yFrac = 0.64;
          var y = Math.max(1.35, H * yFrac);
          if (t === 'G') y = 1.55;

          if (isAnalyzer) {
            // 分析柜落地，探头在 0.75 m 高度插入设备
            var hitA = self.surfaceHit(host, c, ux, uz, 0.75);
            if (hitA) {
              pos = new THREE.Vector3(hitA.x + ux*0.90, 0, hitA.z + uz*0.90);
              outX = ux; outZ = uz;
            } else {
              pos = self.calcMountPos(m, box, seen[m.type], typeIdx[m.type]);
              pos.y = 0;
            }
            mount = 'analyzer';
          } else if (mount === 'post') {
            // 探测器立柱：表头 1.55 m，柱脚落地
            var hitP = self.surfaceHit(host, c, ux, uz, 1.55);
            if (hitP) {
              pos = new THREE.Vector3(hitP.x + ux*0.55, 1.55, hitP.z + uz*0.55);
              outX = ux; outZ = uz;
            } else {
              pos = self.calcMountPos(m, box, seen[m.type], typeIdx[m.type]);
              pos.y = 1.55;
            }
          } else if (t === 'L') {
            // 液位计：从设备顶上方垂直向下射线，法兰落在真实顶板上
            var rin = 0.45 * Math.min(sx, sz);
            var origin = new THREE.Vector3(c.x + ux*rin, y + 15, c.z + uz*rin);
            var rayD = new THREE.Raycaster(origin, new THREE.Vector3(0,-1,0), 0.1, 40);
            var hitsD = rayD.intersectObject(host, true);
            if (hitsD.length) {
              pos = new THREE.Vector3(hitsD[0].point.x, hitsD[0].point.y + 0.08, hitsD[0].point.z);
              outX = ux; outZ = uz;
            } else {
              pos = self.calcMountPos(m, box, seen[m.type], typeIdx[m.type]);
            }
          } else {
            // 壁挂仪表：水平射线打在设备真实表面上，安装件末端贴壁
            var offset = self.isLocalIndicating(m) ? 0.44 : 0.40;
            // 高度序列：期望高度 → 收进设备真实包围盒 → 包围盒中部/上部
            var yLo = box.min.y + 0.5;
            var yHi = Math.max(box.min.y + 0.9, box.max.y - 0.5);
            var yc = Math.max(yLo, Math.min(y, yHi));
            var tryY = [y, yc, (box.min.y + box.max.y) / 2, yHi];
            // 方向序列：期望方位 → 轴向兜底（细长设备如回转窑，沿轴向的射线打不到壳体）
            var dirs = [[ux, uz], [ux >= 0 ? 1 : -1, 0], [0, uz >= 0 ? 1 : -1]];
            for (var d = 0; d < dirs.length && !pos; d++) {
              for (var k = 0; k < tryY.length && !pos; k++) {
                var hitW = self.surfaceHit(host, c, dirs[d][0], dirs[d][1], tryY[k]);
                if (hitW) {
                  pos = new THREE.Vector3(hitW.x + dirs[d][0]*offset, tryY[k], hitW.z + dirs[d][1]*offset);
                  outX = dirs[d][0]; outZ = dirs[d][1];
                }
              }
            }
            if (!pos) pos = self.calcMountPos(m, box, seen[m.type], typeIdx[m.type]);
          }
        }
        if (m.type === 'F' && mount === 'pipe') flowSeq++;

        var g = self.build(m, mount === 'analyzer' ? 'post' : mount);

        // 落地支架/分析柜：表头位置按安装形式设定
        if (mount === 'analyzer') {
          g.position.set(pos.x, 0, pos.z);          // 柜体落地
        } else {
          g.position.copy(pos);
        }

        // 表盘朝向设备外侧（+Z 为表盘法向，lookAt 使 +Z 指向目标）
        // 注意：必须用放置时的真实射线方向（outX/outZ），
        // 设备包围盒中心≠本体中心（如回转窑），用 pos-c 会导致朝向反转、法兰背向设备
        var ox, oz;
        if (outX !== null) { ox = outX; oz = outZ; }
        else { ox = pos.x - c.x; oz = pos.z - c.z; }
        var ol = Math.sqrt(ox*ox + oz*oz);
        if (ol < 0.01) { ox = 1; oz = 0; ol = 1; }
        g.lookAt(new THREE.Vector3(pos.x + ox/ol*4, g.position.y, pos.z + oz/ol*4));
        // 液位计天线必须朝下，不能跟着 lookAt 转
        if (m.type === 'L') { g.rotation.set(0, g.rotation.y, 0); }

        g.userData.hostEquip = eqTag;
        scene.add(g);
        created.set(m.tag, {group: g, instr: m, host: eqTag});
        seen[m.type]++;
      });

      // 控制阀（调节阀）：夹装在与本设备相连的管道上（真实 inline 安装）
      var vi = 0;
      CONTROL_LOOPS.forEach(function(lp){
        if (lp.equip !== eqTag) return;
        var v = self.buildValve(lp, 'control');
        v.scale.setScalar(2.2);
        var pe = self.pipePointEx(eqTag, vi);
        if (pe) {
          v.position.copy(pe.p);
          v.rotation.y = Math.atan2(-pe.dz, pe.dx);   // 阀体轴线对齐管段方向
        } else {
          // 无管段可挂（极少见）：放在设备旁并加落地支架
          var mb = MOUNT_BOX[eqTag];
          var halfX = mb ? mb.sx : Math.min(box.getSize(new THREE.Vector3()).x/2, 4.0);
          var vy = 1.05;
          v.position.set(c.x + halfX + 0.75, vy, c.z + 0.55 + vi * 1.0);
          var ped = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, vy, 8), self.makeMetal());
          ped.position.set(v.position.x, vy/2, v.position.z);
          scene.add(ped);
        }
        scene.add(v);
        valveMap.set(lp.tag, {group: v, loop: lp});
        vi++;
      });
    });

    // SIS 切断阀（红色执行机构）：同样夹装在设备相连管道上
    var sisSeq = {};
    INTERLOCKS.forEach(function(ilk){
      var host = equipMeshes.get(ilk.equip);
      if (!host) return;
      var box = new THREE.Box3().setFromObject(host);
      var c = box.getCenter(new THREE.Vector3());
      var seq = sisSeq[ilk.equip] !== undefined ? sisSeq[ilk.equip] : 2;
      sisSeq[ilk.equip] = seq + 1;
      var v = self.buildValve(null, 'shutdown');
      v.scale.setScalar(2.2);
      v.name = 'XV_' + ilk.tag;
      var pe = self.pipePointEx(ilk.equip, seq);
      if (pe) {
        v.position.copy(pe.p);
        v.rotation.y = Math.atan2(-pe.dz, pe.dx);
      } else {
        var mb = MOUNT_BOX[ilk.equip];
        var halfX = mb ? mb.sx : Math.min(box.getSize(new THREE.Vector3()).x/2, 4.0);
        var vy = 1.05;
        v.position.set(c.x - halfX - 0.75, vy, c.z - 0.55);
        var ped = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, vy, 8), self.makeMetal());
        ped.position.set(v.position.x, vy/2, v.position.z);
        scene.add(ped);
      }
      v.userData.interlock = ilk;
      scene.add(v);
      valveMap.set(ilk.tag, {group: v, loop: null, interlock: ilk});
    });

    console.log('[仪表3D] 挂载检测仪表:', created.size, '| 阀门/切断阀:', valveMap.size);
    return {instruments: created, valves: valveMap};
  },

  // ============================================================
  //  控制阀（气动薄膜调节阀 / 切断阀）
  // ============================================================
  buildValve: function(loop, valveType){
    var g = new THREE.Group();
    g.name = 'VALVE_' + (loop ? loop.tag : 'XV');
    var mm = this.makeMetal();
    var isShutdown = valveType === 'shutdown';
    var actColor = isShutdown ? 0xcc3333 : 0x2f6fbf;
    var actMat = this.makeCase(actColor);

    var body = this._cyl(0.10, 0.10, 0.22, mm, 16);
    body.rotation.z = Math.PI/2; g.add(body);
    [-0.12, 0.12].forEach(function(x){
      var f = this._cyl(0.135, 0.135, 0.025, mm, 16);
      f.rotation.z = Math.PI/2; f.position.x = x; g.add(f);
    }, this);
    var stem = this._cyl(0.018, 0.018, 0.16, this.makeMetal(0xd8dde2), 8);
    stem.name = 'stem';
    stem.position.y = 0.16; g.add(stem);
    var diaphragm = this._cyl(0.17, 0.17, 0.10, actMat, 20);
    diaphragm.position.y = 0.29; g.add(diaphragm);
    var springCase = this._cyl(0.13, 0.13, 0.07, mm, 16);
    springCase.position.y = 0.37; g.add(springCase);
    var poser = this._box(0.10, 0.13, 0.07, this.makeCase(0x33404f));
    poser.position.set(0.17, 0.30, 0); g.add(poser);
    if (isShutdown) {
      var solenoid = this._cyl(0.035, 0.035, 0.09, this.makeGlow(0xff4444), 10);
      solenoid.position.set(-0.17, 0.30, 0); g.add(solenoid);
    } else {
      var ind = this._box(0.05, 0.05, 0.01, this.makeDial());
      ind.position.set(0, 0.29, 0.175); g.add(ind);
    }
    var airLine = this._cyl(0.012, 0.012, 0.20, this.makeMetal(0x88aacc), 8);
    airLine.rotation.z = Math.PI/2;
    airLine.position.set(0.10, 0.44, 0); g.add(airLine);

    g.userData = {loop: loop, isValve: true, tag: loop ? loop.tag : null,
                  valveType: valveType, opening: (loop ? loop.mv : 0)/100};
    g.traverse(function(o){ if(o.isMesh){ o.castShadow = true; } });
    return g;
  }
};
