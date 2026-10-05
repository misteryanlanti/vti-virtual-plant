// ============================================================
// 三维钒渣提钒虚拟仿真工厂 — 主引擎 v2
// 代码级精细设备 + 管线 + 第一人称漫游
// 加载顺序: lib/three.min.js → equipment_data.js
//          → lib/equip_builders.js → lib/pipes.js → lib/scene_env.js
//          → lib/player.js → factory.js
// ============================================================

// ---------- 全局状态 ----------
var state = {
  mode: 'walk',
  selectedTag: null,
  faults: new Set(),
  xray: false,
  labelsOn: true,
  slowMode: false,
  tourIndex: 0,
  tourTimer: 0,
  showInstr: false,     // 三维仪表点位是否显示
  instrMap: null,       // 仪表 tag -> {group, instr, host}
  valveMap: null,       // 回路/联锁 tag -> {group, loop, interlock}
  motionOn: true,       // 设备运转动画总开关
  motionSpeed: 1,       // 运转动画倍率（0.5 / 1 / 2 / 4）
  sectionMode: false,   // 剖面模式（选中设备剖切看内部）
  flowOn: true,         // 管线物料流动指示
};

// ---------- 场景初始化 ----------
var canvas = document.getElementById('c');
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d6);
scene.fog = new THREE.Fog(0x87b5d6, 80, 250);

var camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500);

var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// 启用局部裁剪：剖切模式下用平面切掉设备靠观察者一侧的外壳，露出内部结构
renderer.localClippingEnabled = true;

// ---------- 光照 ----------
var amb = new THREE.AmbientLight(0xaabbdd, 0.4); scene.add(amb);
var hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5a3a, 0.5); scene.add(hemi);
var sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
sun.position.set(60, 80, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
sun.shadow.camera.far = 300;
scene.add(sun);

// ---------- 工段色标 ----------
var SECTION_COLORS = {
  "原料准备":0x4488ff,"焙烧":0xff6633,"浸出":0x33cc99,"固液分离":0x66ccff,
  "净化":0xcc88ff,"沉淀":0xffcc44,"产品":0xff4466,"成品":0x88ff44,
  "环保":0x44ccaa,"公辅":0x8899bb,"场景":0x667788
};

// ---------- 设备模型加载 ----------
var equipMeshes = new Map();
var B = EQUIP_BUILDERS;
var player = null; // 由 init() 初始化

function buildAllEquipment() {
  EQUIPMENT.forEach(function(eq) {
    var builder = B[eq.tag] || B._default;
    var group = builder.call(B, scene, eq);
    group.userData = { tag: eq.tag, eq: eq }; // 设置 userData 供射线拾取用
    equipMeshes.set(eq.tag, group);
  });
}

// ---------- 设备标签 ----------
var labelDivs = new Map();
function buildLabels() {
  var container = document.createElement('div');
  container.id = 'labels-layer';
  container.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden;';
  document.body.appendChild(container);
  EQUIPMENT.forEach(function(eq) {
    var div = document.createElement('div');
    div.className = 'elabel';
    div.innerHTML = '<span class="t">' + eq.tag + '</span>';
    div.style.display = eq.key ? 'block' : 'none';
    container.appendChild(div);
    labelDivs.set(eq.tag, div);
  });
}
buildLabels();

function updateLabels() {
  if (!state.labelsOn) {
    labelDivs.forEach(function(d){d.style.display='none';});
    return;
  }
  var w = innerWidth, h = innerHeight;
  equipMeshes.forEach(function(group, tag) {
    var eq = group.userData.eq;
    if (!eq) return;
    var div = labelDivs.get(tag);
    if (!div) return;
    if (state.faults.has(tag) || state.selectedTag === tag || eq.key) {
      var v = new THREE.Vector3();
      group.getWorldPosition(v);
      v.y += 3.5;
      v.project(camera);
      var x = (v.x*0.5+0.5)*w;
      var y = (-v.y*0.5+0.5)*h;
      if (v.z < 1) {
        div.style.display = 'block';
        div.style.transform = 'translate(-50%,-100%) translate(' + x + 'px,' + y + 'px)';
        div.style.top = '0'; div.style.left = '0';
      } else { div.style.display = 'none'; }
    } else { div.style.display = 'none'; }
  });
}

// ---------- 数据面板 ----------
function updateDataPanel() {
  var titleEl = document.getElementById('eq-title');
  var tagEl   = document.getElementById('eq-tag');
  var secEl   = document.getElementById('eq-sec');
  var tableEl = document.getElementById('ptable');
  var alertEl = document.getElementById('alert');
  var dotEl   = document.getElementById('dot');
  var kpi     = document.getElementById('kpi-st');

  if (!state.selectedTag) {
    titleEl.textContent = '未选择设备';
    tagEl.textContent = '—';
    secEl.textContent = '走近设备或点击面板选择';
    tableEl.innerHTML = '';
    document.getElementById('inst-sec').innerHTML = '';
    document.getElementById('sis-sec').innerHTML = '';
    alertEl.classList.remove('show');
    dotEl.style.background = '#3ddc84';
    kpi.textContent = state.faults.size ? '⚠ ' + state.faults.size + ' 故障' : '正常';
    kpi.style.color = state.faults.size ? '#ff8a8a' : '#63d2ff';
    return;
  }

  var eq = EQUIPMENT.find(function(e){return e.tag === state.selectedTag;});
  if (!eq) return;
  var isFault = state.faults.has(eq.tag);
  titleEl.textContent = eq.name;
  tagEl.textContent = eq.tag;
  secEl.textContent = eq.section + ' 工段';

  var params = isFault && eq.fault ? eq.fault.params : eq.params;
  tableEl.innerHTML = params.map(function(p){
    return '<tr><td>' + p[0] + '</td><td>' + p[1] + '</td></tr>';
  }).join('');

  // 仪表系统：渲染该设备的检测仪表点位与 SIS 联锁
  renderInstrumentPanel(eq);
  renderSISPanel(eq);

  if (isFault && eq.fault) {
    alertEl.textContent = eq.fault.msg;
    alertEl.classList.add('show');
    dotEl.style.background = '#ff3333';
    dotEl.style.boxShadow = '0 0 8px #ff3333';
  } else {
    alertEl.classList.remove('show');
    dotEl.style.background = '#3ddc84';
    dotEl.style.boxShadow = '0 0 8px #3ddc84';
  }
  kpi.textContent = state.faults.size ? '⚠ ' + state.faults.size + ' 故障' : '正常';
  kpi.style.color = state.faults.size ? '#ff8a8a' : '#63d2ff';
}

// ---------- 仪表系统：三维显示开关 ----------
function setInstrVisible(on) {
  state.showInstr = on;
  if (state.instrMap) state.instrMap.forEach(function(o){ o.group.visible = on; });
  if (state.valveMap) state.valveMap.forEach(function(o){ o.group.visible = on; });
}

// ---------- 仪表系统：右侧面板渲染该设备仪表点位 ----------
function renderInstrumentPanel(eq) {
  var box = document.getElementById('inst-sec');
  if (!box) return;
  if (!eq || typeof INSTRUMENTS === 'undefined') { box.innerHTML = ''; return; }
  var list = INSTRUMENTS.filter(function(m){ return m.equip === eq.tag; });
  if (!list.length) { box.innerHTML = ''; return; }
  var meta = function(t){ return (typeof INSTR_META!=='undefined' && INSTR_META[t]) ? INSTR_META[t].icon : '•'; };
  var html = '<div class="isec"><div class="h">📡 检测仪表点位（' + list.length + ' 点）</div>' +
             '<table class="itab">';
  list.forEach(function(m){
    var v = HMI.value(m);
    var al = HMI.alarmOf(m, v);
    var isFault = state.faults.has(eq.tag);
    html += '<tr class="' + (al ? 'act' : '') + '">' +
            '<td class="i0">' + meta(m.type) + ' ' + m.tag + '</td>' +
            '<td class="i1">' + m.name + '</td>' +
            '<td class="i2' + (al ? ' a' : '') + '">' + HMI.fmt(v, m) + ' ' + m.unit + '</td>' +
            '</tr>';
  });
  html += '</table></div>';
  box.innerHTML = html;
}

// ---------- 仪表系统：右侧面板渲染 SIS 安全联锁 ----------
function renderSISPanel(eq) {
  var box = document.getElementById('sis-sec');
  if (!box) return;
  if (!eq || typeof INTERLOCKS === 'undefined') { box.innerHTML = ''; return; }
  var list = INTERLOCKS.filter(function(x){ return x.equip === eq.tag; });
  if (!list.length) { box.innerHTML = ''; return; }
  var isFault = state.faults.has(eq.tag);
  var html = '<div class="isec"><div class="h">🛡 SIS 安全联锁（' + list.length + ' 条）</div>';
  list.forEach(function(ilk){
    var trip = isFault;
    html += '<div style="font-size:9px;padding:4px 5px;margin-bottom:3px;border-radius:3px;' +
      (trip ? 'background:#3d1a1a;border-left:3px solid #b83030;'
            : 'background:#0f2038;border-left:3px solid #2a5bb8;') + '">' +
      '<div style="display:flex;justify-content:space-between;gap:4px">' +
      '<span style="color:#ffd54f;font-weight:bold">' + ilk.tag + '</span>' +
      '<span style="color:' + (trip ? '#ff6666' : '#7fffa8') + ';font-weight:bold">SIL' + ilk.sil +
      ' ' + (trip ? '已动作' : '正常') + '</span></div>' +
      '<div style="color:#9db8e8;margin-top:2px">传感器 ' + ilk.sensor + '（' + ilk.logic + '）</div>' +
      '<div style="color:#cfe3f5">触发：' + ilk.trip + '</div>' +
      '<div style="color:' + (trip ? '#ffb3b3' : '#7fa8cc') + '">动作：' + ilk.action + '</div>' +
      '</div>';
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- 仪表系统：SIS 联锁动作（3D 高亮仪表与切断阀）----------
function applySISAction(tag, active) {
  if (!state.valveMap && !state.instrMap) return;
  // 切断阀：红色 emissive
  if (state.valveMap) {
    state.valveMap.forEach(function(o){
      var ilk = o.group.userData.interlock;
      if (ilk && ilk.faultTag === tag) {
        o.group.traverse(function(m){
          if (m.isMesh) {
            if (active) { m.material.emissive = new THREE.Color(0x991111); m.material.emissiveIntensity = 0.95; }
            else { m.material.emissive = new THREE.Color(0x000000); m.material.emissiveIntensity = 0; }
          }
        });
      }
    });
  }
  // 该设备上的检测仪表：报警高亮
  if (state.instrMap) {
    state.instrMap.forEach(function(o){
      if (o.host === tag) {
        o.group.traverse(function(m){
          if (m.isMesh) {
            if (active) { m.material.emissive = new THREE.Color(0x771111); m.material.emissiveIntensity = 0.85; }
            else { m.material.emissive = new THREE.Color(0x000000); m.material.emissiveIntensity = 0; }
          }
        });
      }
    });
  }
}

// ---------- 报警栏 ----------
function updateAlarmBar() {
  var list = document.getElementById('alarm-list');
  if (state.faults.size === 0) {
    list.textContent = '无活动报警';
  } else {
    list.innerHTML = Array.from(state.faults).map(function(tag){
      var eq = EQUIPMENT.find(function(e){return e.tag === tag;});
      var msg = (eq && eq.fault) ? eq.fault.msg : tag;
      return '<div class="a">⚠ ' + tag + '：' + msg + '</div>';
    }).join('');
  }
}

// ---------- 设备选择与高亮 ----------
var selBox = null;
function showSelection(tag) {
  clearSelection();
  if (!tag) return;
  var group = equipMeshes.get(tag);
  if (!group) return;
  var box = new THREE.BoxHelper(group, 0xffff00);
  scene.add(box);
  selBox = box;
}
function clearSelection() {
  if (selBox) { scene.remove(selBox); selBox.geometry.dispose(); selBox = null; }
}
function selectEquip(tag) {
  state.selectedTag = tag;
  showSelection(tag);
  updateDataPanel();
  updateLabels();
  // 剖切模式下切换选中设备时，剖切对象随之切换
  if (state.sectionMode) {
    if (tag) applySection(); else clearSection();
  }
}

// ---------- 射线拾取 ----------
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

function onMouseMove(e) {
  if (state.mode !== 'walk' || !document.pointerLockElement) return;
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  var hits = raycaster.intersectObjects(Array.from(equipMeshes.values()), true);
  var hovered = null;
  if (hits.length) {
    var obj = hits[0].object;
    var parent = obj.parent;
    if (parent && parent.userData && parent.userData.tag) hovered = parent.userData.tag;
  }
  document.body.style.cursor = hovered ? 'crosshair' : 'default';
  if (hovered && hovered !== state.selectedTag) {
    // 自动靠近检测
    var group = equipMeshes.get(hovered);
    if (group) {
      var dist = camera.position.distanceTo(group.position);
      if (dist < 12) {
        selectEquip(hovered);
      }
    }
  }
}

function onClick(e) {
  if (state.mode !== 'walk') return;
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  var hits = raycaster.intersectObjects(Array.from(equipMeshes.values()), true);
  if (hits.length) {
    var group = hits[0].object.parent;
    var tag = group && group.userData ? group.userData.tag : null;
    if (tag) selectEquip(tag);
  } else {
    selectEquip(null);
  }
}
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('click', onClick);

// ---------- 故障触发 ----------
function triggerFault(name) {
  var scenario = FAULT_SCENARIOS[name];
  if (!scenario) {
    alert('未识别的故障类型：「' + name + '」\n可用：' + Object.keys(FAULT_SCENARIOS).join(' / '));
    return;
  }
  var tag = scenario.tag;
  if (!state.faults.has(tag)) {
    state.faults.add(tag);
    var group = equipMeshes.get(tag);
    var eq = EQUIPMENT.find(function(e){return e.tag === tag;});
    if (group && eq) applyFaultMaterial(group, eq, true);
    applySISAction(tag, true);   // SIS 联锁动作：切断阀/仪表报警高亮
    if (eq) { selectEquip(tag); teleportTo(eq); }
    updateAlarmBar(); updateDataPanel(); updateLabels();
  }
}

function applyFaultMaterial(group, eq, active) {
  var baseColor = SECTION_COLORS[eq.section] || 0x667788;
  group.traverse(function(obj) {
    if (obj.isMesh) {
      if (active) {
        obj.material.emissive = new THREE.Color(0x661111);
        obj.material.emissiveIntensity = 0.5;
      } else {
        obj.material.emissive = new THREE.Color(0x000000);
        obj.material.emissiveIntensity = 0;
      }
    }
  });
}

function resetAll() {
  state.faults.clear();
  selectEquip(null);
  EQUIPMENT.forEach(function(eq) {
    var group = equipMeshes.get(eq.tag);
    if (group) applyFaultMaterial(group, eq, false);
    applySISAction(eq.tag, false);   // 复位 SIS 联锁高亮
  });
  updateAlarmBar(); updateDataPanel(); updateLabels();
}

// ---------- 瞬移到设备 ----------
function teleportTo(eq) {
  var pos = new THREE.Vector3(eq.pos[0], 0, eq.pos[2]);
  // 站在设备前方
  var offset = new THREE.Vector3(0, 0, 5).applyQuaternion(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, player.yaw, 0))
  );
  var target = pos.clone().sub(new THREE.Vector3(offset.x, 0, offset.z));
  target.y = 0;
  target.x = Math.max(-52, Math.min(52, target.x));
  target.z = Math.max(-52, Math.min(70, target.z));
  player.teleport(target.x, 0, target.z, eq.pos[0], eq.pos[2]);
}

// ---------- 工段跳转 ----------
var ZONE_TOUR = {raw:-40, roast:-15, leach:8, ext:26, precip:38, calc:46, env:10};
function jumpZone(zone) {
  var z = ZONE_TOUR[zone];
  if (z !== undefined) {
    player.teleport(0, 0, z, 0, z - 10);
  }
}

// ---------- 显示切换 ----------
// ============================================================
//  剖切模式：用裁剪平面切掉选中设备靠观察者一侧的外壳，
//  露出真实内部结构（窑内物料层、磨机钢球、滤饼、料舟、填料…）
// ============================================================
var sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
var sectionedTag = null;

function clearSection(){
  if (!sectionedTag) return;
  var g = equipMeshes.get(sectionedTag);
  if (g) {
    g.traverse(function(o){
      if (o.isMesh && o.material) {
        o.material.clippingPlanes = null;
        o.material.side = THREE.FrontSide;
        o.material.needsUpdate = true;
        if (o.userData.isCake || o.userData.isCharge || o.userData.isBoat) {
          if (o.material.emissive) {
            o.material.emissive.setHex(0x000000);
            o.material.emissiveIntensity = 0;
          }
        }
      }
    });
  }
  sectionedTag = null;
}

function applySection(){
  clearSection();
  if (!state.sectionMode) return;
  var tag = state.selectedTag;
  if (!tag) return;
  var g = equipMeshes.get(tag);
  if (!g) return;
  g.traverse(function(o){
    if (o.isMesh && o.material) {
      o.material.clippingPlanes = [sectionPlane];
      o.material.side = THREE.DoubleSide;      // 切开后能看到壳体内壁
      o.material.needsUpdate = true;
      // 内部构件高亮，剖开后一眼可见
      if (o.userData.isCake || o.userData.isCharge || o.userData.isBoat) {
        o.material.emissive.setHex(0x885533);
        o.material.emissiveIntensity = 0.6;
      }
    }
  });
  sectionedTag = tag;
}

// 每帧更新剖切平面：始终切掉朝向摄像机的那一半
function updateSectionPlane(){
  if (!state.sectionMode || !sectionedTag) return;
  var g = equipMeshes.get(sectionedTag);
  if (!g) return;
  var box = new THREE.Box3().setFromObject(g);
  var c = box.getCenter(new THREE.Vector3());
  var n = new THREE.Vector3().subVectors(camera.position, c);
  n.y = 0;
  if (n.lengthSq() < 0.001) n.set(0, 0, 1);
  n.normalize();
  sectionPlane.normal.copy(n);
  sectionPlane.constant = -n.dot(c) + 0.30;   // 略偏向观察者，确保切开
}

function setHint(msg){
  var el = document.getElementById('hint');
  if (el) el.textContent = msg;
}

function toggleSection(){
  state.sectionMode = !state.sectionMode;
  var btn = document.getElementById('btn-section');
  if (btn) btn.classList.toggle('active', state.sectionMode);
  if (!state.sectionMode) { clearSection(); setHint('已退出剖切模式'); return; }
  if (!state.selectedTag) {
    state.sectionMode = false;
    if (btn) btn.classList.remove('active');
    setHint('请先在场景中选中一台设备，再开启剖切');
    return;
  }
  applySection();
  setHint('剖切模式：已切开 ' + state.selectedTag + ' 外壳，可见内部结构');
}

// ---------- 运转动画控制 ----------
function toggleMotion(){
  state.motionOn = !state.motionOn;
  var btn = document.getElementById('btn-motion');
  if (btn) btn.classList.toggle('active', state.motionOn);
  setHint(state.motionOn ? '设备运转动画已开启' : '设备运转动画已暂停');
}
function cycleSpeed(){
  var seq = [1, 2, 4, 0.5];
  var i = seq.indexOf(state.motionSpeed);
  state.motionSpeed = seq[(i + 1) % seq.length];
  var btn = document.getElementById('btn-speed');
  if (btn) btn.textContent = '⏩ 转速 ×' + state.motionSpeed;
}
function toggleFlow(){
  state.flowOn = !state.flowOn;
  var btn = document.getElementById('btn-flow');
  if (btn) btn.classList.toggle('active', state.flowOn);
  setHint(state.flowOn ? '管线物料流向已开启' : '管线物料流向已关闭');
}

function toggleXray() {
  state.xray = !state.xray;
  document.getElementById('btn-xray').classList.toggle('active', state.xray);
  EQUIPMENT.forEach(function(eq) {
    var g = equipMeshes.get(eq.tag);
    if (!g) return;
    var baseColor = SECTION_COLORS[eq.section] || 0x667788;
    g.traverse(function(o) {
      if (o.isMesh) {
        o.material.transparent = state.xray;
        o.material.opacity = state.xray ? 0.35 : 1.0;
        o.material.needsUpdate = true;
      }
    });
  });
}
function toggleLabels() {
  state.labelsOn = !state.labelsOn;
  document.getElementById('btn-labels').classList.toggle('active', state.labelsOn);
  updateLabels();
}
function toggleSlow() {
  state.slowMode = !state.slowMode;
  document.getElementById('btn-slow').classList.toggle('active', state.slowMode);
  player.speed = state.slowMode ? 2.0 : 5.0;
}

// ---------- 模式切换 ----------
var orbit = null; // 轨道控制器，用于自由视角

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('#left .btn').forEach(function(b){b.classList.remove('active');});
  var map = {walk:'btn-walk', visit:'btn-visit', orbit:'btn-orbit'};
  var el = document.getElementById(map[mode]);
  if (el) el.classList.add('active');
  player.mode = mode;
  if (mode === 'visit') {
    if (document.pointerLockElement) document.exitPointerLock();
    player.enabled = false;
    if (orbit) orbit.enabled = false;
    startAutoTour();
  } else if (mode === 'orbit') {
    if (document.pointerLockElement) document.exitPointerLock();
    player.enabled = false;
    if (!orbit) {
      orbit = new OrbitControls(camera, canvas);
      orbit.enableDamping = true;
      orbit.dampingFactor = 0.08;
      orbit.maxPolarAngle = Math.PI * 0.495;
      orbit.minDistance = 5;
      orbit.maxDistance = 160;
      orbit.target.set(0, 4, 0);
    }
    orbit.enabled = true;
    stopAutoTour();
  } else { // walk
    if (orbit) orbit.enabled = false;
    stopAutoTour();
    player.enabled = true;
  }
}

// ---------- 自动巡览 ----------
var TOUR = [
  {name:'原料与磨矿', pos:[0, 0, -40]},
  {name:'钠化焙烧',   pos:[0, 0, -15]},
  {name:'浸出分离',   pos:[-4, 0, 8]},
  {name:'萃取净化',   pos:[-8, 0, 26]},
  {name:'沉钒',       pos:[-8, 0, 38]},
  {name:'煅烧成品',   pos:[8, 0, 46]},
  {name:'环保公辅',   pos:[28, 0, 10]},
  {name:'全厂鸟瞰',   pos:[0, 0, 70]},
];
var autoTour = false;
var camAnim = {active: false, from: null, to: null, lookFrom: null, lookTo: null, t: 0, dur: 1.8};

function startAutoTour() {
  autoTour = true;
  state.tourIndex = 0;
  flyTo(TOUR[0].pos, TOUR[0].pos);
}
function stopAutoTour() {
  autoTour = false;
  camAnim.active = false;
}
function flyTo(pos, lookAt, dur) {
  camAnim.from = camera.position.clone();
  camAnim.to = new THREE.Vector3(pos[0], 12, pos[2] + 8);
  camAnim.lookFrom = new THREE.Vector3(0, 2, 0);
  camAnim.lookTo = new THREE.Vector3(lookAt[0], 3, lookAt[2]);
  camAnim.t = 0;
  camAnim.dur = dur || 1.8;
  camAnim.active = true;
}
function updateCamAnim(dt) {
  if (!camAnim.active) return;
  camAnim.t += dt / camAnim.dur;
  var t = Math.min(camAnim.t, 1);
  var ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
  camera.position.lerpVectors(camAnim.from, camAnim.to, ease);
  var look = camAnim.lookFrom.clone().lerp(camAnim.lookTo, ease);
  camera.lookAt(look);
  if (t >= 1) camAnim.active = false;
}

// ---------- UI 事件绑定 ----------
document.getElementById('btn-walk').onclick  = function(){ setMode('walk'); };
document.getElementById('btn-visit').onclick = function(){ setMode('visit'); };
document.getElementById('btn-orbit').onclick = function(){ setMode('orbit'); };
document.getElementById('btn-fault').onclick = function() {
  var input = document.getElementById('fault-input');
  var v = input.value.trim();
  if (!v) { input.focus(); return; }
  triggerFault(v);
  input.value = '';
};
document.getElementById('fault-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('btn-fault').click();
});
document.getElementById('btn-reset').onclick = resetAll;
document.getElementById('btn-xray').onclick  = toggleXray;
document.getElementById('btn-labels').onclick = toggleLabels;
document.getElementById('btn-slow').onclick   = toggleSlow;
document.getElementById('btn-motion').onclick = toggleMotion;
document.getElementById('btn-speed').onclick  = cycleSpeed;
document.getElementById('btn-flow').onclick   = toggleFlow;
document.getElementById('btn-section').onclick = toggleSection;
// 仪表系统
var btnHmi = document.getElementById('btn-hmi');
if (btnHmi) btnHmi.onclick = function(){
  HMI.toggle();
  btnHmi.classList.toggle('active', HMI.visible);
};
var btnInstr = document.getElementById('btn-instr');
if (btnInstr) {
  btnInstr.classList.add('active');   // 初始即为显示状态
  btnInstr.onclick = function(){
    setInstrVisible(!state.showInstr);
    btnInstr.classList.toggle('active', state.showInstr);
  };
}
document.querySelectorAll('.jz').forEach(function(btn) {
  btn.onclick = function() { jumpZone(btn.dataset.z); };
});

// ---------- 窗口自适应 ----------
addEventListener('resize', function() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- 动画主循环 ----------
var clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  var dt = clock.getDelta();

  // 第一人称漫游
  if (state.mode === 'walk') {
    player.update(dt);
  }

  // 自动巡览
  if (autoTour) {
    state.tourTimer += dt;
    if (state.tourTimer > 6) {
      state.tourTimer = 0;
      state.tourIndex = (state.tourIndex + 1) % TOUR.length;
      flyTo(TOUR[state.tourIndex].pos, TOUR[state.tourIndex].pos, 2.0);
    }
    updateCamAnim(dt);
  }

  // 自由视角模式
  if (state.mode === 'orbit' && orbit && orbit.enabled) {
    orbit.update();
  }

  // 剖切平面随视角更新（始终切掉朝向观察者的一半）
  updateSectionPlane();

  // 设备标签
  if (state.labelsOn) updateLabels();

  // 选框更新
  if (selBox && state.selectedTag) {
    var g = equipMeshes.get(state.selectedTag);
    if (g) selBox.update();
  }

  // ---------- 设备运转动画（真实转速驱动）----------
  updateMotion(dt);

  // ---------- 管线物料流动（沿管走向的流动色环）----------
  updateFlow(dt);

  // 控制阀阀杆微动（模拟气动薄膜执行机构调节）
  if (state.showInstr && state.valveMap) {
    var ph = performance.now() / 1000;
    state.valveMap.forEach(function(o, k){
      var stem = o.group.getObjectByName('stem');
      if (stem && stem.isMesh) {
        var amp = 0.012 * (o.group.userData.loop ? 1 : 0.4);
        stem.position.y = 0.16 + Math.sin(ph * 1.6 + k.length) * amp;
      }
    });
  }

  renderer.render(scene, camera);
}

// ============================================================
//  设备运转动画系统
// ------------------------------------------------------------
//  设备在建模时通过 EQUIP_BUILDERS._spin() / _osc() 给运动部件
//  登记真实额定转速，这里统一驱动，使虚拟工厂"看得见在运转"。
// ============================================================

// 真实转速 → 视觉角速度(r/min)：
//   · 高速设备（电机 1450/2900 r/min）压缩，否则帧间角度过大造成频闪
//   · 低速设备（回转窑 2.4、耙架 0.35 r/min）放大，否则肉眼几乎看不出
function visualRpm(rpm){
  var r = Math.abs(rpm);
  if (r <= 0) return 0;
  if (r > 240) return 240 + (r - 240) * 0.12;
  if (r < 3)   return r * 4.0;
  return r;
}

function collectMotionParts(g){
  var parts = [];
  g.updateMatrixWorld(true);          // 先更新世界矩阵，才能量出正确的几何中心
  g.traverse(function(o){
    if (o.userData && o.userData.motion) {
      var m = o.userData.motion;
      m._base = o.position.clone();           // 记初始位置，往复运动围绕它摆动
      m._phase = Math.random() * Math.PI * 2; // 随机相位，避免全场同步摆动
      if (m.kind === 'spin') {
        // 旋转轴心：优先用建模时显式指定的（如回转窑的窑轴标高）；
        // 否则自动取该部件几何中心（父坐标系下）—— 保证"绕自身轴转"，
        // 而不是绕设备地面原点甩起来（旧 bug：窑体/磨机因此上下翻飞）
        if (m.pivot) {
          m._pivot = m.pivot.clone();
        } else {
          var box = new THREE.Box3().setFromObject(o);
          var c = box.getCenter(new THREE.Vector3());
          if (isFinite(c.x) && isFinite(c.y) && isFinite(c.z) && o.parent) {
            o.parent.worldToLocal(c);          // 世界坐标 → 父坐标系
          } else {
            c.set(0, 0, 0);
          }
          m._pivot = c;
        }
      }
      parts.push(o);
    }
  });
  return parts;
}

// 旋转轴方向单位向量（父坐标系）
var SPIN_AXES = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1)
};
var _spinQ = new THREE.Quaternion();

var motionT = 0;
function updateMotion(dt){
  if (!state.motionOn) return;
  motionT += dt;
  var scale = state.motionSpeed || 1;
  equipMeshes.forEach(function(g){
    if (!g) return;
    if (!g.userData._motionParts) g.userData._motionParts = collectMotionParts(g);
    var parts = g.userData._motionParts;
    // 故障设备停机（红色高亮）时停止运转，直观表达"已停机"
    var stopped = state.faults && state.faults.has(g.name);
    if (stopped) return;
    for (var i = 0; i < parts.length; i++){
      var o = parts[i], m = o.userData.motion;
      if (m.kind === 'spin') {
        // 绕「过轴心 pivot、方向 axis」的轴做增量旋转。
        // 同时更新 position 与 quaternion（左乘=绕父坐标系轴），保证轴心不动、只自转。
        var av = visualRpm(m.rpm) / 60 * Math.PI * 2 * scale * dt;
        _spinQ.setFromAxisAngle(SPIN_AXES[m.axis] || SPIN_AXES.y, av);
        var p = m._pivot;
        o.position.sub(p).applyQuaternion(_spinQ).add(p);
        o.quaternion.premultiply(_spinQ);
      } else if (m.kind === 'osc') {
        var s = Math.sin(motionT * m.freq * Math.PI * 2 * scale + m._phase);
        if (Object.prototype.toString.call(m.amp) === '[object Array]') {
          // 斜向联动：沿指定方向向量往复（如矿石沿倾斜皮带移动，X/Y 同步）
          o.position.set(m._base.x + (m.amp[0] || 0) * s,
                         m._base.y + (m.amp[1] || 0) * s,
                         m._base.z + (m.amp[2] || 0) * s);
        } else {
          var b = m._base ? m._base[m.axis] : 0;
          o.position[m.axis] = b + s * m.amp;
        }
      }
    }
  });
}

// ============================================================
//  管线物料流动指示：沿管线走向循环移动的亮色小球
//  真实工厂靠它判断流向；教学中可直观看到"料往哪走"
// ============================================================
var flowMarkers = null;
function buildFlowMarkers(){
  flowMarkers = [];
  if (typeof PIPE_ROUTES === 'undefined') return;
  var mat = new THREE.MeshBasicMaterial({color: 0xffe066});
  var geo = new THREE.SphereGeometry(0.17, 8, 6);
  for (var i = 0; i < PIPE_ROUTES.length; i++){
    var pts = PIPE_ROUTES[i];
    if (!pts || pts.length < 2) continue;
    var m = new THREE.Mesh(geo, mat);
    m.userData = {route: pts, t: Math.random()};
    scene.add(m);
    flowMarkers.push(m);
  }
}

function updateFlow(dt){
  if (!state.flowOn) {
    if (flowMarkers) flowMarkers.forEach(function(m){ m.visible = false; });
    return;
  }
  if (!flowMarkers) buildFlowMarkers();
  if (!flowMarkers) return;
  for (var i = 0; i < flowMarkers.length; i++){
    var m = flowMarkers[i];
    m.visible = true;
    var pts = m.userData.route;
    m.userData.t += dt * 0.10 * (state.motionSpeed || 1);
    if (m.userData.t > 1) m.userData.t -= 1;
    var t = m.userData.t * (pts.length - 1);
    var i0 = Math.floor(t), i1 = Math.min(i0 + 1, pts.length - 1);
    var f = t - i0;
    m.position.lerpVectors(pts[i0], pts[i1], f);
  }
}

// ---------- 启动 ----------
(function init() {
  // 1. 构建厂区环境
  buildSceneEnvironment(scene);

  // 2. 构建全部设备
  buildAllEquipment();

  // 3. 构建管线系统（必须先于仪表：流量计/压力变送器要装在管道上）
  //    传入设备网格：接管口用射线实测设备真实表面，杜绝"管道没有来处/去处"
  buildPipes(scene, equipMeshes);

  // 4. 构建仪表系统：检测仪表 + 控制阀 + SIS 切断阀
  //    流量计按真实做法夹装在管道上，其余按安装支架固定在设备本体
  var instRes = INSTRUMENT_BUILDERS.mountAll(scene, equipMeshes);
  state.instrMap = instRes.instruments;
  state.valveMap = instRes.valves;
  // 默认显示三维仪表（含就地表盘与位号浮标），可用左侧「三维仪表点位」按钮关闭
  setInstrVisible(true);

  // 4. 创建第一人称控制器
  player = new Player(camera, canvas, {speed: 5.0, height: 1.7, fov: 60});

  // 5. 初始视角 — 厂区大门处
  camera.position.set(0, 1.7, 65);
  camera.lookAt(0, 2, 0);
  player.yaw = Math.PI; // 面向厂区内部

  // 6. UI 初始化
  selectEquip(null);
  updateAlarmBar();
  updateDataPanel();
  updateLabels();

  // 7. 隐藏加载进度
  document.getElementById('load').style.display = 'none';

  // 8. 启动渲染循环
  animate();

  console.log('三维钒渣提钒虚拟仿真工厂 v5 已启动（含仪表系统）');
  console.log('  设备总数:', EQUIPMENT.length);
  console.log('  巡览点:', TOUR.length);
  console.log('  故障剧本:', Object.keys(FAULT_SCENARIOS).length);
  console.log('  管线数:', PIPE_DEFS.length);
  if (typeof INSTRUMENTS !== 'undefined') {
    console.log('  检测仪表:', INSTRUMENTS.length,
                '| 控制回路:', CONTROL_LOOPS.length,
                '| SIS联锁:', INTERLOCKS.length,
                '| 机械保护:', PSV_LIST.length);
    console.log('  DCS I/O: AI', DCS_INFO.ai, 'AO', DCS_INFO.ao,
                'DI', DCS_INFO.di, 'DO', DCS_INFO.do_);
  }
})();
