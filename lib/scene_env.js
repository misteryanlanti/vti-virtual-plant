// ============================================================
// 厂区环境 — 道路、大门、围墙、标牌、绿化、地面铺装
// ============================================================
function buildSceneEnvironment(scene) {
  var B = EQUIP_BUILDERS;
  var mm = B.makeMetal(0x666666);
  var pm = B.makePaint(0x555555);

  // ---------- 厂区铺装地面 (替代草坪，工业风格) ----------
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({color: 0x5a6a5a, roughness: 0.95})
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0.0;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- 主干道 (环形) ----------
  var roadMat = new THREE.MeshStandardMaterial({color: 0x3a3a3a, roughness: 0.9});
  // 横向道路 (东西向)
  var roadH = new THREE.Mesh(new THREE.BoxGeometry(80, 0.02, 8), roadMat);
  roadH.position.set(0, 0.02, 0); roadH.receiveShadow = true;
  scene.add(roadH);
  // 纵向道路 (南北向)
  var roadV = new THREE.Mesh(new THREE.BoxGeometry(8, 0.02, 80), roadMat);
  roadV.position.set(0, 0.02, 0); roadV.receiveShadow = true;
  scene.add(roadV);

  // 车道标线 (黄色虚线)
  var lineMat = new THREE.MeshStandardMaterial({color: 0xccaa22, roughness: 0.6});
  for (var i = -35; i <= 35; i += 5) {
    var dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 2), lineMat);
    dash.position.set(i, 0.03, 0); scene.add(dash);
    var dash2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 2), lineMat);
    dash2.position.set(0, 0.03, i); scene.add(dash2);
  }

  // ---------- 厂区大门 ----------
  var gateGroup = new THREE.Group();
  gateGroup.name = 'Gate';
  // 大门框架 (两根立柱 + 横梁)
  var gateMat = B.makePaint(0x8a9aaa);
  var post1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.0, 0.5), gateMat);
  post1.position.set(-4, 3.0, 0); post1.castShadow = true; gateGroup.add(post1);
  var post2 = post1.clone(); post2.position.x = 4; gateGroup.add(post2);
  var beam = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 0.5), gateMat);
  beam.position.set(0, 6.0, 0); gateGroup.add(beam);
  // 门牌
  var signMat = new THREE.MeshStandardMaterial({color: 0x2a4a6a, roughness: 0.4});
  var sign = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.5, 0.15), signMat);
  sign.position.set(0, 5.2, 0.3); gateGroup.add(sign);
  // 栅栏
  var fenceMat = B.makeMetal(0x999999);
  for (var f = -3.5; f <= 3.5; f += 0.5) {
    var bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.5, 0.05), fenceMat);
    bar.position.set(f, 2.25, 0); gateGroup.add(bar);
  }
  var rail1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.1, 0.05), fenceMat);
  rail1.position.set(0, 4.5, 0); gateGroup.add(rail1);
  var rail2 = rail1.clone(); rail2.position.y = 1.0; gateGroup.add(rail2);
  gateGroup.position.set(0, 0, 65);
  scene.add(gateGroup);

  // ---------- 围墙 (四周一圈) ----------
  var wallMat = B.makePaint(0x7a8a8a);
  var H = 5.0; // 围墙高度（v4：匹配 1:1 设备尺度，比之前 3m 更协调）
  var L = 55;  // 围墙长度(半)
  // 北墙 (z=-L)
  var wallN = new THREE.Mesh(new THREE.BoxGeometry(2*L, H, 0.4), wallMat);
  wallN.position.set(0, H/2, -L); wallN.castShadow = true; scene.add(wallN);
  // 南墙 (z=+L)
  var wallS = wallN.clone(); wallS.position.z = L; scene.add(wallS);
  // 东墙 (x=+L)
  var wallE = new THREE.Mesh(new THREE.BoxGeometry(0.4, H, 2*L), wallMat);
  wallE.position.set(L, H/2, 0); wallE.castShadow = true; scene.add(wallE);
  // 西墙 (x=-L)
  var wallW = wallE.clone(); wallW.position.x = -L; scene.add(wallW);
  // 围墙顶 (压顶)
  var capMat = B.makePaint(0x6a7a7a);
  function addWallCap(x, z, sx, sz) {
    var cap = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.15, sz), capMat);
    cap.position.set(x, H+0.07, z); scene.add(cap);
  }
  addWallCap(0, -L, 2*L+0.8, 0.6);
  addWallCap(0, L, 2*L+0.8, 0.6);
  addWallCap(L, 0, 0.6, 2*L+0.8);
  addWallCap(-L, 0, 0.6, 2*L+0.8);

  // ---------- 厂区标牌 ----------
  function makeSignPost(text, x, z, color) {
    var g = new THREE.Group();
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.5, 0.15), B.makeMetal(0x888888));
    post.position.y = 1.25; g.add(post);
    var board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.05),
      new THREE.MeshStandardMaterial({color: color || 0x2a4a6a, roughness: 0.4}));
    board.position.y = 2.8; g.add(board);
    g.position.set(x, 0, z);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;}});
    scene.add(g);
  }
  makeSignPost('原料区', -15, -42, 0x4488ff);
  makeSignPost('焙烧区', 0, -18, 0xff6633);
  makeSignPost('浸出区', -15, 5, 0x33cc99);
  makeSignPost('净化区', -8, 22, 0xcc88ff);
  makeSignPost('沉钒区', -15, 34, 0xffcc44);
  makeSignPost('煅烧成品区', 15, 42, 0xff4466);
  makeSignPost('环保区', 28, -12, 0x44ccaa);
  makeSignPost('公辅区', -32, -8, 0x8899bb);

  // ---------- 绿化 (厂区周围树木) ----------
  function makeTree(x, z, scale) {
    var g = new THREE.Group();
    var s = scale || 1.0;
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12*s, 0.15*s, 1.5*s, 8),
      B.makePaint(0x6a4a2a));
    trunk.position.y = 0.75*s; g.add(trunk);
    var c1 = new THREE.Mesh(new THREE.ConeGeometry(1.0*s, 2.5*s, 8),
      B.makePaint(0x3a7a3a));
    c1.position.y = 2.5*s; g.add(c1);
    var c2 = new THREE.Mesh(new THREE.ConeGeometry(0.8*s, 2.0*s, 8),
      B.makePaint(0x4a8a4a));
    c2.position.y = 3.5*s; g.add(c2);
    g.position.set(x, 0, z);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
  }
  // 厂区周围树木
  var treePositions = [
    [-50, -50], [0, -50], [50, -50],
    [-50, 0], [50, 0],
    [-50, 50], [0, 50], [50, 50],
    [-40, -30], [40, -30], [-40, 30], [40, 30],
    [-20, -50], [20, -50], [-20, 50], [20, 50],
    [-50, -20], [50, -20], [-50, 20], [50, 20],
  ];
  treePositions.forEach(function(p) {
    makeTree(p[0], p[1], 0.8 + Math.random()*0.6);
  });

  // ---------- 路灯 ----------
  function makeLamp(x, z) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.0, 8),
      B.makeMetal(0x555555));
    pole.position.y = 2.5; g.add(pole);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08),
      B.makeMetal(0x555555));
    arm.position.set(0.7, 5.0, 0); g.add(arm);
    var light = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 0.5}));
    light.position.set(1.4, 4.95, 0); g.add(light);
    g.position.set(x, 0, z);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;}});
    scene.add(g);
  }
  for (var lz = -40; lz <= 40; lz += 20) {
    makeLamp(-5, lz);
    makeLamp(5, lz);
  }
}
