// ============================================================
// 设备精细几何体构建器 v3 — 按真实工业设备外形结构
// 替代 glTF 方块模型
// ============================================================
var EQUIP_BUILDERS = {
  // ---------- 通用辅助 ----------
  makeMetal: function(color){
    return new THREE.MeshStandardMaterial({color:color||0x8899aa, roughness:0.4, metalness:0.5});
  },
  makePaint: function(color){
    return new THREE.MeshStandardMaterial({color:color||0x4472C4, roughness:0.55, metalness:0.25});
  },
  makeGlass: function(color, opacity){
    return new THREE.MeshStandardMaterial({color:color||0x88ccff, roughness:0.1, metalness:0.1,
      transparent:true, opacity:opacity!==undefined?opacity:0.45, side:THREE.DoubleSide});
  },
  makeConcrete: function(){
    return new THREE.MeshStandardMaterial({color:0x9a9585, roughness:0.95, metalness:0.0});
  },
  makeLamp: function(){
    return new THREE.MeshStandardMaterial({color:0xffeecc, emissive:0xffcc66, emissiveIntensity:0.9, roughness:0.4});
  },
  makeGlow: function(c){
    return new THREE.MeshStandardMaterial({color:c||0xff4400, emissive:c||0xff4400, emissiveIntensity:0.7, roughness:0.4});
  },
  _box: function(w,h,d,mat){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); return m; },
  _cyl: function(r,r2,h,mat,seg){ var m=new THREE.Mesh(new THREE.CylinderGeometry(r,r2,h,seg||24),mat); return m; },
  _cone: function(r,h,mat,seg){ var m=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg||24),mat); return m; },
  _tor: function(r,tube,mat){ var m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,12,32),mat); return m; },
  _sph: function(r,mat){ var m=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),mat); return m; },

  // ============================================================
  //  运转动画标记 —— 给运动部件登记真实转速，由 factory.js 统一驱动
  //  rpm  : 真实额定转速（r/min）
  //  axis : 旋转轴方向 'x'|'y'|'z'（父坐标系方向）
  //  pivot: 旋转轴【通过的点】（父坐标系），省略时自动取该部件几何中心
  //         —— 关键：回转体必须绕自己的轴心转，否则会绕地面原点甩起来
  //  amp  : 往复/摆动幅度（m），可为 [ax,ay,az] 实现斜向联动
  // ============================================================
  _spin: function(mesh, rpm, axis, px, py, pz){
    mesh.userData.motion = {
      kind:'spin', rpm: rpm, axis: axis||'y',
      pivot: (px === undefined) ? null : new THREE.Vector3(px||0, py||0, pz||0)
    };
    return mesh;
  },
  _osc: function(mesh, amp, freq, axis){
    // amp 可为数值（单轴）或 [ax,ay,az] 数组（斜向联动，如沿倾斜皮带移动）
    mesh.userData.motion = {kind:'osc', amp: amp, freq: freq, axis: axis||'x'};
    return mesh;
  },

  // ============================================================
  //  1 原料与磨矿
  // ============================================================

  // V-101 钒渣堆场 + 皮带输送
  'V-101': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x7a7a5a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 堆场围堰（梯形环）
    var wall = this._cyl(4.5, 5.5, 0.4, concrete, 24);
    wall.position.y = 0.2; g.add(wall);

    // 渣堆（圆锥，分 5 圈堆叠模拟不规则堆积）
    for(var i=0;i<5;i++){
      var h = 1.4 - i*0.25;
      var r = 2.0 - i*0.35;
      var pile = this._cone(r, h, pm, 16);
      pile.position.y = 0.4 + h/2 + i*0.15;
      pile.rotation.y = i*0.6;
      g.add(pile);
    }
    // 堆顶散料
    var top = this._sph(0.6, pm); top.position.y = 1.8; g.add(top);

    // 皮带机（倾斜，从堆场到破碎机方向）
    var beltFrame = this._box(5.5, 0.1, 1.0, mm);
    beltFrame.position.set(2.5, 1.6, 0.5);
    beltFrame.rotation.z = 0.3;
    g.add(beltFrame);
    // 皮带（深色面）
    var beltSurf = this._box(5.3, 0.05, 0.9, this.makePaint(0x222222));
    beltSurf.position.copy(beltFrame.position);
    beltSurf.position.y += 0.07;
    beltSurf.rotation.z = 0.3;
    g.add(beltSurf);
    // 皮带上输送的钒渣（沿倾斜皮带方向循环前移，直观表达"正在上料"）
    // 皮带倾角 0.3 rad，故 X/Y 必须同步移动，否则矿石会脱离皮带飘移
    var BL = 0.3;
    var oreFlow = new THREE.Group();
    this._osc(oreFlow, [0.95 * Math.cos(BL), 0.95 * Math.sin(BL), 0], 0.14, 'x');
    g.add(oreFlow);
    for(var m=0;m<6;m++){
      var lump = this._box(0.42, 0.16, 0.55, this.makePaint(0x6a5a3a));
      lump.position.set(0.2 + m*0.85, 1.67 + Math.tan(0.3)*(m*0.85 + 2.4), 0.5);
      lump.rotation.z = 0.3;
      oreFlow.add(lump);
    }
    // 托辊（水平横置、轴线垂直于输送方向 Z，随皮带运转自转）
    for(var j=0;j<5;j++){
      var roller = this._cyl(0.08,0.08,0.9,mm,12);
      var fx = 0 + j*1.2;
      var fy = 1.6 + Math.tan(0.3)*fx;
      roller.position.set(fx - 2.2, fy, 0.5);
      roller.rotation.x = Math.PI/2;          // 放倒：圆柱轴由 Y 转为 Z（垂直输送方向）
      this._spin(roller, 62, 'z');
      g.add(roller);
    }
    // 支架腿（梯形）
    for(var k=0;k<4;k++){
      var leg = this._box(0.12, 1.4, 0.12, mm);
      leg.position.set(k*1.5 - 1.5, 0.7, 0.2);
      g.add(leg);
      var leg2 = leg.clone(); leg2.position.z = 0.9; g.add(leg2);
    }
    // 驱动电机
    var motor = this._cyl(0.3,0.3,0.8,this.makePaint(0x2a4a6a),16);
    motor.rotation.z = Math.PI/2;
    motor.position.set(4.5, 1.5, 0.2);
    g.add(motor);
    var motorBody = this._box(0.8,0.5,0.5,this.makePaint(0x2a4a6a));
    motorBody.position.set(4.8,1.5,0.2); g.add(motorBody);

    g.scale.set(2.730, 1.540, 1.820);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // B-102 颚式破碎机
  'B-102': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x3a5a8a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 底座（混凝土基础）
    var base = this._box(3.5, 0.4, 2.5, concrete);
    base.position.y = 0.2; g.add(base);

    // 机架（A 字形主梁）
    var leftLeg = this._box(0.3, 2.8, 0.25, pm);
    leftLeg.position.set(-1.2, 1.4, 0.5);
    leftLeg.rotation.z = 0.12;
    g.add(leftLeg);
    var rightLeg = leftLeg.clone();
    rightLeg.position.x = 1.2; rightLeg.rotation.z = -0.12;
    g.add(rightLeg);
    // 横梁
    var beam = this._box(2.8, 0.35, 0.3, pm);
    beam.position.y = 2.5; g.add(beam);
    // 机座箱
    var box = this._box(2.0, 1.2, 1.4, pm);
    box.position.y = 1.0; g.add(box);
    // 固定颚板（V 形）
    var jawFix = this._box(0.15, 1.0, 0.9, mm);
    jawFix.position.set(0.6, 1.1, 0); jawFix.rotation.z = 0.2;
    g.add(jawFix);
    // 活动颚板（略偏）
    var jawMov = this._box(0.15, 1.0, 0.9, mm);
    jawMov.position.set(-0.3, 1.1, 0); jawMov.rotation.z = -0.15;
    g.add(jawMov);
    // 进料斗（梯形倒锥）
    var hopper = this._cyl(0.8, 0.3, 0.9, mm, 16);
    hopper.rotation.x = Math.PI;
    hopper.position.y = 2.3; g.add(hopper);
    // 飞轮
    var flywheel = this._cyl(0.6,0.6,0.12,mm,20);
    flywheel.rotation.z = Math.PI/2;
    flywheel.position.set(-1.8, 1.2, 0.5);
    g.add(flywheel);
    var fw2 = flywheel.clone(); fw2.position.z = -0.5; g.add(fw2);
    // 电机
    var motor = this._cyl(0.25,0.25,0.7,this.makePaint(0x2a4a6a),14);
    motor.rotation.z = Math.PI/2;
    motor.position.set(-2.2, 0.8, 0.5);
    g.add(motor);
    // 排料溜槽
    var chute = this._box(0.5,0.8,1.0,mm);
    chute.position.set(1.2, 0.4, 0.8);
    chute.rotation.z = -0.3;
    g.add(chute);

    
    // —— 运转机构（补）：动颚往复摆动 + 飞轮回转（复摆颚式破碎机原理）
    var jawGrp = new THREE.Group();
    var jawPlate = this._box(0.14, 1.10, 0.86, this.makePaint(0x8a7a55));
    jawPlate.position.set(0, 1.10, 0); jawGrp.add(jawPlate);
    var toggle = this._box(0.10, 0.42, 0.10, mm);
    toggle.position.set(-0.55, 0.72, 0); jawGrp.add(toggle);
    this._osc(jawGrp, 0.09, 1.9, 'x');
    g.add(jawGrp);
    for(var fi=0; fi<2; fi++){
      var fly = this._cyl(0.34, 0.34, 0.12, mm, 20);
      fly.rotation.z = Math.PI/2;
      fly.position.set((fi===0 ? -0.95 : 0.95), 1.55, 0);
      this._spin(fly, 260, 'x');
      g.add(fly);
    }
g.scale.set(0.530, 0.660, 0.880);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // B-103 圆锥破碎机
  'B-103': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x2a4a7a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 底座
    var base = this._cyl(2.0, 2.2, 0.4, concrete, 24);
    base.position.y = 0.2; g.add(base);
    // 下部锥体（破碎腔）
    var cone = this._cyl(1.5, 0.6, 1.8, pm, 24);
    cone.position.y = 1.3; g.add(cone);
    // 上部锥形罩
    var top = this._cyl(0.6, 0.3, 0.8, pm, 24);
    top.position.y = 2.6; g.add(top);
    // 排料环
    var ring = this._tor(1.5, 0.15, mm);
    ring.rotation.x = Math.PI/2;
    ring.position.y = 0.4;
    g.add(ring);
    // 弹簧保护柱
    for(var i=0;i<6;i++){
      var a = i*Math.PI/3;
      var spring = this._cyl(0.04,0.04,1.0,this.makeMetal(0xaaaaaa),8);
      spring.position.set(Math.cos(a)*1.7, 0.9, Math.sin(a)*1.7);
      g.add(spring);
    }
    // 电机
    var motor = this._cyl(0.3,0.3,0.8,this.makePaint(0x2a4a6a),14);
    motor.rotation.z = Math.PI/2;
    motor.position.set(-2.0, 0.6, 0);
    g.add(motor);
    // 传动皮带护罩
    var guard = this._box(0.4,1.2,0.6,mm);
    guard.position.set(-1.4,0.8,0); g.add(guard);
    // 排料口
    var discharge = this._cyl(0.4,0.4,0.5,mm,16);
    discharge.rotation.z = Math.PI/2;
    discharge.position.set(1.8, 0.4, 0);
    g.add(discharge);

    
    // —— 运转机构（补）：主轴偏心回转带动动锥旋摆
    var ecc = new THREE.Group();
    var mantle = this._cyl(0.52, 0.30, 0.90, this.makePaint(0x8a7a55), 20);
    mantle.position.y = 1.55; ecc.add(mantle);
    var eccShaft = this._cyl(0.10, 0.10, 1.30, mm, 10);
    eccShaft.position.y = 1.20; ecc.add(eccShaft);
    this._spin(ecc, 280, 'y');
    g.add(ecc);
    var beltPulley = this._cyl(0.30, 0.30, 0.14, mm, 18);
    beltPulley.rotation.z = Math.PI/2;
    beltPulley.position.set(0.95, 0.85, 0); this._spin(beltPulley, 985, 'x'); g.add(beltPulley);
g.scale.set(0.570, 0.800, 0.730);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // M-104 湿式球磨机
  'M-104': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a7aaa);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 混凝土基础
    var base = this._box(6.0, 0.5, 2.5, concrete);
    base.position.y = 0.25; g.add(base);

    // ---- 筒体回转组：湿式球磨机 18 r/min（筒体+筋+端盖+大齿轮同步转）----
    var millSpin = new THREE.Group();
    // 轴心必须落在筒体轴线上（筒中心标高 1.5 m）
    this._spin(millSpin, 18, 'x', 0, 1.5, 0);
    g.add(millSpin);

    // 主滚筒（水平圆柱，轴线沿 X）
    var drum = this._cyl(0.9, 0.9, 4.5, pm, 24);
    drum.rotation.z = Math.PI/2;
    drum.position.y = 1.5;
    millSpin.add(drum);
    // 筒内钢球与矿浆（剖面模式下可见；随筒体被提升到一定高度后抛落）
    var charge = this._cyl(0.62, 0.62, 4.3, this.makePaint(0x8a8a92), 16);
    charge.rotation.z = Math.PI/2;
    charge.position.set(0, 1.20, 0);
    charge.userData.isCharge = true;
    millSpin.add(charge);
    // 筒体加强筋（环向箍在筒体上，法向沿筒轴 X）
    for(var i=0;i<6;i++){
      var rib = this._tor(0.92, 0.04, mm);
      rib.rotation.y = Math.PI/2;
      rib.position.set(-1.8 + i*0.72, 1.5, 0);
      millSpin.add(rib);
    }
    // 端盖
    var endL = this._cyl(0.92, 0.92, 0.1, mm, 24);
    endL.rotation.z = Math.PI/2;
    endL.position.set(-2.3, 1.5, 0); millSpin.add(endL);
    var endR = endL.clone(); endR.position.x = 2.3; millSpin.add(endR);
    // 传动大齿轮
    var gear = this._cyl(1.0, 1.0, 0.15, this.makePaint(0xccaa33), 24);
    gear.rotation.z = Math.PI/2;
    gear.position.set(2.4, 1.5, 0);
    millSpin.add(gear);
    // 传动小齿轮
    var pinion = this._cyl(0.4, 0.4, 0.15, this.makePaint(0xccaa33), 16);
    pinion.rotation.z = Math.PI/2;
    pinion.position.set(2.9, 1.5, 0);
    g.add(pinion);
    // 减速电机
    var motor = this._cyl(0.3,0.3,1.0,this.makePaint(0x2a4a6a),16);
    motor.rotation.z = Math.PI/2;
    motor.position.set(3.5, 1.2, 0);
    g.add(motor);
    var motorBox = this._box(0.8,0.6,0.6,this.makePaint(0x2a4a6a));
    motorBox.position.set(3.9, 1.2, 0); g.add(motorBox);
    // 进料口
    var feed = this._cyl(0.3,0.3,0.6,mm,12);
    feed.rotation.x = Math.PI/2;
    feed.position.set(-2.0, 2.2, 0.6);
    g.add(feed);
    // 排料口
    var discharge = this._cyl(0.25,0.25,0.5,mm,12);
    discharge.rotation.x = Math.PI/2;
    discharge.position.set(2.0, 0.8, -0.6);
    g.add(discharge);
    // 给料斗
    var hopper = this._cyl(0.6,0.2,0.7,mm,12);
    hopper.rotation.x = Math.PI;
    hopper.position.set(-2.0, 2.5, 0.6);
    g.add(hopper);
    // 支撑轴承座
    for(var b=0;b<2;b++){
      var bh = this._box(0.5,1.2,0.8,mm);
      bh.position.set(b*3.0 - 1.5, 0.6, 0);
      g.add(bh);
    }

    g.scale.set(1.230, 1.720, 1.800);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // H-105 分级旋流器组
  'H-105': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x6a8aaa);
    var mm = this.makeMetal(0x777777);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(4.0, 0.3, 2.0, concrete);
    base.position.y = 0.15; g.add(base);

    // 6 个立式旋流器
    for(var i=0;i<6;i++){
      var cx = -1.5 + i*0.6;
      // 锥体
      var cone = this._cyl(0.35, 0.05, 1.2, pm, 16);
      cone.position.set(cx, 1.0, 0); g.add(cone);
      // 溢流短管（顶部）
      var overflow = this._cyl(0.08, 0.08, 0.5, mm, 8);
      overflow.position.set(cx, 1.85, 0); g.add(overflow);
      // 进料口（切向）
      var feed = this._cyl(0.12, 0.12, 0.4, mm, 8);
      feed.rotation.z = Math.PI/2;
      feed.position.set(cx+0.35, 1.5, 0); g.add(feed);
      // 底部沉砂口
      var under = this._cyl(0.1, 0.1, 0.3, mm, 8);
      under.position.set(cx, 0.3, 0); g.add(under);
    }
    // 进料总管
    var manifold = this._cyl(0.15, 0.15, 3.8, mm, 10);
    manifold.rotation.z = Math.PI/2;
    manifold.position.set(0, 1.5, 0.5); g.add(manifold);

    
    // —— 运转机构（补）：旋流器给料泵（旋流器靠泵压给料分级）
    var feedPump = this._cyl(0.26, 0.26, 0.55, this.makePaint(0xcc4444), 16);
    feedPump.rotation.z = Math.PI/2;
    feedPump.position.set(-1.30, 0.55, 0.90); this._spin(feedPump, 1470, 'x'); g.add(feedPump);
    var fpMot = this._cyl(0.20, 0.20, 0.60, this.makePaint(0x2a4a6a), 14);
    fpMot.rotation.z = Math.PI/2;
    fpMot.position.set(-1.30, 0.55, 1.60); this._spin(fpMot, 1470, 'x'); g.add(fpMot);
g.scale.set(0.730, 2.140, 1.500);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // T-106 矿浆浓密机
  'T-106': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a8aaa);
    var mm = this.makeMetal(0x777777);
    var concrete = this.makeConcrete();

    // 大圆池（直径 10m，立式周边驱动浓密机）
    var pool = this._cyl(5.0, 5.0, 0.6, concrete, 32);
    pool.position.y = 0.3; g.add(pool);
    // 池壁（高 2.0m）
    var wall = this._cyl(5.1, 5.1, 2.0, mm, 32);
    wall.material = this.makePaint(0x445566);
    wall.position.y = 1.5; g.add(wall);
    // 内部矿浆液面
    var slurry = this._cyl(4.8, 4.8, 0.2, this.makeGlass(0x9a7a4a, 0.55), 32);
    slurry.position.y = 2.5; g.add(slurry);
    // ---- 耙架回转组（周边驱动浓密机 0.35 r/min，把沉泥刮向中心底流口）----
    var rake = new THREE.Group();
    this._spin(rake, 0.35, 'y');
    g.add(rake);
    // 耙架（十字形，半径 4.5）
    var raft1 = this._box(9.0, 0.12, 0.3, mm);
    raft1.position.y = 2.7; rake.add(raft1);
    var raft2 = raft1.clone();
    raft2.rotation.y = Math.PI/2; rake.add(raft2);
    // 耙齿（斜置刮板）
    for(var t=0;t<8;t++){
      var tt = -4.0 + t*1.0;
      var tooth = this._box(0.6, 0.30, 0.10, this.makePaint(0x6a6a55));
      tooth.position.set(tt, 2.48, 0);
      tooth.rotation.y = 0.6; rake.add(tooth);
    }
    // 中心驱动架（高 3.5m，真实周边/中心驱动特征）
    var drive = this._cyl(0.5, 0.5, 1.6, this.makePaint(0x2a4a6a), 16);
    drive.position.y = 3.8; rake.add(drive);
    var driveTop = this._box(1.2, 0.6, 1.2, mm);
    driveTop.position.y = 4.7; rake.add(driveTop);
    // 溢流周边槽
    var weir = this._tor(4.9, 0.09, mm);
    weir.rotation.x = Math.PI/2;
    weir.position.y = 2.8; g.add(weir);
    // 周边驱动（4 个行走小车，沿池壁）
    for(var i=0;i<4;i++){
      var a = i*Math.PI/2 + Math.PI/4;
      var cart = this._box(0.5, 0.35, 0.35, mm);
      cart.position.set(Math.cos(a)*4.95, 1.2, Math.sin(a)*4.95);
      g.add(cart);
    }

    g.scale.set(1.180, 0.900, 1.180);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // S-201 钠化配料混合机
  'S-201': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a7aaa);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(3.5, 0.3, 2.5, concrete);
    base.position.y = 0.15; g.add(base);

    // 双锥混合机（中间窄两端大）
    var coneL = this._cone(1.0, 1.5, pm, 24);
    coneL.rotation.z = Math.PI/2;
    coneL.position.set(-0.75, 1.5, 0); g.add(coneL);
    var coneR = this._cone(1.0, 1.5, pm, 24);
    coneR.rotation.z = -Math.PI/2;
    coneR.position.set(0.75, 1.5, 0); g.add(coneR);
    // 中心轴
    var axis = this._cyl(0.2, 0.2, 3.0, mm, 16);
    axis.rotation.z = Math.PI/2;
    axis.position.y = 1.5; g.add(axis);
    // 传动端
    var motor = this._cyl(0.3, 0.3, 0.8, this.makePaint(0x2a4a6a), 14);
    motor.rotation.z = Math.PI/2;
    motor.position.set(2.0, 1.5, 0); g.add(motor);
    // 进料斗
    var hopper = this._cyl(0.5, 0.2, 0.7, mm, 12);
    hopper.rotation.x = Math.PI;
    hopper.position.set(-1.5, 2.0, 0); g.add(hopper);
    // 排料口
    var discharge = this._cyl(0.15, 0.15, 0.4, mm, 10);
    discharge.position.set(0, 0.4, 0); g.add(discharge);
    // 支撑腿
    for(var i=0;i<2;i++){
      var leg = this._box(0.25, 1.5, 0.25, mm);
      leg.position.set(i*2.5 - 1.25, 0.75, 0.6); g.add(leg);
      var leg2 = leg.clone(); leg2.position.z = -0.6; g.add(leg2);
    }

    
    // —— 运转机构（补）：双轴强制搅拌（两轴反向回转，钠化配料混匀）
    // 关键：每个轴 group 的原点必须落在【自身轴心】(0,0.95,±0.42) 上，
    // 子件相对轴心定位；_spin 省略 pivot 时自动取几何中心=轴心，
    // 这样两轴各自【原地自转】，不再绕设备中心公转（旧 bug）。
    for(var sa=0; sa<2; sa++){
      var zc = (sa===0 ? -0.42 : 0.42);
      var shaftG = new THREE.Group();
      shaftG.position.set(0, 0.95, zc);
      var sh = this._cyl(0.11, 0.11, 3.20, mm, 12);
      sh.rotation.z = Math.PI/2;
      shaftG.add(sh);
      for(var pb=0; pb<8; pb++){
        var pad = this._box(0.20, 0.42, 0.09, this.makePaint(0x99aabb));
        var px = -1.30 + pb*0.37;
        pad.position.set(px, 0, 0);
        pad.rotation.x = pb*0.8;
        shaftG.add(pad);
      }
      this._spin(shaftG, (sa===0 ? 62 : -62), 'x');
      g.add(shaftG);
    }
g.scale.set(1.140, 1.000, 1.000);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // K-202 钠化焙烧回转窑（核心设备）
  // K-202 钠化焙烧回转窑 φ2.5×30 m（窑轴横贯车间：窑头 -X 进料+燃烧器，窑尾 +X 出料+排烟）
  'K-202': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x8a5a3a);          // 窑筒体（耐热漆）
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();
    var glow = this.makeGlow(0xff3300);
    var refr = this.makePaint(0x9a7a60);        // 窑口耐火浇注料

    // ===== 规格锚点：筒体内径 2.5 m｜筒体长 30 m｜L/D=12｜斜度 3.5 %｜窑速 2.4 r/min =====
    var KL = 30.0;     // 筒体长度
    var KR = 1.25;     // 筒体半径（内径 2.5 m）
    var AY = 4.20;     // 窑中心线标高（托轮 + 基础 + 筒体半径决定）
    var TILT = 0.035;  // 斜度 3.5 %
    var tireR = 1.60;  // 轮带外半径
    var rolR  = 1.00;  // 托轮半径
    var CD = tireR + rolR;                 // 轮带—托轮中心距 = 2.60 m
    var supX = [-10.5, 0, 10.5];           // 3 档支承（跨度 10.5 m）

    // ---- 两列条形混凝土基础（沿窑轴 X 向，落在托轮正下方）----
    for(var r=0;r<2;r++){
      var fnd = this._box(35.0, 0.95, 1.6, concrete);
      fnd.position.set(0, 0.475, (r*2-1)*CD*0.5); g.add(fnd);
      // 基础顶预埋钢板
      var pl = this._box(34.0, 0.06, 1.2, mm);
      pl.position.set(0, 0.98, (r*2-1)*CD*0.5); g.add(pl);
    }

    // ---- 窑体运动层级：tilt（3.5% 斜度）→ spin（2.4 r/min 自转）----
    // 窑头(-X)高、窑尾(+X)低：绕 Z 轴转 -TILT
    var tilt = new THREE.Group();
    tilt.rotation.z = -TILT;
    g.add(tilt);
    var spin = new THREE.Group();
    this._spin(spin, 2.4, 'x', 0, AY, 0);      // 轴心落在窑中心线上
    tilt.add(spin);

    // ---- 托轮组 + 轮带（每档 2 个托轮，支承角 30°）----
    for(var i=0;i<supX.length;i++){
      var xc = supX[i];
      var cyy = AY - xc * TILT;                 // 该档处窑中心线标高
      for(var r=0;r<2;r++){
        var sz = (r*2-1) * CD * 0.5;            // ±1.30（横向）
        var syy = cyy - CD * 0.866;             // -2.25（竖向）
        var roller = this._cyl(rolR, rolR, 1.10, mm, 22);
        roller.rotation.z = Math.PI/2;          // 轴沿 X，与窑轴平行
        roller.position.set(xc, syy, sz);
        this._spin(roller, 8.6, 'x');           // 托轮被窑带动，n托 = n窑×D窑/D托
        g.add(roller);
        // 轴承座（从基础顶坐到托轮中心）
        var brgH = Math.max(syy - rolR - 0.95, 0.30);
        var brg = this._box(1.30, brgH, 1.10, this.makePaint(0x445566));
        brg.position.set(xc, 0.95 + brgH/2, sz); g.add(brg);
      }
      // 轮带（套在筒体上随窑回转）
      var tire = this._tor(tireR, 0.14, this.makePaint(0x6b4a33));
      tire.rotation.y = Math.PI/2;              // 环面法向转至 X 轴
      tire.position.set(xc, AY, 0); spin.add(tire);
      // 挡轮（液压挡轮，控制窑体轴向窜动）
      var thr = this._cyl(0.55, 0.55, 0.42, this.makePaint(0x556070), 16);
      thr.rotation.z = Math.PI/2;
      thr.position.set(xc + 1.9, AY - 2.15, 0); g.add(thr);
    }

    // ---- 筒体 + 耐火内衬 + 窑口护板 ----
    var shell = this._cyl(KR, KR, KL, pm, 40);
    shell.rotation.z = Math.PI/2;
    shell.position.set(0, AY, 0); spin.add(shell);
    // 耐火砖内衬（筒体内壁，剖切可见）
    var lining = this._cyl(KR-0.12, KR-0.12, KL-0.3, refr, 36);
    lining.rotation.z = Math.PI/2;
    lining.position.set(0, AY, 0); spin.add(lining);
    // 窑头端（-X，进料端，收口 + 窑口护铁）
    var head = this._cyl(KR, 0.72, 1.30, pm, 28);
    head.rotation.z = -Math.PI/2;
    head.position.set(-(KL/2+0.65), AY, 0); spin.add(head);
    var headR = this._cyl(0.78, 0.78, 0.30, refr, 24);
    headR.rotation.z = -Math.PI/2;
    headR.position.set(-(KL/2+1.30), AY, 0); spin.add(headR);
    // 窑尾端（+X，出料端，收口）
    var tail = this._cyl(0.72, KR, 1.30, pm, 28);
    tail.rotation.z = -Math.PI/2;
    tail.position.set(KL/2+0.65, AY, 0); spin.add(tail);
    var tailR = this._cyl(0.78, 0.78, 0.30, refr, 24);
    tailR.rotation.z = -Math.PI/2;
    tailR.position.set(KL/2+1.30, AY, 0); spin.add(tailR);
    // 大齿圈（窑中部偏窑头侧，随窑回转）
    var gearRing = this._cyl(1.92, 1.92, 0.42, this.makePaint(0xaa8833), 44);
    gearRing.rotation.z = Math.PI/2;
    gearRing.position.set(-4.5, AY, 0); spin.add(gearRing);
    // 窑内物料层（随窑翻滚，剖面可见）
    var bed = this._cyl(KR*0.60, KR*0.60, KL*0.94, this.makePaint(0x7a4a28), 24);
    bed.rotation.z = Math.PI/2;
    bed.position.set(0, AY - KR*0.45, 0); spin.add(bed);
    // 窑皮结圈示意的焙烧带高温发光
    var gl1 = this._sph(0.95, glow); gl1.position.set(-8, AY - 0.10, 0); g.add(gl1);
    var gl2 = this._sph(0.85, glow); gl2.position.set(0, AY - 0.20, 0); g.add(gl2);

    // ---- 传动装置：小齿轮 → 减速机 → 主电机（窑侧下方）----
    var pin = this._cyl(0.62, 0.62, 0.42, this.makePaint(0xcc9933), 22);
    pin.rotation.z = Math.PI/2;
    pin.position.set(-4.5, AY - 2.54, 0); this._spin(pin, 7.4, 'x'); g.add(pin);
    var gb = this._box(1.80, 1.40, 1.50, this.makePaint(0x3a5a7a));
    gb.position.set(-4.5, 1.55, 3.30); g.add(gb);
    var mot = this._cyl(0.55, 0.55, 1.90, this.makePaint(0x2a4a6a), 22);
    mot.rotation.z = Math.PI/2;
    mot.position.set(-4.5, 1.45, 5.20); this._spin(mot, 985, 'x'); g.add(mot);
    var coupling = this._cyl(0.24, 0.24, 0.70, mm, 12);
    coupling.rotation.z = Math.PI/2;
    coupling.position.set(-4.5, 1.50, 4.15); this._spin(coupling, 985, 'x'); g.add(coupling);

    // ---- 窑头：窑头罩 + 下料溜槽 + 燃烧器 + 一次风机 ----
    var hoodIn = this._box(3.20, 3.60, 3.20, this.makePaint(0x4a4a52));
    hoodIn.position.set(-(KL/2+3.10), AY + 0.15, 0); g.add(hoodIn);
    // 窑头罩耐火内衬
    var hoodRef = this._box(2.90, 3.30, 2.90, refr);
    hoodRef.position.set(-(KL/2+3.10), AY + 0.15, 0); g.add(hoodRef);
    var inChute = this._box(0.85, 3.20, 0.85, mm);
    inChute.position.set(-(KL/2+3.60), AY + 2.60, 0); g.add(inChute);
    var burner = this._cyl(0.32, 0.18, 3.20, mm, 16);
    burner.rotation.z = Math.PI/2;
    burner.position.set(-(KL/2+5.60), AY, 0); g.add(burner);
    var burnerGlow = this._sph(0.42, glow);
    burnerGlow.position.set(-(KL/2+2.20), AY, 0); g.add(burnerGlow);
    var gasPipe = this._cyl(0.14, 0.14, 2.20, this.makePaint(0xddaa00), 12);
    gasPipe.position.set(-(KL/2+5.60), AY + 1.30, 0); g.add(gasPipe);

    // ---- 窑尾：窑尾罩 + 出料溜槽（去冷却机）+ 排烟烟道（去除尘器）----
    var hoodOut = this._box(3.20, 3.60, 3.20, this.makePaint(0x4a4a52));
    hoodOut.position.set(KL/2+3.10, AY - 0.15, 0); g.add(hoodOut);
    // 出料溜槽（向下 +X 方向落到冷却机受料端）
    var outChute = this._box(1.00, 2.60, 1.00, mm);
    outChute.position.set(KL/2+3.40, AY - 2.20, 0); g.add(outChute);
    // 窑尾烟道（从窑尾罩顶部引出，真实：接袋式除尘器，不由窑自带烟囱）
    var ductV = this._cyl(0.85, 0.85, 3.20, mm, 18);
    ductV.position.set(KL/2+3.10, AY + 3.20, 0); g.add(ductV);
    var ductH = this._cyl(0.85, 0.85, 5.00, mm, 18);
    ductH.rotation.x = Math.PI/2;
    ductH.position.set(KL/2+3.10, AY + 4.70, 2.60); g.add(ductH);

    // ---- 窑头操作平台（钢格栅 + 栏杆，真实回转窑标配）----
    var plat = this._box(7.00, 0.10, 4.20, this.makePaint(0x8a8a8a));
    plat.position.set(-(KL/2+3.60), AY + 1.90, 0); g.add(plat);
    for(var pp=0;pp<4;pp++){
      var post = this._box(0.10, 4.30, 0.10, mm);
      post.position.set(-(KL/2+1.40) + (pp%2)*4.40, 2.15, (pp<2?-1.90:1.90)); g.add(post);
    }
    for(var hr=0;hr<2;hr++){
      var rail = this._box(7.00, 0.06, 0.06, this.makePaint(0xddaa00));
      rail.position.set(-(KL/2+3.60), AY + 2.90 + hr*0.55, (hr===0?-1.90:1.90)); g.add(rail);
    }

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // D-203 袋式除尘器
  'D-203': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x6a8aaa);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础（按中型袋式除尘器 4×2×4.5m）
    var base = this._box(5.0, 0.4, 3.0, concrete);
    base.position.y = 0.2; g.add(base);
    // 箱体（高度 3.0m）
    var body = this._box(4.0, 3.0, 2.0, pm, 24);
    body.position.y = 2.5; g.add(body);
    // 顶部盖板
    var lid = this._box(4.2, 0.2, 2.2, mm, 24);
    lid.position.y = 4.1; g.add(lid);
    // 出气口（顶部）
    var outlet = this._cyl(0.4, 0.4, 1.0, mm, 12);
    outlet.rotation.z = Math.PI/2;
    outlet.position.set(2.0, 4.2, 0); g.add(outlet);
    // 灰斗（底部锥形，4 个锥形斗）
    for(var i=0;i<4;i++){
      var hopper = this._cone(0.6, 0.9, pm, 24);
      hopper.rotation.x = Math.PI;
      hopper.position.set(-1.5 + i*1.0, 0.45, 0); g.add(hopper);
    }
    // 脉冲阀（顶部 8 个）
    for(var i=0;i<8;i++){
      var valve = this._cyl(0.08, 0.08, 0.3, mm, 8);
      valve.position.set(-1.5 + i*0.45, 4.3, 0);
      g.add(valve);
    }
    // 检修门（2 扇）
    for(var i=0;i<2;i++){
      var door = this._box(0.8, 1.2, 0.1, mm);
      door.position.set(-0.5 + i*1.5, 2.2, 1.05); g.add(door);
    }
    // 支架（4 根）
    for(var i=0;i<4;i++){
      var leg = this._box(0.2, 1.0, 0.2, mm);
      leg.position.set(-1.5 + i*1.0, 0.5, i%2*1.0 - 0.5);
      g.add(leg);
    }

    
    // —— 运转机构（补）：脉冲清灰阀 + 星型卸灰阀（定压差脉冲喷吹）
    for(var pv=0; pv<4; pv++){
      var valve = this._box(0.18, 0.22, 0.18, this.makePaint(0xcc4444));
      valve.position.set(-1.30 + pv*0.85, 3.55, 1.15);
      this._osc(valve, 0.05, 0.55, 'y');
      g.add(valve);
    }
    var rotaryAirlock = this._cyl(0.26, 0.26, 0.34, mm, 16);
    rotaryAirlock.rotation.z = Math.PI/2;
    rotaryAirlock.position.set(0, 0.75, -1.15);
    this._spin(rotaryAirlock, 24, 'x'); g.add(rotaryAirlock);
g.scale.set(2.400, 3.040, 2.330);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // C-204 链板式熟料冷却机 18×2.4 m（与窑平行布置，窑尾罩落料→链板输送→鼓风冷却→出料）
  'C-204': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a6a5a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();
    var hot = this.makePaint(0x8a4a2a);

    var CL = 18.0;     // 链板有效长度
    var CW = 2.40;     // 链板宽度
    var CY = 1.55;     // 链板面标高（架高，下方为鼓风室）

    // 混凝土基础 + 支腿
    var base = this._box(CL+2.0, 0.40, CW+1.8, concrete);
    base.position.y = 0.20; g.add(base);
    for(var i=0;i<6;i++){
      var leg = this._box(0.22, 1.20, 0.22, this.makePaint(0x555f68));
      var lx = -CL/2 + 0.8 + i*(CL-1.6)/5;
      leg.position.set(lx, 0.90, -CW/2 - 0.5); g.add(leg);
      var leg2 = leg.clone(); leg2.position.z = CW/2 + 0.5; g.add(leg2);
    }
    for(var s=0;s<2;s++){
      var side = this._box(CL+1.0, 1.10, 0.14, pm);
      side.position.set(0, CY + 0.35, (s*2-1)*(CW/2 + 0.10)); g.add(side);
    }
    // 鼓风室（链板下方风箱）
    for(var k=0;k<3;k++){
      var box = this._box(CL/3 - 0.3, 0.85, CW, this.makePaint(0x44607a));
      box.position.set(-CL/2 + CL/6 + k*CL/3, CY - 0.55, 0); g.add(box);
      var air = this._cyl(0.30, 0.30, 0.6, mm, 12);
      air.rotation.x = Math.PI/2;
      air.position.set(-CL/2 + CL/6 + k*CL/3, CY - 0.55, CW/2 + 0.6); g.add(air);
    }
    // 链板（循环移动的链板 + 料层）
    var chain = new THREE.Group();
    for(var m=0;m<24;m++){
      var slat = this._box(0.62, 0.09, CW - 0.14, this.makePaint(0x3a4a4a));
      slat.position.set(-CL/2 + 0.4 + m*0.75, CY, 0);
      chain.add(slat);
      var bed = this._box(0.55, 0.20, CW - 0.30, hot);
      bed.position.set(-CL/2 + 0.4 + m*0.75, CY + 0.16, 0);
      chain.add(bed);
    }
    this._osc(chain, 0.75, 0.22, 'x');   // 链板速度 1.6 m/min
    g.add(chain);
    // 头尾链轮
    for(var e=0;e<2;e++){
      var sp = this._cyl(0.62, 0.62, CW + 0.2, this.makePaint(0x8899aa), 20);
      sp.rotation.z = Math.PI/2;
      sp.position.set((e===0 ? -CL/2-0.7 : CL/2+0.7), CY, 0);
      this._spin(sp, 2.4, 'x');
      g.add(sp);
    }
    // 传动（头轮电机 + 减速机）
    var gb = this._box(1.10, 0.90, 0.90, this.makePaint(0x3a5a7a));
    gb.position.set(CL/2+1.9, CY - 0.3, -CW/2 - 1.0); g.add(gb);
    var mot = this._cyl(0.34, 0.34, 1.05, this.makePaint(0x2a4a6a), 18);
    mot.rotation.z = Math.PI/2;
    mot.position.set(CL/2+1.9, CY - 0.3, -CW/2 - 2.0); this._spin(mot, 985, 'x'); g.add(mot);
    // 上部保温罩 + 观察孔
    var hood = this._box(CL - 1.0, 1.20, CW + 0.5, this.makePaint(0x6a7a7a));
    hood.position.set(0, CY + 1.45, 0); g.add(hood);
    for(var p=0;p<5;p++){
      var peek = this._cyl(0.16, 0.16, 0.08, this.makeGlass(0xffcc88, 0.5), 10);
      peek.rotation.x = Math.PI/2;
      peek.position.set(-CL/2 + 2.0 + p*3.5, CY + 1.30, CW/2 + 0.32); g.add(peek);
    }
    // 冷却风机（3 台轴流，侧置连续运转）
    for(var f=0;f<3;f++){
      var fanGrp = new THREE.Group();
      var hub = this._cyl(0.16, 0.16, 0.40, mm, 12);
      hub.rotation.z = Math.PI/2;
      fanGrp.add(hub);
      for(var fb=0;fb<6;fb++){
        var blade = this._box(0.34, 0.05, 0.18, this.makePaint(0x99aabb));
        blade.rotation.x = fb*Math.PI/3;
        blade.rotation.z = 0.45;
        fanGrp.add(blade);
      }
      fanGrp.position.set(-CL/2 + 3.0 + f*6.0, CY - 0.55, CW/2 + 1.15);
      this._spin(fanGrp, 960, 'x');
      g.add(fanGrp);
    }
    // 受料口：位于 -X 端上方，正对窑尾罩出料溜槽（熟料自窑尾落入链板头部）
    var feed = this._box(1.30, 1.60, 1.30, mm);
    feed.position.set(-CL/2 + 1.2, CY + 0.95, 0); g.add(feed);
    // 出料口：位于 +X 端下方（冷却后的熟料排出，去熟料湿磨）
    var dis = this._box(1.10, 1.10, 1.10, mm);
    dis.position.set(CL/2 - 0.3, CY - 0.62, 0); g.add(dis);
    // 检修平台 + 栏杆
    var plat = this._box(CL, 0.10, 1.20, this.makePaint(0x8a8a8a));
    plat.position.set(0, CY + 2.10, -CW/2 - 0.90); g.add(plat);
    for(var hr=0;hr<2;hr++){
      var rail = this._box(CL, 0.06, 0.06, this.makePaint(0xddaa00));
      rail.position.set(0, CY + 2.60 + hr*0.50, -CW/2 - 1.45); g.add(rail);
    }

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // R-301 一级浸出槽
  'R-301': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x3a8a7a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 混凝土基础（直径 4.5m 罐 + 周边）
    var base = this._box(5.5, 0.45, 5.5, concrete);
    base.position.y = 0.225; g.add(base);
    // 罐体（立式圆筒 直径 4.5m 高 3.5m，H/D≈0.8 符合浸出搅拌槽）
    var tank = this._cyl(2.25, 2.25, 3.5, pm, 32);
    tank.position.y = 2.2; g.add(tank);
    // 罐盖（带保温层，椭圆封头感）
    var lid = this._cyl(2.3, 2.3, 0.2, mm, 32);
    lid.position.y = 4.05; g.add(lid);
    var topDome = this._sph(2.25, pm, 24);
    topDome.scale.y = 0.35;
    topDome.position.y = 4.2; g.add(topDome);
    // 保温带（4 道）
    for(var i=0;i<4;i++){
      var band = this._tor(2.28, 0.05, this.makePaint(0x888888));
      band.rotation.x = Math.PI/2;
      band.position.y = 0.8 + i*0.85;
      g.add(band);
    }
    // 搅拌电机（顶部，30kW 立式）
    var motor = this._cyl(0.4, 0.4, 1.1, this.makePaint(0x2a4a6a), 16);
    motor.position.y = 4.95; g.add(motor);
    var gearbox = this._box(0.6, 0.45, 0.6, mm);
    gearbox.position.y = 4.3; g.add(gearbox);
    // ---- 搅拌器（浸出槽双层桨 ~300 r/min，整组随搅拌轴回转）----
    var agitator = new THREE.Group();
    var shaftA = this._cyl(0.06, 0.06, 3.0, mm, 8);
    shaftA.position.y = 2.5; agitator.add(shaftA);
    for(var k=0;k<2;k++){
      var iy = (k===0) ? 1.2 : 2.1;
      var imp = this._cyl(0.8, 0.8, 0.08, mm, 16);
      imp.position.y = iy; agitator.add(imp);
      for(var i=0;i<4;i++){
        var blade = this._box(0.7, 0.28, 0.08, mm);
        blade.position.y = iy;
        blade.rotation.y = i*Math.PI/2;
        agitator.add(blade);
      }
    }
    this._spin(agitator, 300, 'y');
    g.add(agitator);
    // 液面（半透明，高 3.0）
    var liquid = this._cyl(2.15, 2.15, 0.15, this.makeGlass(0x6a9a7a, 0.5), 32);
    liquid.position.y = 3.3; g.add(liquid);
    // 进料管（斜入罐顶）
    var feedPipe = this._cyl(0.2, 0.2, 1.8, mm, 12);
    feedPipe.rotation.z = 0.4;
    feedPipe.position.set(2.6, 3.6, 0); g.add(feedPipe);
    // 出料口（底部）
    var drain = this._cyl(0.25, 0.25, 0.7, mm, 12);
    drain.rotation.x = Math.PI/2;
    drain.position.set(0, 0.6, 2.5); g.add(drain);
    // 液位计（侧面玻璃管）
    var lvd = this._cyl(0.07, 0.07, 2.4, this.makeGlass(0xffffff, 0.7), 8);
    lvd.position.set(2.2, 2.2, 0); g.add(lvd);
    // 人孔
    var manhole = this._cyl(0.4, 0.4, 0.08, mm, 16);
    manhole.rotation.x = Math.PI/2;
    manhole.position.set(0, 2.4, 2.28); g.add(manhole);

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // R-302 二级浸出槽
  'R-302': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x3a7a6a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(4.5, 0.4, 4.5, concrete);
    base.position.y = 0.2; g.add(base);
    // 罐体（直径 3.5m 高 3.0m）
    var tank = this._cyl(1.75, 1.75, 3.0, pm, 28);
    tank.position.y = 1.9; g.add(tank);
    // 罐盖 + 封头
    var lid = this._cyl(1.8, 1.8, 0.15, mm, 28);
    lid.position.y = 3.45; g.add(lid);
    var topDome = this._sph(1.75, pm, 20);
    topDome.scale.y = 0.35;
    topDome.position.y = 3.6; g.add(topDome);
    // 保温带（3 道）
    for(var i=0;i<3;i++){
      var band = this._tor(1.78, 0.05, this.makePaint(0x888888));
      band.rotation.x = Math.PI/2;
      band.position.y = 0.8 + i*0.9;
      g.add(band);
    }
    // 搅拌电机
    var motor = this._cyl(0.32, 0.32, 0.85, this.makePaint(0x2a4a6a), 14);
    motor.position.y = 4.15; g.add(motor);
    // 搅拌轴 + 双层叶轮（真实浸出槽 ~300 r/min；整组随轴旋转）
    var agitator = new THREE.Group();
    var shaftR = this._cyl(0.05, 0.05, 2.5, mm, 8);
    shaftR.position.y = 2.2; agitator.add(shaftR);
    for(var k=0;k<2;k++){
      var iy = (k===0) ? 1.05 : 2.05;
      var imp = this._cyl(0.6, 0.6, 0.06, mm, 14);
      imp.position.y = iy; agitator.add(imp);
      for(var i=0;i<4;i++){
        var blade = this._box(0.5, 0.22, 0.06, mm);
        blade.position.y = iy; blade.rotation.y = i*Math.PI/2; agitator.add(blade);
      }
    }
    this._spin(agitator, 300, 'y');
    g.add(agitator);
    // 液面
    var liquid = this._cyl(1.65, 1.65, 0.12, this.makeGlass(0x5a8a7a, 0.5), 28);
    liquid.position.y = 2.9; g.add(liquid);
    // 出料口
    var drain = this._cyl(0.2, 0.2, 0.6, mm, 10);
    drain.rotation.x = Math.PI/2;
    drain.position.set(0, 0.5, 1.85); g.add(drain);

    g.scale.set(1.330, 1.410, 1.330);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // R-303 三级逆流浸出槽（与 R-302 同规格，逆流浸出末级）
  'R-303': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x2f6a5a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    var base = this._box(4.5, 0.4, 4.5, concrete);
    base.position.y = 0.2; g.add(base);
    var tank = this._cyl(1.75, 1.75, 3.0, pm, 28);
    tank.position.y = 1.9; g.add(tank);
    var lid = this._cyl(1.8, 1.8, 0.15, mm, 28);
    lid.position.y = 3.45; g.add(lid);
    var topDome = this._sph(1.75, pm, 20);
    topDome.scale.y = 0.35; topDome.position.y = 3.6; g.add(topDome);
    for(var i=0;i<3;i++){
      var band = this._tor(1.78, 0.05, this.makePaint(0x888888));
      band.rotation.x = Math.PI/2; band.position.y = 0.8 + i*0.9; g.add(band);
    }
    var motor = this._cyl(0.32, 0.32, 0.85, this.makePaint(0x2a4a6a), 14);
    motor.position.y = 4.15; g.add(motor);
    // 搅拌轴 + 双层叶轮
    var agitator = new THREE.Group();
    var shaftR = this._cyl(0.05, 0.05, 2.5, mm, 8);
    shaftR.position.y = 2.2; agitator.add(shaftR);
    for(var k=0;k<2;k++){
      var iy = (k===0) ? 1.05 : 2.05;
      var imp = this._cyl(0.6, 0.6, 0.06, mm, 14);
      imp.position.y = iy; agitator.add(imp);
      for(var b=0;b<4;b++){
        var blade = this._box(0.5, 0.22, 0.06, mm);
        blade.position.y = iy; blade.rotation.y = b*Math.PI/2; agitator.add(blade);
      }
    }
    this._spin(agitator, 300, 'y');
    g.add(agitator);
    var liquid = this._cyl(1.65, 1.65, 0.12, this.makeGlass(0x4a7a6a, 0.5), 28);
    liquid.position.y = 2.9; g.add(liquid);
    var drain = this._cyl(0.2, 0.2, 0.6, mm, 10);
    drain.rotation.x = Math.PI/2;
    drain.position.set(0, 0.5, 1.85); g.add(drain);

    g.scale.set(1.330, 1.410, 1.330);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // T-303 浸出矿浆浓密机（CCD 逆流洗涤）—— 真实结构：
  // 中心给料井 / 絮凝剂加药 / 周边溢流堰 / 中心驱动耙架 / 底流锥 / 底流泵 / 走桥
  // T-303 CCD 逆流洗涤浓密机 φ18 m 高效深锥型 —— 真实结构：
  //  混凝土池底 / 钢池壁 / 深锥浓缩区 / 中心给料井 / 絮凝剂加药 / 周边溢流堰
  //  中心驱动 + 耙架（扭矩保护）/ 底流锥口 + 底流泵 / 走桥 + 栏杆
  'T-303': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var mm = this.makeMetal(0x777777);
    var concrete = this.makeConcrete();
    var steelWall = this.makePaint(0x4a6478);
    var handMat = this.makePaint(0xddaa00);

    var R  = 9.00;    // 池内半径（φ18 m）
    var WH = 4.00;    // 池壁高（池边水深 3.5 m + 超高 0.5 m）
    var BY = 0.60;    // 池底板上表面标高
    var CH = 2.60;    // 浓缩锥底高度（自底板向上收口）
    var WY = BY + WH; // 池壁顶标高 = 4.60 m

    // ① 混凝土池底板（φ18.6，厚 0.6 m，落地）
    var poolBase = this._cyl(R + 0.30, R + 0.30, 0.60, concrete, 48);
    poolBase.position.y = 0.30; g.add(poolBase);
    // 钢池壁（上薄下厚，带加强环）
    var wall = this._cyl(R, R - 0.15, WH, steelWall, 48);
    wall.position.y = BY + WH/2; g.add(wall);
    for(var w=0;w<3;w++){
      var ring = this._tor(R + 0.06, 0.07, mm);
      ring.rotation.x = Math.PI/2;
      ring.position.y = BY + 0.8 + w*1.35; g.add(ring);
    }
    // 深锥浓缩区（自池壁内收至中心底流口 φ0.9 m）
    var cone = this._cyl(R - 0.10, 0.45, CH, steelWall, 48);
    cone.position.y = BY + CH/2; g.add(cone);
    // 池壁顶走道（环形检修通道）
    var deck = this._tor(R + 0.55, 0.28, this.makePaint(0x8a8a8a));
    deck.rotation.x = Math.PI/2; deck.position.y = WY; g.add(deck);

    // ② 矿浆：下部密实层 + 上部澄清层（分界面 = 真实浓密机的泥水界面）
    var bed = this._cyl(R - 0.30, 0.90, 1.50, this.makeGlass(0x8a6a3a, 0.88), 44);
    bed.position.y = BY + 1.30; g.add(bed);
    var clear = this._cyl(R - 0.20, R - 0.20, 1.60, this.makeGlass(0x66aacc, 0.30), 44);
    clear.position.y = BY + 2.85; g.add(clear);

    // ③ 中心给料井（φ2.6 m，矿浆自中心给入，避免扰动沉降层）
    var feedWell = this._cyl(1.30, 1.30, 1.80, mm, 28);
    feedWell.position.y = WY + 0.30; g.add(feedWell);
    var fwRim = this._tor(1.30, 0.09, mm);
    fwRim.rotation.x = Math.PI/2; fwRim.position.y = WY + 1.20; g.add(fwRim);
    // 给料管（从池外跨池引至中心井，真实：架空敷设至中心）
    var feedPipe = this._cyl(0.22, 0.22, R + 2.2, mm, 14);
    feedPipe.rotation.z = Math.PI/2;
    feedPipe.position.set((R + 2.2)/2 - 1.2, WY + 1.35, 0); g.add(feedPipe);
    var fpCol = this._box(0.30, WY + 1.0, 0.30, mm);
    fpCol.position.set(R + 0.9, (WY + 1.0)/2, 0); g.add(fpCol);

    // ④ 絮凝剂加药（PAM 制备 + 计量泵 + 加药管，CCD 洗涤标配）
    var chemTank = this._cyl(0.90, 0.90, 1.80, this.makePaint(0x88aa55), 20);
    chemTank.position.set(R + 2.4, 0.90, 2.60); g.add(chemTank);
    var chemMotor = this._cyl(0.22, 0.22, 0.45, this.makePaint(0x2a4a6a), 14);
    chemMotor.position.set(R + 2.4, 1.95, 2.60); this._spin(chemMotor, 1400, 'y'); g.add(chemMotor);
    var chemPump = this._box(0.60, 0.45, 0.50, this.makePaint(0x2a4a6a));
    chemPump.position.set(R + 2.4, 0.55, 1.40); this._osc(chemPump, 0.04, 2.5, 'y'); g.add(chemPump);
    var chemPipe = this._cyl(0.08, 0.08, 3.20, this.makePaint(0x88aa55), 10);
    chemPipe.rotation.z = Math.PI/2;
    chemPipe.position.set(R + 0.9, 2.60, 2.00); g.add(chemPipe);

    // ⑤ 中心驱动装置（立式减速机 + 电机；浓密机关键检测 = 耙架扭矩）
    var driveCol = this._cyl(0.85, 0.85, 2.60, this.makePaint(0x456a88), 24);
    driveCol.position.y = WY + 2.30; g.add(driveCol);
    var driveHead = this._box(2.40, 1.00, 2.40, mm);
    driveHead.position.y = WY + 4.10; g.add(driveHead);
    var dMotor = this._cyl(0.42, 0.42, 1.20, this.makePaint(0x2a4a6a), 18);
    dMotor.position.set(1.30, WY + 4.90, 0); this._spin(dMotor, 1450, 'y'); g.add(dMotor);
    // 扭矩显示 + 提耙机构（压耙报警是浓密机最重要的保护）
    var torqueBox = this._box(0.60, 0.45, 0.16, this.makePaint(0xcc8833));
    torqueBox.position.set(-0.85, WY + 4.05, 1.25); g.add(torqueBox);
    var liftCyl = this._cyl(0.16, 0.16, 1.10, mm, 12);
    liftCyl.position.set(-1.30, WY + 4.60, 0); g.add(liftCyl);

    // ⑥ 耙架（双长臂 + 耙齿，0.12 r/min 慢速刮泥至中心底流口）
    var rake = new THREE.Group();
    var rakeShaft = this._cyl(0.28, 0.28, 3.20, mm, 16);
    rakeShaft.position.y = BY + 1.30; rake.add(rakeShaft);
    var hub = this._cyl(0.60, 0.60, 0.50, mm, 18);
    hub.position.y = BY + 2.90; rake.add(hub);
    for(var a=0;a<2;a++){
      var armLen = (R - 1.10) * 2;
      var arm = this._box(armLen, 0.22, 0.40, mm);
      arm.position.y = BY + 2.20; arm.rotation.y = a*Math.PI/2; rake.add(arm);
      // 桁架斜撑（长耙臂必须带拉杆）
      var rod = this._box(armLen*0.72, 0.08, 0.08, mm);
      rod.position.set(0, BY + 3.30, 0);
      rod.rotation.z = 0.32; rod.rotation.y = a*Math.PI/2; rake.add(rod);
      // 耙齿（斜置刮板）
      for(var i=0;i<9;i++){
        var t = -(R-1.45) + i*((R-1.45)*2/8);
        var tooth = this._box(0.85, 0.45, 0.12, this.makePaint(0x6a6a55));
        if(a===0){ tooth.position.set(t, BY + 1.85, 0.20); tooth.rotation.y = 0.6; }
        else     { tooth.position.set(0.20, BY + 1.85, t); tooth.rotation.y = 0.6; }
        rake.add(tooth);
      }
    }
    this._spin(rake, 0.12, 'y', 0, 0, 0);
    g.add(rake);

    // ⑦ 周边溢流堰 + 溢流槽（澄清液由此溢流去精滤/除杂）
    var weir = this._tor(R - 0.20, 0.10, mm);
    weir.rotation.x = Math.PI/2; weir.position.y = WY - 0.10; g.add(weir);
    var launder = this._tor(R + 0.22, 0.30, this.makePaint(0x3a5a70));
    launder.rotation.x = Math.PI/2; launder.position.y = WY - 0.30; g.add(launder);
    var overflow = this._cyl(0.26, 0.26, 2.00, mm, 14);
    overflow.rotation.x = Math.PI/2;
    overflow.position.set(0, WY - 0.90, R + 0.70); g.add(overflow);

    // ⑧ 底流锥口 + 底流泵（浓密底流送压滤机）
    var underPipe = this._cyl(0.28, 0.28, 4.20, mm, 14);
    underPipe.rotation.x = Math.PI/2;
    underPipe.position.set(0, 0.72, -2.10); g.add(underPipe);
    var underPump = this._cyl(0.55, 0.55, 0.90, this.makePaint(0xcc4444), 18);
    underPump.rotation.z = Math.PI/2;
    underPump.position.set(0, 0.72, -4.60); g.add(underPump);
    var pMotor = this._cyl(0.38, 0.38, 0.85, this.makePaint(0x2a4a6a), 16);
    pMotor.rotation.z = Math.PI/2;
    pMotor.position.set(1.30, 0.72, -4.60); this._spin(pMotor, 1470, 'x'); g.add(pMotor);
    this._osc(underPump, 0.03, 2.5, 'y');

    // ⑨ 走桥（池边 → 中心驱动，真实浓密机标配检修通道）
    var bridge = this._box(R + 0.60, 0.14, 1.30, mm);
    bridge.position.set((R + 0.60)/2, WY + 0.55, 0); g.add(bridge);
    for(var i=0;i<8;i++){
      var bx = 1.20 + i*(R - 1.60)/7;
      var post = this._cyl(0.05, 0.05, 1.10, mm, 6);
      post.position.set(bx, WY + 1.10, 0.58); g.add(post);
      var post2 = post.clone(); post2.position.z = -0.58; g.add(post2);
    }
    for(var h=0;h<2;h++){
      var handrail = this._cyl(0.05, 0.05, R + 0.60, mm, 6);
      handrail.rotation.z = Math.PI/2;
      handrail.position.set((R + 0.60)/2, WY + 1.55 + h*0.45, (h===0 ? 0.58 : -0.58));
      g.add(handrail);
    }
    // ⑩ 池边直梯（上走道用）
    var ladder = this._box(0.70, WY, 0.12, mm);
    ladder.position.set(R + 1.30, WY/2, 3.20); g.add(ladder);

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // ============================================================
  //  板框压滤机通用构建器 —— 严格按真实工业结构：
  //   两根主梁(工字梁) · 止推板(固定端,中心进料) · 压紧板(活动端)
  //   滤板/滤框交替组(各包滤布,滤框内为滤饼) · 板耳搭在主梁上
  //   中心进料管贯穿 · 明流水嘴 + 集液槽 · 液压站(油箱/油泵/油缸/油管)
  //   自动拉板小车 · 电控柜 · 操作平台与楼梯
  // ============================================================
  _filterPress: function(scene, eq, cfg){
    var g = new THREE.Group(); g.name = eq.tag;
    var mm  = this.makeMetal(0x707070);
    var pm  = this.makePaint(cfg.plateColor);
    var fm  = this.makePaint(cfg.frameColor);
    var concrete = this.makeConcrete();
    var clothMat = this.makePaint(0x3a4a5c);

    var N = cfg.plates;                  // 滤板+滤框总数
    var PW = cfg.plateW, PH = cfg.plateH;
    var pitch = cfg.pitch;               // 板中心距（含滤布厚度）
    var x0 = -((N-1)*pitch)/2;           // 板组居中
    var beamLen = cfg.beamLen;

    // ① 混凝土基础 + 钢底座
    var base = this._box(beamLen + 1.8, 0.35, 2.3, concrete);
    base.position.y = 0.175; g.add(base);

    // ② 四根支腿
    var legX = beamLen/2 - 0.35, legZ = 0.78;
    var legs = [[-legX,-legZ],[legX,-legZ],[-legX,legZ],[legX,legZ]];
    for(var L=0;L<4;L++){
      var leg = this._box(0.22, 1.05, 0.22, mm);
      leg.position.set(legs[L][0], 0.90, legs[L][1]); g.add(leg);
    }

    // ③ 两根主梁（沿 X 的工字梁：腹板 + 上下翼板）
    for(var b=0;b<2;b++){
      var bz = (b===0) ? -0.62 : 0.62;
      var web = this._box(beamLen, 0.26, 0.10, mm);
      web.position.set(0, 1.62, bz); g.add(web);
      var flg1 = this._box(beamLen, 0.06, 0.22, mm);
      flg1.position.set(0, 1.77, bz); g.add(flg1);
      var flg2 = this._box(beamLen, 0.06, 0.22, mm);
      flg2.position.set(0, 1.47, bz); g.add(flg2);
    }

    // ④ 止推板（固定端，带中心进料接管）
    var headX = -beamLen/2 + 0.18;
    var head = this._box(PW + 0.24, PH + 0.20, 0.16, this.makePaint(0x3d5a78));
    head.position.set(headX, 1.62, 0); g.add(head);
    var headBoss = this._cyl(0.13, 0.13, 0.32, mm, 16);
    headBoss.rotation.z = Math.PI/2;
    headBoss.position.set(headX - 0.24, 1.62, 0); g.add(headBoss);

    // ⑤ 压紧板（活动端，由油缸推动）
    var tailX = beamLen/2 - 0.58;
    var tail = this._box(PW + 0.24, PH + 0.20, 0.16, this.makePaint(0x3d5a78));
    tail.position.set(tailX, 1.62, 0); g.add(tail);

    // ⑥ 滤板 / 滤框 交替组（滤框内为滤饼，滤板两侧包滤布）
    for(var i=0;i<N;i++){
      var x = x0 + i*pitch;
      var isFrame = (i % 2 === 1);        // 奇数位 = 滤框（容纳滤饼）
      if (isFrame) {
        var frame = this._box(PW, PH, cfg.frameT, fm);
        frame.position.set(x, 1.62, 0); g.add(frame);
        var cake = this._box(PW*0.86, PH*0.86, cfg.frameT*0.70, this.makePaint(cfg.cakeColor));
        cake.position.set(x, 1.62, 0);
        cake.userData.isCake = true;      // 剖面模式下高亮滤饼
        g.add(cake);
      } else {
        var plate = this._box(PW, PH, cfg.plateT, pm);
        plate.position.set(x, 1.62, 0); g.add(plate);
        for(var s=-1;s<=1;s+=2){
          var cloth = this._box(PW*0.95, PH*0.93, 0.014, clothMat);
          cloth.position.set(x + s*(cfg.plateT/2 + 0.014), 1.62, 0);
          g.add(cloth);
        }
      }
      // 板耳（搭在主梁上的支撑耳，真实压滤机靠它悬挂滤板）
      for(var e=-1;e<=1;e+=2){
        var ear = this._box(0.17, 0.07, 0.17, mm);
        ear.position.set(x, 1.88, e*0.62); g.add(ear);
      }
      // 明流水嘴（每块板下方出液龙头）
      var cock = this._cyl(0.028, 0.028, 0.15, this.makeMetal(0xb0b8c0), 8);
      cock.position.set(x, 1.02, PW/2 + 0.22); g.add(cock);
    }

    // ⑦ 中心进料管（贯穿全部滤板中心孔）+ 进料法兰
    var feed = this._cyl(0.085, 0.085, (N-1)*pitch + 1.0, mm, 14);
    feed.rotation.z = Math.PI/2;
    feed.position.set(0, 1.62, 0); g.add(feed);
    var feedFl = this._cyl(0.18, 0.18, 0.05, mm, 16);
    feedFl.rotation.z = Math.PI/2;
    feedFl.position.set(headX - 0.45, 1.62, 0); g.add(feedFl);

    // ⑧ 明流集液槽 + 滤液出口管
    var trough = this._box((N-1)*pitch + 1.1, 0.30, 0.34, this.makePaint(0x556070));
    trough.position.set(0, 0.90, PW/2 + 0.22); g.add(trough);
    var outPipe = this._cyl(0.10, 0.10, 1.3, mm, 12);
    outPipe.rotation.z = Math.PI/2;
    outPipe.position.set(beamLen/2 - 0.15, 0.90, PW/2 + 0.22); g.add(outPipe);

    // ⑨ 液压站：油箱 + 油泵电机 + 油缸 + 高压油管 + 压力表
    var hyX = beamLen/2 + 1.05;
    var tank = this._box(1.10, 0.80, 0.74, this.makePaint(0x2f6a4a));
    tank.position.set(hyX, 0.75, 0); g.add(tank);
    var pump = this._cyl(0.17, 0.17, 0.44, this.makePaint(0x2a4a6a), 14);
    pump.rotation.z = Math.PI/2;
    pump.position.set(hyX, 1.30, 0); g.add(pump);
    this._spin(pump, 1450, 'x');
    var cyl = this._cyl(0.24, 0.24, 0.95, mm, 18);
    cyl.rotation.z = Math.PI/2;
    cyl.position.set(tailX + 0.76, 1.62, 0); g.add(cyl);
    var rod = this._cyl(0.11, 0.11, 0.58, this.makeMetal(0xc8ccd0), 12);
    rod.rotation.z = Math.PI/2;
    rod.position.set(tailX + 0.31, 1.62, 0); g.add(rod);
    var hose = this._cyl(0.045, 0.045, 1.6, this.makePaint(0x222222), 8);
    hose.rotation.z = Math.PI/2;
    hose.position.set(hyX - 0.65, 1.36, 0.32); g.add(hose);
    var gage = this._cyl(0.10, 0.10, 0.05, this.makeMetal(0xcfd6dd), 16);
    gage.rotation.x = Math.PI/2;
    gage.position.set(hyX, 1.66, 0.42); g.add(gage);

    // ⑩ 自动拉板小车（沿主梁往复，逐块拉开滤板卸饼）
    var cart = new THREE.Group();
    var cartBody = this._box(0.44, 0.26, 1.36, this.makePaint(0xcc7722));
    cartBody.position.y = 0; cart.add(cartBody);
    var cartArm = this._box(0.10, 0.46, 0.10, mm);
    cartArm.position.set(0, -0.32, 0); cart.add(cartArm);
    cart.position.set(x0, 2.16, 0);
    this._osc(cart, (N-1)*pitch/2 - 0.25, 0.10, 'x');
    g.add(cart);

    // ⑪ 电控柜
    var cab = this._box(0.64, 1.38, 0.44, this.makePaint(0x3a4a5a));
    cab.position.set(-beamLen/2 - 0.95, 0.74, 0.95); g.add(cab);
    var cabScreen = this._box(0.44, 0.32, 0.03, this.makePaint(0x2277aa));
    cabScreen.position.set(-beamLen/2 - 0.95, 1.18, 0.68); g.add(cabScreen);

    // ⑫ 操作平台 + 楼梯
    var plat = this._box(beamLen + 0.9, 0.10, 1.10, this.makePaint(0x5a6470));
    plat.position.set(0, 2.38, -1.30); g.add(plat);
    for(var st=0;st<6;st++){
      var step = this._box(0.78, 0.07, 0.28, this.makePaint(0x5a6470));
      step.position.set(beamLen/2 + 0.30, 0.35 + st*0.38, -1.30); g.add(step);
    }
    var prail = this._cyl(0.04, 0.04, beamLen + 0.9, mm, 6);
    prail.rotation.z = Math.PI/2;
    prail.position.set(0, 3.20, -1.78); g.add(prail);

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // P-303 尾渣板框压滤机（浸出尾渣脱水，800×800 板，26 板）
  'P-303': function(scene, eq){
    return this._filterPress(scene, eq, {
      plates: 26, plateW: 0.82, plateH: 0.95,
      plateT: 0.055, frameT: 0.045, pitch: 0.115, beamLen: 5.60,
      plateColor: 0x4a6a8a, frameColor: 0x7a6a4a, cakeColor: 0x6a5540
    });
  },

  // F-304 真空带式过滤机
  'F-304': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a7a9a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(4.5, 0.3, 2.0, concrete);
    base.position.y = 0.15; g.add(base);
    // 主箱体（卧式长条）
    var body = this._box(4.0, 1.0, 1.5, pm, 24);
    body.position.y = 1.0; g.add(body);
    // 上皮带（可见部分）
    for(var i=0;i<8;i++){
      var belt = this._box(0.45, 0.05, 1.4, mm);
      belt.position.set(-1.8 + i*0.48, 1.55, 0);
      g.add(belt);
    }
    // 端轮
    for(var r=0;r<2;r++){
      var wheel = this._cyl(0.4, 0.4, 1.5, mm, 20);
      wheel.rotation.x = Math.PI/2;
      wheel.position.set(r===0?-2.0:2.0, 1.0, 0);
      g.add(wheel);
    }
    // 滤布（白色）
    var cloth = this._box(3.8, 0.03, 1.3, this.makePaint(0xeeeeee));
    cloth.position.y = 1.58; g.add(cloth);
    // 进料斗（顶部）
    var hopper = this._cyl(0.5, 0.2, 0.6, mm, 12);
    hopper.rotation.x = Math.PI;
    hopper.position.set(-1.0, 1.9, 0); g.add(hopper);
    // 真空盒
    var vacuumBox = this._box(1.0, 0.8, 1.4, this.makePaint(0x445566));
    vacuumBox.position.set(0.5, 0.6, 0); g.add(vacuumBox);
    // 驱动电机
    var motor = this._cyl(0.2, 0.2, 0.5, this.makePaint(0x2a4a6a), 14);
    motor.rotation.x = Math.PI/2;
    motor.position.set(2.3, 1.0, 0.8); g.add(motor);

    
    // —— 运转机构（补）：过滤进料泵（精密过滤靠泵压推动）
    var fp = this._cyl(0.24, 0.24, 0.52, this.makePaint(0xcc4444), 16);
    fp.rotation.z = Math.PI/2;
    fp.position.set(-1.55, 0.50, 0.75); this._spin(fp, 1470, 'x'); g.add(fp);
    var fpm = this._cyl(0.19, 0.19, 0.56, this.makePaint(0x2a4a6a), 14);
    fpm.rotation.z = Math.PI/2;
    fpm.position.set(-1.55, 0.50, 1.38); this._spin(fpm, 1470, 'x'); g.add(fpm);
g.scale.set(0.900, 1.200, 1.200);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // E-401 萃取-反萃混合澄清槽（5 联器，核心设备）
  'E-401': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x7a5aaa);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 长条形基础
    var base = this._box(9.5, 0.4, 3.6, concrete);
    base.position.y = 0.2; g.add(base);

    // 5 个串联澄清槽（单级直径 1.4m，真实工业澄清槽尺度）
    for(var i=0;i<5;i++){
      var cx = -3.8 + i*1.9;
      // 槽体（圆柱形，高 3.0m）
      var clarifier = this._cyl(0.7, 0.7, 3.0, pm, 24);
      clarifier.position.set(cx, 1.95, 0);
      g.add(clarifier);
      // 槽盖
      var lid = this._cyl(0.72, 0.72, 0.12, mm, 24);
      lid.position.set(cx, 3.5, 0); g.add(lid);
      // 双层液面
      // 水相（下层，蓝绿色）
      var aqueous = this._cyl(0.65, 0.65, 0.7, this.makeGlass(0x4a8a9a, 0.45), 20);
      aqueous.position.set(cx, 1.15, 0); g.add(aqueous);
      // 有机相（上层，棕红色）
      var organic = this._cyl(0.65, 0.65, 0.8, this.makeGlass(0xaa5533, 0.45), 20);
      organic.position.set(cx, 2.25, 0); g.add(organic);
      // 搅拌电机（每槽一个小电机）
      var motor = this._cyl(0.15, 0.15, 0.5, this.makePaint(0x2a4a6a), 12);
      motor.position.set(cx, 3.85, 0); g.add(motor);
      // 搅拌器（混合室搅拌桨，使两相充分接触后进入澄清室分相）
      var mixerGrp = new THREE.Group();
      mixerGrp.position.set(cx, 0, 0);
      var shaftE = this._cyl(0.06, 0.06, 1.8, mm, 8);
      shaftE.position.y = 2.6; mixerGrp.add(shaftE);
      var impE = this._cyl(0.26, 0.26, 0.06, mm, 14);
      impE.position.y = 1.80; mixerGrp.add(impE);
      for(var b=0;b<4;b++){
        var ib = this._box(0.24, 0.14, 0.05, mm);
        ib.position.y = 1.80; ib.rotation.y = b*Math.PI/2; mixerGrp.add(ib);
      }
      this._spin(mixerGrp, 180, 'y');
      g.add(mixerGrp);
      // 混合器（槽间连接短管）
      var mixer = this._cyl(0.14, 0.14, 0.5, mm, 8);
      mixer.rotation.z = Math.PI/2;
      mixer.position.set(cx + (i<4?0.95:0), 3.4, 0);
      if(i<4) g.add(mixer);
    }

    // 进料/出料管
    var feed = this._cyl(0.15, 0.15, 1.2, mm, 10);
    feed.rotation.z = Math.PI/2;
    feed.position.set(-4.8, 2.4, 0); g.add(feed);
    var product = this._cyl(0.15, 0.15, 1.2, mm, 10);
    product.rotation.z = Math.PI/2;
    product.position.set(4.8, 2.4, 0); g.add(product);

    g.scale.set(1.670, 0.630, 1.000);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // X-502 离子交换柱
  'X-502': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x8a5a4a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(2.5, 0.3, 1.5, concrete);
    base.position.y = 0.15; g.add(base);
    // 柱体（立式圆筒，高3m）
    var col = this._cyl(0.5, 0.5, 3.0, pm, 24);
    col.position.y = 1.8; g.add(col);
    // 柱顶封头
    var topHead = this._sph(0.5, this.makeGlass(0x88aabb, 0.5), 24);
    topHead.scale.y = 0.5;
    topHead.position.y = 3.3; g.add(topHead);
    // 柱底封头
    var botHead = this._sph(0.5, pm, 24);
    botHead.scale.y = 0.5;
    botHead.position.y = 0.3; g.add(botHead);
    // 支腿（4 个）
    for(var i=0;i<4;i++){
      var a = i*Math.PI/2 + Math.PI/4;
      var leg = this._box(0.1, 1.2, 0.1, mm);
      leg.position.set(Math.cos(a)*0.6, 0.6, Math.sin(a)*0.6);
      leg.rotation.z = Math.cos(a)*0.3;
      leg.rotation.x = -Math.sin(a)*0.3;
      g.add(leg);
    }
    // 进出口管
    var inlet = this._cyl(0.12, 0.12, 0.8, mm, 10);
    inlet.rotation.z = Math.PI/2;
    inlet.position.set(0.9, 2.8, 0); g.add(inlet);
    var outlet = this._cyl(0.12, 0.12, 0.8, mm, 10);
    outlet.rotation.z = Math.PI/2;
    outlet.position.set(0.9, 0.5, 0); g.add(outlet);
    // 树脂层（半透明可见）
    var resin = this._cyl(0.45, 0.45, 2.0, this.makeGlass(0xaa8855, 0.5), 20);
    resin.position.y = 1.8; g.add(resin);

    
    // —— 运转机构（补）：吸附进液泵（离子交换靠泵连续通液）
    var ixPump = this._cyl(0.24, 0.24, 0.52, this.makePaint(0xcc4444), 16);
    ixPump.rotation.z = Math.PI/2;
    ixPump.position.set(0, 0.52, 1.10); this._spin(ixPump, 1470, 'x'); g.add(ixPump);
    var ixMot = this._cyl(0.19, 0.19, 0.56, this.makePaint(0x2a4a6a), 14);
    ixMot.rotation.z = Math.PI/2;
    ixMot.position.set(0, 0.52, 1.72); this._spin(ixMot, 1470, 'x'); g.add(ixMot);
g.scale.set(3.080, 1.670, 2.000);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // P-501 沉钒反应器（核心设备）
  'P-501': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0xaa8a3a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(4.0, 0.4, 3.5, concrete);
    base.position.y = 0.2; g.add(base);
    // 反应罐（立式）
    var tank = this._cyl(1.5, 1.5, 2.5, pm, 32);
    tank.position.y = 1.65; g.add(tank);
    // 罐盖
    var lid = this._cyl(1.55, 1.55, 0.15, mm, 32);
    lid.position.y = 3.0; g.add(lid);
    // 搅拌电机
    var motor = this._cyl(0.25, 0.25, 0.8, this.makePaint(0x2a4a6a), 16);
    motor.position.y = 3.5; g.add(motor);
    // 搅拌轴 + 叶轮
    var shaft = this._cyl(0.08, 0.08, 2.0, mm, 8);
    shaft.position.y = 2.0; g.add(shaft);
    var impeller = this._cyl(0.5, 0.5, 0.05, mm, 16);
    impeller.position.y = 1.0; g.add(impeller);
    for(var i=0;i<4;i++){
      var blade = this._box(0.5, 0.2, 0.06, mm);
      blade.position.y = 1.0; blade.rotation.y = i*Math.PI/2;
      g.add(blade);
    }
    // 沉淀物（罐底浅黄色）
    var sediment = this._cyl(1.4, 1.4, 0.3, this.makeGlass(0xddcc88, 0.6), 32);
    sediment.position.y = 0.55; g.add(sediment);
    // 加铵管（顶部斜入）
    var feedPipe = this._cyl(0.15, 0.15, 1.5, mm, 12);
    feedPipe.rotation.z = 0.4;
    feedPipe.position.set(1.8, 2.8, 0); g.add(feedPipe);
    // 出料口（底部）
    var drain = this._cyl(0.2, 0.2, 0.6, mm, 12);
    drain.rotation.x = Math.PI/2;
    drain.position.set(0, 0.5, 2.0); g.add(drain);
    // pH 计（侧面探头）
    var phProbe = this._cyl(0.05, 0.05, 0.8, this.makePaint(0x22aacc), 8);
    phProbe.position.set(1.5, 1.5, 0.5); g.add(phProbe);

    
    // —— 运转机构（补）：沉钒罐顶置双层搅拌（52 r/min，保证 APV 结晶均匀）
    var ag501 = new THREE.Group();
    var sh501 = this._cyl(0.08, 0.08, 4.20, mm, 10);
    sh501.position.y = 2.60; ag501.add(sh501);
    for(var k5=0; k5<2; k5++){
      var y5 = (k5===0 ? 1.20 : 2.40);
      var disc5 = this._cyl(0.90, 0.90, 0.08, mm, 18);
      disc5.position.y = y5; ag501.add(disc5);
      for(var b5=0; b5<4; b5++){
        var bl5 = this._box(0.70, 0.30, 0.07, mm);
        bl5.position.set(Math.cos(b5*Math.PI/2)*0.62, y5, Math.sin(b5*Math.PI/2)*0.62);
        bl5.rotation.y = -b5*Math.PI/2;
        ag501.add(bl5);
      }
    }
    this._spin(ag501, 52, 'y');
    g.add(ag501);
g.scale.set(1.290, 1.790, 1.270);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // T-502 钒盐浓密机
  'T-502': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a8aaa);
    var mm = this.makeMetal(0x777777);
    var concrete = this.makeConcrete();

    // 大圆池（直径 8m，比 T-106 小一号）
    var pool = this._cyl(4.0, 4.0, 0.5, concrete, 32);
    pool.position.y = 0.25; g.add(pool);
    var wall = this._cyl(4.1, 4.1, 1.6, this.makePaint(0x445566), 32);
    wall.position.y = 1.3; g.add(wall);
    // 矿浆液面
    var slurry = this._cyl(3.8, 3.8, 0.2, this.makeGlass(0xccbb77, 0.55), 32);
    slurry.position.y = 2.1; g.add(slurry);
    // ---- 耙架回转组（0.35 r/min）----
    var rake2 = new THREE.Group();
    this._spin(rake2, 0.35, 'y');
    g.add(rake2);
    var raft1 = this._box(7.5, 0.12, 0.28, mm);
    raft1.position.y = 2.3; rake2.add(raft1);
    var raft2 = raft1.clone(); raft2.rotation.y = Math.PI/2; rake2.add(raft2);
    for(var t=0;t<7;t++){
      var tt = -3.3 + t*0.95;
      var tooth2 = this._box(0.55, 0.28, 0.10, this.makePaint(0x6a6a55));
      tooth2.position.set(tt, 2.10, 0);
      tooth2.rotation.y = 0.6; rake2.add(tooth2);
    }
    // 中心驱动（高 2.8m）
    var drive = this._cyl(0.45, 0.45, 1.2, this.makePaint(0x2a4a6a), 16);
    drive.position.y = 3.1; rake2.add(drive);
    var driveTop = this._box(1.0, 0.5, 1.0, mm);
    driveTop.position.y = 3.9; rake2.add(driveTop);
    // 溢流周边槽
    var weir = this._tor(3.95, 0.08, mm);
    weir.rotation.x = Math.PI/2;
    weir.position.y = 2.35; g.add(weir);

    g.scale.set(1.460, 1.070, 1.460);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // P-503 钒盐板框压滤机
  // P-503 钒盐板框压滤机（偏钒酸铵滤饼脱水，630×630 板，18 板）
  'P-503': function(scene, eq){
    return this._filterPress(scene, eq, {
      plates: 18, plateW: 0.64, plateH: 0.74,
      plateT: 0.050, frameT: 0.040, pitch: 0.105, beamLen: 4.20,
      plateColor: 0x5a7a9a, frameColor: 0x8a7a5a, cakeColor: 0xd8c890
    });
  },

  // K-601 APV 煅烧回转窑 φ1.6×26 m（间接加热，多钒酸铵分解制 V₂O₅）
  // 真实结构：筒体+轮带托轮+齿圈传动 / 窑头进料螺旋 / 窑尾出料+氨气引出 / 加热炉膛 / 烟囱
  'K-601': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x8a4a2a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();
    var glow = this.makeGlow(0xff4400);
    var refr = this.makePaint(0x9a7a60);

    var KL = 26.0;     // 筒体长度
    var KR = 0.80;     // 筒体半径（内径 1.6 m）
    var AY = 3.10;     // 窑中心线标高
    var TILT = 0.025;  // 斜度 2.5 %
    var tireR = 1.02, rolR = 0.62;
    var CD = tireR + rolR;
    var supX = [-8.5, 8.5];            // 2 档支承

    // 基础
    for(var r=0;r<2;r++){
      var fnd = this._box(31.0, 0.80, 1.20, concrete);
      fnd.position.set(0, 0.40, (r*2-1)*CD*0.5); g.add(fnd);
    }
    // 窑体：tilt → spin
    var tilt = new THREE.Group();
    tilt.rotation.z = -TILT;
    g.add(tilt);
    var spin = new THREE.Group();
    this._spin(spin, 1.2, 'x', 0, AY, 0);      // 窑速 1.2 r/min
    tilt.add(spin);
    // 托轮 + 轮带
    for(var i=0;i<supX.length;i++){
      var xc = supX[i];
      var cyy = AY - xc*TILT;
      for(var r=0;r<2;r++){
        var sz = (r*2-1)*CD*0.5;
        var rol = this._cyl(rolR, rolR, 0.80, mm, 18);
        rol.rotation.z = Math.PI/2;
        rol.position.set(xc, cyy - CD*0.866, sz);
        this._spin(rol, 2.6, 'x'); g.add(rol);
        var brgH = Math.max(cyy - CD*0.866 - rolR - 0.80, 0.28);
        var brg = this._box(0.90, brgH, 0.80, this.makePaint(0x445566));
        brg.position.set(xc, 0.80 + brgH/2, sz); g.add(brg);
      }
      var tire = this._tor(tireR, 0.10, this.makePaint(0x6b4a33));
      tire.rotation.y = Math.PI/2;
      tire.position.set(xc, AY, 0); spin.add(tire);
    }
    // 筒体 + 内衬 + 物料
    var shell = this._cyl(KR, KR, KL, pm, 32);
    shell.rotation.z = Math.PI/2; shell.position.set(0, AY, 0); spin.add(shell);
    var lining = this._cyl(KR-0.08, KR-0.08, KL-0.2, refr, 28);
    lining.rotation.z = Math.PI/2; lining.position.set(0, AY, 0); spin.add(lining);
    var bed = this._cyl(KR*0.55, KR*0.55, KL*0.92, this.makePaint(0xcc8844), 20);
    bed.rotation.z = Math.PI/2; bed.position.set(0, AY - KR*0.45, 0); spin.add(bed);
    // 大齿圈 + 传动
    var gearRing = this._cyl(1.22, 1.22, 0.32, this.makePaint(0xaa8833), 32);
    gearRing.rotation.z = Math.PI/2; gearRing.position.set(-3.0, AY, 0); spin.add(gearRing);
    var pin = this._cyl(0.40, 0.40, 0.32, this.makePaint(0xcc9933), 18);
    pin.rotation.z = Math.PI/2; pin.position.set(-3.0, AY - 1.62, 0); this._spin(pin, 3.9, 'x'); g.add(pin);
    var gb = this._box(1.20, 1.00, 1.10, this.makePaint(0x3a5a7a));
    gb.position.set(-3.0, 1.30, 2.20); g.add(gb);
    var mot = this._cyl(0.38, 0.38, 1.30, this.makePaint(0x2a4a6a), 18);
    mot.rotation.z = Math.PI/2; mot.position.set(-3.0, 1.20, 3.50); this._spin(mot, 985, 'x'); g.add(mot);

    // 窑头（-X）：进料螺旋 + 窑头罩
    var hoodIn = this._box(2.20, 2.40, 2.20, this.makePaint(0x4a4a52));
    hoodIn.position.set(-(KL/2+2.30), AY, 0); g.add(hoodIn);
    var screw = this._cyl(0.22, 0.22, 2.80, mm, 14);
    screw.rotation.z = Math.PI/2;
    screw.position.set(-(KL/2+4.00), AY, 0); this._spin(screw, 65, 'x'); g.add(screw);
    var hopper = this._cyl(0.70, 0.30, 1.20, this.makePaint(0x446688), 18);
    hopper.position.set(-(KL/2+4.60), AY + 1.20, 0); g.add(hopper);
    // 窑尾（+X）：出料罩 + 出料溜槽 + NH₃ 引出管（去氨回收塔）
    var hoodOut = this._box(2.20, 2.40, 2.20, this.makePaint(0x4a4a52));
    hoodOut.position.set(KL/2+2.30, AY, 0); g.add(hoodOut);
    var outChute = this._box(0.80, 1.80, 0.80, mm);
    outChute.position.set(KL/2+2.60, AY - 1.90, 0); g.add(outChute);
    var nh3 = this._cyl(0.22, 0.22, 3.20, this.makePaint(0x88cc44), 12);
    nh3.position.set(KL/2+2.30, AY + 2.40, 0); g.add(nh3);
    // 加热炉膛（筒体下方，燃气烧嘴分段加热，带观火孔）
    var chamber = this._box(KL - 3.0, 1.60, 3.40, this.makePaint(0x5a4a44));
    chamber.position.set(0, 0.95, 0); g.add(chamber);
    for(var b=0;b<5;b++){
      var burn = this._cyl(0.14, 0.09, 0.70, mm, 10);
      burn.rotation.x = Math.PI/2;
      burn.position.set(-KL/2 + 3.0 + b*5.0, 1.10, 1.85); g.add(burn);
      var fl = this._sph(0.20, glow);
      fl.position.set(-KL/2 + 3.0 + b*5.0, 1.10, 1.55); g.add(fl);
      var peek = this._cyl(0.09, 0.09, 0.05, this.makeGlass(0xffcc88, 0.6), 8);
      peek.rotation.x = Math.PI/2;
      peek.position.set(-KL/2 + 4.5 + b*5.0, 1.30, -1.75); g.add(peek);
    }
    // 检修平台 + 栏杆
    var plat = this._box(KL, 0.10, 1.20, this.makePaint(0x8a8a8a));
    plat.position.set(0, AY + 1.60, -2.60); g.add(plat);
    for(var h=0;h<2;h++){
      var rail = this._box(KL, 0.06, 0.06, this.makePaint(0xddaa00));
      rail.position.set(0, AY + 2.10 + h*0.50, -3.10); g.add(rail);
    }

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // V-602 成品振动筛
  'V-602': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a8a5a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(3.5, 0.4, 2.5, concrete);
    base.position.y = 0.2; g.add(base);
    // ---- 振动组：筛箱在弹簧上高频小幅振动（振幅 1.8 mm，实测值）----
    var vib = new THREE.Group();
    this._osc(vib, 0.018, 11, 'x');
    g.add(vib);

    // 筛箱（梯形，安装倾角 -0.15 rad）
    var screen = this._box(2.5, 1.0, 1.8, pm, 24);
    screen.position.y = 1.5;
    screen.rotation.z = -0.15;
    vib.add(screen);
    // 筛网面
    var mesh = this._box(2.3, 0.05, 1.6, this.makePaint(0xaaaaaa));
    mesh.position.y = 2.05;
    mesh.rotation.z = -0.15;
    vib.add(mesh);
    // 筛面上的物料层（随振动向排料端移动）
    var bed = this._box(1.9, 0.10, 1.4, this.makePaint(0xc8a05a));
    bed.position.set(0.1, 2.14, 0);
    bed.rotation.z = -0.15;
    vib.add(bed);
    // 振动电机（2 个，对置同步反向旋转产生直线振动）
    for(var i=0;i<2;i++){
      var motor = this._cyl(0.15, 0.15, 0.5, this.makePaint(0x2a4a6a), 14);
      motor.rotation.z = Math.PI/2;
      motor.position.set(-0.8 + i*1.6, 0.8, 0.8);
      vib.add(motor);
    }
    // 弹簧减震（4 个）
    for(var i=0;i<4;i++){
      var spring = this._cyl(0.06, 0.06, 0.5, this.makeMetal(0xaaaaaa), 8);
      spring.position.set(-1.2 + i*0.8, 0.6, i%2*1.6 - 0.8);
      g.add(spring);
    }
    // 进料斗
    var hopper = this._cyl(0.5, 0.2, 0.7, mm, 12);
    hopper.rotation.x = Math.PI;
    hopper.position.set(-0.5, 2.6, 0); g.add(hopper);
    // 排料溜槽
    var chute = this._box(0.5, 0.6, 0.8, mm);
    chute.position.set(1.3, 0.8, 1.0);
    chute.rotation.z = -0.3;
    g.add(chute);

    g.scale.set(0.460, 0.620, 0.590);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // W-603 自动包装机
  'W-603': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a6a8a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(3.0, 0.3, 2.0, concrete);
    base.position.y = 0.15; g.add(base);
    // 主机箱
    var body = this._box(2.0, 2.5, 1.5, pm, 24);
    body.position.y = 1.55; g.add(body);
    // 顶部料斗
    var hopper = this._cyl(0.4, 0.15, 0.6, mm, 12);
    hopper.rotation.x = Math.PI;
    hopper.position.y = 3.1; g.add(hopper);
    // 称重传感器（侧面）
    var sensor = this._box(0.15, 0.3, 0.15, this.makePaint(0x22aacc));
    sensor.position.set(1.1, 1.2, 0); g.add(sensor);
    // 出料口
    var out = this._box(0.5, 0.4, 0.5, mm);
    out.position.set(0, 0.5, 0.9); g.add(out);
    // 输送带
    var belt = this._box(2.0, 0.05, 0.8, this.makePaint(0x222222));
    belt.position.set(0, 0.8, 1.3); g.add(belt);
    // 控制箱
    var ctrl = this._box(0.3, 0.4, 0.2, this.makePaint(0x334455));
    ctrl.position.set(1.15, 2.2, 0.5); g.add(ctrl);

    
    // —— 运转机构（补）：螺旋给料器（称重包装的下料执行机构）
    var screw6 = this._cyl(0.12, 0.12, 1.20, mm, 12);
    screw6.position.set(0, 1.85, 0);
    this._spin(screw6, 95, 'y'); g.add(screw6);
    var bagOsc = new THREE.Group();
    var bag = this._box(0.42, 0.55, 0.30, this.makePaint(0xddccaa));
    bag.position.set(0, 1.05, 0.55); bagOsc.add(bag);
    this._osc(bagOsc, 0.06, 0.85, 'y');
    g.add(bagOsc);
g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // Y-604 成品堆码打包区
  'Y-604': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x6a8a5a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 地面
    var floor = this._box(4.0, 0.1, 3.0, concrete);
    floor.position.y = 0.05; g.add(floor);
    // 码垛机（小型龙门架）
    var frame1 = this._box(0.15, 2.5, 0.15, mm);
    frame1.position.set(-1.5, 1.25, 0); g.add(frame1);
    var frame2 = frame1.clone(); frame2.position.x = 1.5; g.add(frame2);
    var frame3 = this._box(3.15, 0.15, 0.15, mm);
    frame3.position.set(0, 2.5, 0); g.add(frame3);
    // 堆垛平台
    var platform = this._box(2.0, 0.1, 1.5, mm);
    platform.position.y = 1.0; g.add(platform);
    // 已堆码的袋子（3 层）
    for(var layer=0;layer<3;layer++){
      for(var row=0;row<3;row++){
        for(var col=0;col<2;col++){
          var bag = this._box(0.5, 0.25, 0.35, pm);
          bag.position.set(-0.6 + col*0.6, 1.1 + layer*0.28, -0.4 + row*0.4);
          g.add(bag);
        }
      }
    }
    // 打包带（白色横线）
    for(var layer=0;layer<3;layer++){
      var band = this._box(1.4, 0.02, 1.0, this.makePaint(0xeeeeee));
      band.position.set(0, 1.22 + layer*0.28, 0);
      g.add(band);
    }

    
    // —— 运转机构（补）：码垛机器人手臂（往复抓取码垛）
    var arm6 = new THREE.Group();
    var boom = this._box(1.90, 0.16, 0.16, this.makePaint(0xddaa00));
    boom.position.set(0.60, 2.40, 0); arm6.add(boom);
    var grip = this._box(0.36, 0.36, 0.36, mm);
    grip.position.set(1.50, 2.05, 0); arm6.add(grip);
    this._osc(arm6, [0.55, 0.28, 0], 0.30, 'x');
    g.add(arm6);
g.scale.set(3.000, 2.310, 2.670);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // A-701 烟气洗涤塔（核心设备）
  'A-701': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a8a7a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(5.0, 0.5, 5.0, concrete);
    base.position.y = 0.25; g.add(base);
    // 塔体（立式圆筒，直径 3m、高 12m，真实洗涤塔尺度）
    var tower = this._cyl(1.5, 1.5, 12.0, pm, 32);
    tower.position.y = 6.5; g.add(tower);
    // 塔顶
    var topCap = this._cyl(1.6, 1.6, 0.3, mm, 32);
    topCap.position.y = 12.65; g.add(topCap);
    // 环形加强带（6 道）
    for(var i=0;i<6;i++){
      var band = this._tor(1.52, 0.05, mm);
      band.rotation.x = Math.PI/2;
      band.position.y = 2.0 + i*1.8;
      g.add(band);
    }
    // 内部液体（半透明）
    var liquid = this._cyl(1.4, 1.4, 0.8, this.makeGlass(0x66bb99, 0.4), 28);
    liquid.position.y = 1.5; g.add(liquid);
    // 喷淋管（顶部）
    var spray = this._cyl(0.1, 0.1, 0.8, mm, 8);
    spray.position.y = 11.5; g.add(spray);
    // 填料层（4 层可见）
    for(var i=0;i<4;i++){
      var packing = this._tor(1.3, 0.12, this.makePaint(0x6aaa8a));
      packing.rotation.x = Math.PI/2;
      packing.position.y = 3.0 + i*1.6;
      g.add(packing);
    }
    // 进气管（侧向）
    var inlet = this._cyl(0.3, 0.3, 1.2, mm, 12);
    inlet.rotation.z = Math.PI/2;
    inlet.position.set(2.2, 1.5, 0); g.add(inlet);
    // 出气口（顶部）
    var outlet = this._cyl(0.35, 0.35, 1.0, mm, 12);
    outlet.position.y = 13.3; g.add(outlet);
    // 检修平台（3 级环形）
    for(var p=0;p<3;p++){
      var platform = this._tor(1.8, 0.1, mm);
      platform.rotation.x = Math.PI/2;
      platform.position.y = 3.5 + p*3.0; g.add(platform);
    }
    // 爬梯（侧面）
    for(var i=0;i<16;i++){
      var rung = this._cyl(0.03, 0.03, 0.4, mm, 6);
      rung.rotation.z = Math.PI/2;
      rung.position.set(1.7, 0.5 + i*0.75, 0.35);
      g.add(rung);
    }
    var rail1 = this._cyl(0.04, 0.04, 12.0, mm, 6);
    rail1.position.set(1.6, 6.0, 0.35); g.add(rail1);
    var rail2 = rail1.clone(); rail2.position.x = 1.8; g.add(rail2);

    
    // —— 运转机构（补）：脱硫循环泵（塔釜浆液→喷淋层）
    for(var cp=0; cp<2; cp++){
      var circPump = this._cyl(0.30, 0.30, 0.62, this.makePaint(0xcc4444), 16);
      circPump.rotation.z = Math.PI/2;
      circPump.position.set(2.55, 0.62, (cp===0 ? 1.30 : 2.20));
      this._spin(circPump, 1470, 'x'); g.add(circPump);
      var cpMot = this._cyl(0.24, 0.24, 0.66, this.makePaint(0x2a4a6a), 14);
      cpMot.rotation.z = Math.PI/2;
      cpMot.position.set(3.40, 0.62, (cp===0 ? 1.30 : 2.20));
      this._spin(cpMot, 1470, 'x'); g.add(cpMot);
    }
g.scale.set(0.790, 1.230, 0.790);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // A-702 氨回收塔
  'A-702': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a7aaa);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(3.5, 0.3, 3.5, concrete);
    base.position.y = 0.15; g.add(base);
    // 塔体
    var tower = this._cyl(1.2, 1.2, 4.5, pm, 28);
    tower.position.y = 2.55; g.add(tower);
    // 塔顶
    var topCap = this._cyl(1.25, 1.25, 0.15, mm, 28);
    topCap.position.y = 4.9; g.add(topCap);
    // 环形加强带
    for(var i=0;i<3;i++){
      var band = this._tor(1.22, 0.04, mm);
      band.rotation.x = Math.PI/2;
      band.position.y = 1.5 + i*1.2;
      g.add(band);
    }
    // 内部液体
    var liquid = this._cyl(1.1, 1.1, 0.4, this.makeGlass(0x88ccbb, 0.4), 24);
    liquid.position.y = 0.8; g.add(liquid);
    // 填料层
    for(var i=0;i<3;i++){
      var packing = this._tor(1.0, 0.08, this.makePaint(0x5a9a8a));
      packing.rotation.x = Math.PI/2;
      packing.position.y = 1.5 + i*0.9;
      g.add(packing);
    }
    // 进/出管
    var inlet = this._cyl(0.2, 0.2, 0.8, mm, 10);
    inlet.rotation.z = Math.PI/2;
    inlet.position.set(1.5, 0.8, 0); g.add(inlet);
    var outlet = this._cyl(0.2, 0.2, 0.8, mm, 10);
    outlet.rotation.z = Math.PI/2;
    outlet.position.set(1.5, 4.0, 0); g.add(outlet);
    // 塔顶出气
    var vent = this._cyl(0.15, 0.15, 0.6, mm, 10);
    vent.position.y = 5.3; g.add(vent);

    
    // —— 运转机构（补）：吸收液循环泵
    var aPump = this._cyl(0.28, 0.28, 0.58, this.makePaint(0xcc4444), 16);
    aPump.rotation.z = Math.PI/2;
    aPump.position.set(1.95, 0.58, 1.20); this._spin(aPump, 1470, 'x'); g.add(aPump);
    var aMot = this._cyl(0.22, 0.22, 0.62, this.makePaint(0x2a4a6a), 14);
    aMot.rotation.z = Math.PI/2;
    aMot.position.set(1.95, 0.58, 1.90); this._spin(aMot, 1470, 'x'); g.add(aMot);
g.scale.set(0.810, 2.680, 0.810);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // W-703 废水处理站
  'W-703': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a7a8a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 地面
    var floor = this._box(5.0, 0.15, 4.0, concrete);
    floor.position.y = 0.075; g.add(floor);
    // 调节池
    var reg = this._cyl(1.2, 1.2, 1.0, this.makePaint(0x3a5a6a), 20);
    reg.position.set(-1.5, 0.65, 0); g.add(reg);
    var regLiq = this._cyl(1.1, 1.1, 0.2, this.makeGlass(0x558899, 0.5), 20);
    regLiq.position.set(-1.5, 1.0, 0); g.add(regLiq);
    // 沉淀池
    var sett = this._cyl(1.0, 1.0, 1.2, this.makePaint(0x4a6a7a), 20);
    sett.position.set(0.5, 0.75, 0.5); g.add(sett);
    var settLiq = this._cyl(0.9, 0.9, 0.2, this.makeGlass(0x669988, 0.5), 20);
    settLiq.position.set(0.5, 1.2, 0.5); g.add(settLiq);
    // 清水池
    var clear = this._cyl(0.8, 0.8, 1.0, this.makePaint(0x3a6a7a), 20);
    clear.position.set(2.0, 0.65, -0.5); g.add(clear);
    var clearLiq = this._cyl(0.7, 0.7, 0.2, this.makeGlass(0x44aa88, 0.6), 20);
    clearLiq.position.set(2.0, 0.9, -0.5); g.add(clearLiq);
    // 泵（2 台）
    for(var i=0;i<2;i++){
      var pump = this._cyl(0.25, 0.25, 0.5, this.makePaint(0x2a4a6a), 14);
      pump.rotation.z = Math.PI/2;
      pump.position.set(-1.5 + i*1.0, 0.35, 1.2);
      g.add(pump);
    }
    // 加药管
    for(var i=0;i<2;i++){
      var pipe = this._cyl(0.06, 0.06, 1.5, mm, 8);
      pipe.position.set(-0.5 + i*1.5, 1.5, 0.5);
      g.add(pipe);
    }
    // 控制柜
    var ctrl = this._box(0.6, 1.2, 0.4, this.makePaint(0x334455));
    ctrl.position.set(2.5, 0.6, 1.5); g.add(ctrl);

    
    // —— 运转机构（补）：辐流式沉淀池刮泥机（0.08 r/min 慢速回转）
    var scraper = new THREE.Group();
    var sArm = this._box(4.20, 0.14, 0.26, mm);
    sArm.position.y = 0.85; scraper.add(sArm);
    var sHub = this._cyl(0.32, 0.32, 0.50, mm, 14);
    sHub.position.y = 1.05; scraper.add(sHub);
    for(var sb=0; sb<4; sb++){
      var sBlade = this._box(0.55, 0.30, 0.10, this.makePaint(0x6a6a55));
      sBlade.position.set(-1.60 + sb*1.05, 0.62, 0);
      sBlade.rotation.y = 0.55;
      scraper.add(sBlade);
    }
    this._spin(scraper, 0.08, 'y', 0, 0, 0);
    g.add(scraper);
g.scale.set(3.640, 1.740, 3.500);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // C-704 循环水冷却塔
  'C-704': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a8a9a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(5.0, 0.5, 5.0, concrete);
    base.position.y = 0.25; g.add(base);
    // 塔体（方形箱体，800 m³/h 循环水 ≈ 方形冷却塔 4×4×5m）
    var body = this._box(4.0, 5.0, 4.0, pm, 24);
    body.position.y = 3.0; g.add(body);
    // 顶部风机罩（双风机，方形塔常见 2 台）
    for(var f=0;f<2;f++){
      var fanHousing = this._cyl(0.8, 0.8, 0.6, mm, 20);
      fanHousing.position.set(f===0?-1.0:1.0, 5.8, 0); g.add(fanHousing);
      // 风机叶轮（轴流风机 ~200 r/min，随电机连续旋转）
      var fan = new THREE.Group();
      fan.position.set(f===0?-1.0:1.0, 6.05, 0);
      for(var i=0;i<4;i++){
        var blade = this._box(0.6, 0.05, 0.25, mm);
        blade.rotation.y = i*Math.PI/2 + f*0.3;
        blade.rotation.x = 0.35;          // 叶片安装角（真实轴流风机有扭角）
        fan.add(blade);
      }
      var hub = this._cyl(0.14, 0.14, 0.16, mm, 12);
      fan.add(hub);
      this._spin(fan, 200, 'y');
      g.add(fan);
      // 风机电机
      var motor = this._cyl(0.25, 0.25, 0.5, this.makePaint(0x2a4a6a), 14);
      motor.position.set(f===0?-1.0:1.0, 6.3, 0); g.add(motor);
    }
    // 进水管（底部）
    var inlet = this._cyl(0.2, 0.2, 1.2, mm, 12);
    inlet.rotation.z = Math.PI/2;
    inlet.position.set(2.5, 1.0, 0); g.add(inlet);
    // 出水管
    var outlet = this._cyl(0.2, 0.2, 1.2, mm, 12);
    outlet.rotation.z = Math.PI/2;
    outlet.position.set(2.5, 2.0, 0); g.add(outlet);
    // 检修门
    var door = this._box(0.9, 1.8, 0.1, this.makePaint(0x445566));
    door.position.set(2.05, 1.2, 0); g.add(door);
    // 配水管（顶部喷淋，塔内）
    var sprayBar = this._cyl(0.08, 0.08, 3.0, mm, 8);
    sprayBar.rotation.z = Math.PI/2;
    sprayBar.position.set(0, 4.5, 0); g.add(sprayBar);

    g.scale.set(1.430, 1.380, 1.430);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // S-801 硫酸储罐区
  'S-801': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x8a5a3a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 围堰（方形基础，按 40 m³ 硫酸罐区）
    var berm = this._box(7.0, 0.5, 5.0, concrete);
    berm.position.y = 0.25; g.add(berm);
    // 两个立式圆罐（直径 3m 高 5m，40 m³ ≈ φ3m×H5m）
    for(var i=0;i<2;i++){
      var cx = -1.5 + i*3.0;
      var tank = this._cyl(1.5, 1.5, 5.0, pm, 28);
      tank.position.set(cx, 3.0, 0); g.add(tank);
      // 罐顶封头（椭圆）
      var topHead = this._sph(1.5, pm, 24);
      topHead.scale.y = 0.4;
      topHead.position.set(cx, 5.5, 0); g.add(topHead);
      // 液位计（侧面玻璃管，全高）
      var lvd = this._cyl(0.06, 0.06, 4.0, this.makeGlass(0xffffff, 0.7), 8);
      lvd.position.set(cx + 1.5, 3.0, 0.4); g.add(lvd);
      // 进出管
      var pipeIn = this._cyl(0.12, 0.12, 1.0, mm, 8);
      pipeIn.rotation.z = Math.PI/2;
      pipeIn.position.set(cx + 2.0, 1.5, 0); g.add(pipeIn);
      var pipeOut = this._cyl(0.12, 0.12, 1.0, mm, 8);
      pipeOut.rotation.z = Math.PI/2;
      pipeOut.position.set(cx - 2.0, 0.8, 0); g.add(pipeOut);
      // 罐体加强环（4 道）
      for(var r=0;r<4;r++){
        var band = this._tor(1.52, 0.04, mm);
        band.rotation.x = Math.PI/2;
        band.position.set(cx, 1.0 + r*1.3, 0);
        g.add(band);
      }
    }
    // 罐间连接管
    var conn = this._cyl(0.1, 0.1, 3.0, mm, 8);
    conn.rotation.z = Math.PI/2;
    conn.position.set(0, 1.0, 0); g.add(conn);

    
    // —— 运转机构（补）：硫酸输送泵（沉钒调酸供酸）
    var acPump = this._cyl(0.28, 0.28, 0.58, this.makePaint(0xcc4444), 16);
    acPump.rotation.z = Math.PI/2;
    acPump.position.set(3.20, 0.58, 1.90); this._spin(acPump, 1470, 'x'); g.add(acPump);
    var acMot = this._cyl(0.22, 0.22, 0.62, this.makePaint(0x2a4a6a), 14);
    acMot.rotation.z = Math.PI/2;
    acMot.position.set(3.20, 0.58, 2.60); this._spin(acMot, 1470, 'x'); g.add(acMot);
g.scale.set(1.500, 1.150, 1.000);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // S-802 纯碱铵盐储罐区
  'S-802': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a7a8a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    // 围堰（按 50 m³ 铵盐罐）
    var berm = this._box(6.0, 0.5, 5.0, concrete);
    berm.position.y = 0.25; g.add(berm);
    // 一个立式圆罐（直径 3m 高 6m，50 m³ ≈ φ3m×H5.5m）
    var tank = this._cyl(1.5, 1.5, 6.0, pm, 28);
    tank.position.set(0, 3.5, 0); g.add(tank);
    // 罐顶（平顶 + 呼吸阀）
    var topPlate = this._cyl(1.55, 1.55, 0.2, mm, 28);
    topPlate.position.y = 6.6; g.add(topPlate);
    var vent = this._cyl(0.2, 0.2, 0.7, mm, 10);
    vent.position.y = 7.0; g.add(vent);
    // 液位计
    var lvd = this._cyl(0.06, 0.06, 5.0, this.makeGlass(0xffffff, 0.7), 8);
    lvd.position.set(1.5, 3.5, 0.4); g.add(lvd);
    // 进出管
    var pipeIn = this._cyl(0.12, 0.12, 1.0, mm, 8);
    pipeIn.rotation.z = Math.PI/2;
    pipeIn.position.set(2.0, 1.5, 0); g.add(pipeIn);
    var pipeOut = this._cyl(0.12, 0.12, 1.0, mm, 8);
    pipeOut.rotation.z = Math.PI/2;
    pipeOut.position.set(-2.0, 0.8, 0); g.add(pipeOut);
    // 加强环（4 道）
    for(var r=0;r<4;r++){
      var band = this._tor(1.52, 0.04, mm);
      band.rotation.x = Math.PI/2;
      band.position.y = 1.5 + r*1.4;
      g.add(band);
    }
    // 爬梯
    for(var i=0;i<14;i++){
      var rung = this._cyl(0.03, 0.03, 0.4, mm, 6);
      rung.rotation.z = Math.PI/2;
      rung.position.set(1.6, 0.3 + i*0.5, 0.45);
      g.add(rung);
    }
    var rail1 = this._cyl(0.04, 0.04, 7.0, mm, 6);
    rail1.position.set(1.5, 3.5, 0.45); g.add(rail1);

    
    // —— 运转机构（补）：溶解槽搅拌 + 加药计量泵
    var mix8 = new THREE.Group();
    var sh8 = this._cyl(0.07, 0.07, 1.60, mm, 10);
    sh8.position.y = 1.30; mix8.add(sh8);
    for(var m8=0; m8<2; m8++){
      var imp8 = this._cyl(0.55, 0.55, 0.07, mm, 16);
      imp8.position.y = 0.85 + m8*0.75; mix8.add(imp8);
    }
    this._spin(mix8, 88, 'y'); g.add(mix8);
    var dosePump = this._box(0.34, 0.28, 0.30, this.makePaint(0x336699));
    dosePump.position.set(2.30, 0.50, 1.60);
    this._osc(dosePump, 0.05, 2.6, 'y'); g.add(dosePump);
g.scale.set(1.600, 1.000, 1.200);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // U-804 管廊 + 泵组
  'U-804': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x6a7a8a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 管廊基础（长条形）
    var base = this._box(8.0, 0.3, 2.0, concrete);
    base.position.y = 0.15; g.add(base);
    // 管廊桁架（上下横梁 + 斜撑）
    var topBeam = this._cyl(0.1, 0.1, 8.0, mm, 12);
    topBeam.rotation.z = Math.PI/2;
    topBeam.position.y = 4.0; g.add(topBeam);
    var botBeam = topBeam.clone();
    botBeam.position.y = 1.0; g.add(botBeam);
    // 立柱（4 根）
    for(var i=0;i<4;i++){
      var col = this._box(0.15, 3.5, 0.15, mm);
      col.position.set(-3.5 + i*2.3, 2.25, 0);
      g.add(col);
      var col2 = col.clone();
      col2.position.z = 1.2; g.add(col2);
    }
    // 斜撑
    for(var i=0;i<3;i++){
      var brace = this._box(0.06, 2.8, 0.06, mm);
      brace.position.set(-2.4 + i*2.3, 2.25, 0.6);
      brace.rotation.z = 0.3;
      g.add(brace);
    }
    // 管廊上的管线（3 根不同直径）
    for(var i=0;i<3;i++){
      var pipe = this._cyl(0.12 - i*0.03, 0.12 - i*0.03, 7.5, this.makePaint(0xaa8833 + i*0x220000), 12);
      pipe.rotation.z = Math.PI/2;
      pipe.position.set(0, 3.5 + i*0.35, 0.2 + i*0.3);
      g.add(pipe);
    }
    // 泵组（3 台离心泵，地面）
    for(var i=0;i<3;i++){
      var px = -2.5 + i*2.5;
      // 泵体（蜗壳形 → 用圆柱+切向管）
      var volute = this._cyl(0.4, 0.4, 0.6, this.makePaint(0x2a4a6a), 20);
      volute.rotation.z = Math.PI/2;
      volute.position.set(px, 0.7, 1.8); g.add(volute);
      // 叶轮罩
      var cover = this._cyl(0.45, 0.45, 0.15, mm, 20);
      cover.rotation.z = Math.PI/2;
      cover.position.set(px + 0.4, 0.7, 1.8); g.add(cover);
      // 电机
      var motor = this._cyl(0.25, 0.25, 0.7, this.makePaint(0x1a3a5a), 14);
      motor.rotation.z = Math.PI/2;
      motor.position.set(px - 0.8, 0.7, 1.8); g.add(motor);
      // 进出口管
      var inlet = this._cyl(0.15, 0.15, 0.5, mm, 10);
      inlet.position.set(px, 1.1, 1.8); g.add(inlet);
      var outlet = this._cyl(0.12, 0.12, 0.5, mm, 10);
      outlet.rotation.z = Math.PI/2;
      outlet.position.set(px + 0.5, 0.7, 2.2); g.add(outlet);
      // 底座
      var pBase = this._box(1.5, 0.2, 0.8, concrete);
      pBase.position.set(px, 0.1, 1.8); g.add(pBase);
    }

    
    // —— 运转机构（补）：工艺泵组（矿浆泵/浸出液泵/母液泵）
    for(var pp8=0; pp8<3; pp8++){
      var pz = -1.0 + pp8*1.0;
      var pBody = this._cyl(0.30, 0.30, 0.60, this.makePaint(0xcc4444), 16);
      pBody.rotation.z = Math.PI/2;
      pBody.position.set(1.60, 0.60, pz); this._spin(pBody, 1470, 'x'); g.add(pBody);
      var pMot = this._cyl(0.24, 0.24, 0.64, this.makePaint(0x2a4a6a), 14);
      pMot.rotation.z = Math.PI/2;
      pMot.position.set(2.50, 0.60, pz); this._spin(pMot, 1470, 'x'); g.add(pMot);
      var cpl = this._cyl(0.10, 0.10, 0.24, mm, 10);
      cpl.rotation.z = Math.PI/2;
      cpl.position.set(2.05, 0.60, pz); this._spin(cpl, 1470, 'x'); g.add(cpl);
    }
g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // E-805 配电房
  'E-805': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a5a6a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(5.0, 0.3, 4.0, concrete);
    base.position.y = 0.15; g.add(base);
    // 主体（双层，下层设备层+上层办公）
    var body = this._box(4.5, 3.0, 3.5, pm, 24);
    body.position.y = 1.8; g.add(body);
    // 屋顶（坡顶）
    var roof = this._box(4.8, 0.3, 3.8, this.makePaint(0x556677), 24);
    roof.position.y = 3.45; g.add(roof);
    // 窗户（下层 3 扇 + 上层 2 扇）
    for(var i=0;i<3;i++){
      var win = this._box(0.7, 0.8, 0.05, this.makeGlass(0x88bbdd, 0.5), 8);
      win.position.set(-1.5 + i*1.5, 1.5, 1.78); g.add(win);
    }
    for(var i=0;i<2;i++){
      var win2 = this._box(0.7, 0.6, 0.05, this.makeGlass(0x88bbdd, 0.5), 8);
      win2.position.set(-1.0 + i*2.0, 2.6, 1.78); g.add(win2);
    }
    // 门
    var door = this._box(0.9, 1.8, 0.08, this.makePaint(0x334455));
    door.position.set(1.8, 0.9, 1.78); g.add(door);
    // 变压器（侧面）
    var xfmr = this._box(1.2, 1.5, 1.0, this.makePaint(0x6a8a5a));
    xfmr.position.set(3.0, 1.0, -0.5); g.add(xfmr);
    // 散热片
    for(var i=0;i<4;i++){
      var fin = this._box(0.05, 1.2, 0.8, mm);
      fin.position.set(3.65, 1.0, -0.8 + i*0.25); g.add(fin);
    }

    g.scale.set(2.900, 1.670, 2.500);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // C-806 DCS 中控室
  'C-806': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x3a4a6a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(5.5, 0.3, 4.5, concrete);
    base.position.y = 0.15; g.add(base);
    // 主体
    var body = this._box(5.0, 3.5, 4.0, pm, 24);
    body.position.y = 2.05; g.add(body);
    // 屋顶
    var roof = this._box(5.3, 0.25, 4.3, this.makePaint(0x445566), 24);
    roof.position.y = 3.95; g.add(roof);
    // 大面积玻璃幕墙（正面）
    var glass = this._box(4.0, 1.8, 0.08, this.makeGlass(0x6699cc, 0.4), 16);
    glass.position.set(0, 1.8, 2.02); g.add(glass);
    // 幕墙分格
    for(var i=0;i<4;i++){
      var mull = this._box(0.05, 1.8, 0.1, mm);
      mull.position.set(-1.5 + i*1.0, 1.8, 2.05); g.add(mull);
    }
    // 门
    var door = this._box(0.9, 1.8, 0.08, this.makePaint(0x334455));
    door.position.set(2.2, 0.9, 2.02); g.add(door);
    // 标识灯箱
    var sign = this._box(1.5, 0.4, 0.05, this.makeLamp());
    sign.position.set(0, 3.3, 2.05); g.add(sign);

    g.scale.set(3.640, 1.460, 2.670);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // A-807 螺杆空压机站
  'A-807': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a7a8a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(4.0, 0.3, 3.0, concrete);
    base.position.y = 0.15; g.add(base);
    // 两台螺杆空压机（卧置箱体+圆柱主机）
    for(var i=0;i<2;i++){
      var cx = -1.2 + i*2.4;
      // 主机箱体
      var unit = this._box(1.2, 1.5, 1.0, pm, 20);
      unit.position.set(cx, 1.05, 0); g.add(unit);
      // 压缩机圆柱（侧面）
      var comp = this._cyl(0.3, 0.3, 0.8, mm, 16);
      comp.rotation.z = Math.PI/2;
      comp.position.set(cx, 1.3, 0.55); g.add(comp);
      // 散热格栅（前面）
      for(var s=0;s<4;s++){
        var fin = this._box(0.8, 0.05, 0.05, mm);
        fin.position.set(cx, 0.5 + s*0.3, 0.52); g.add(fin);
      }
      // 控制面板
      var panel = this._box(0.3, 0.4, 0.05, this.makePaint(0x334455));
      panel.position.set(cx + 0.5, 1.8, 0.52); g.add(panel);
    }
    // 储气罐（立式圆筒）
    var tank = this._cyl(0.6, 0.6, 2.5, this.makePaint(0x446677), 20);
    tank.position.set(0, 1.55, -0.8); g.add(tank);
    var tankTop = this._sph(0.6, this.makePaint(0x446677), 16);
    tankTop.scale.y = 0.4;
    tankTop.position.set(0, 2.8, -0.8); g.add(tankTop);
    // 连接管
    var pipe = this._cyl(0.08, 0.08, 1.5, mm, 8);
    pipe.rotation.z = Math.PI/2;
    pipe.position.set(0, 1.5, -0.2); g.add(pipe);
    // 放空阀
    var valve = this._cyl(0.1, 0.1, 0.3, mm, 8);
    valve.position.set(0, 3.0, -0.8); g.add(valve);

    
    // —— 运转机构（补）：螺杆主机转子 + 主电机（皮带传动）
    var rotor = this._cyl(0.26, 0.26, 1.10, mm, 16);
    rotor.rotation.z = Math.PI/2;
    rotor.position.set(-0.60, 1.15, 0); this._spin(rotor, 2960, 'x'); g.add(rotor);
    var aMot8 = this._cyl(0.36, 0.36, 1.10, this.makePaint(0x2a4a6a), 18);
    aMot8.rotation.z = Math.PI/2;
    aMot8.position.set(0.90, 1.15, 0); this._spin(aMot8, 2960, 'x'); g.add(aMot8);
    var belt8 = this._box(0.30, 0.10, 0.18, this.makePaint(0x222222));
    belt8.position.set(0.15, 1.15, 0); g.add(belt8);
    var coolFan = new THREE.Group();
    var cfHub = this._cyl(0.12, 0.12, 0.20, mm, 12);
    cfHub.rotation.z = Math.PI/2; coolFan.add(cfHub);
    for(var cf=0; cf<5; cf++){
      var cfB = this._box(0.30, 0.04, 0.14, this.makePaint(0x99aabb));
      cfB.rotation.x = cf*Math.PI*2/5; cfB.rotation.z = 0.4;
      coolFan.add(cfB);
    }
    coolFan.position.set(-1.90, 1.15, 0);
    this._spin(coolFan, 940, 'x'); g.add(coolFan);
g.scale.set(3.000, 1.560, 2.670);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // B-808 蒸汽锅炉房
  'B-808': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x6a5a4a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(6.0, 0.3, 4.5, concrete);
    base.position.y = 0.15; g.add(base);
    // 锅炉本体（横置圆筒，直径 1.8m 长 5.0m，小型蒸汽锅炉）
    var boiler = this._cyl(0.9, 0.9, 5.0, pm, 28);
    boiler.rotation.z = Math.PI/2;
    boiler.position.y = 2.0; g.add(boiler);
    // 前后封头
    var headL = this._sph(0.9, pm, 24);
    headL.scale.z = 0.4;
    headL.position.set(-2.5, 2.0, 0); g.add(headL);
    var headR = headL.clone();
    headR.position.set(2.5, 2.0, 0); g.add(headR);
    // 加强箍（4 道）
    for(var i=0;i<4;i++){
      var band = this._tor(0.95, 0.06, mm);
      band.position.set(-1.8 + i*1.2, 2.0, 0); g.add(band);
    }
    // 燃烧器（前端）
    var burner = this._cyl(0.35, 0.28, 1.0, mm, 16);
    burner.rotation.z = -Math.PI/2;
    burner.position.set(-3.3, 2.0, 0); g.add(burner);
    var burnerGlow = this._sph(0.22, this.makeGlow(0xff4400));
    burnerGlow.position.set(-3.9, 2.0, 0); g.add(burnerGlow);
    // 顶部烟箱
    var smokebox = this._box(2.4, 0.9, 1.6, this.makePaint(0x444444));
    smokebox.position.set(0, 3.5, 0); g.add(smokebox);
    // 烟囱（落地式，直径 0.8 m、高 15 m；底部中心 = 0 + 15/2 = 7.5，避免沉入地下）
    var stack = this._cyl(0.40, 0.46, 15.0, this.makePaint(0x5a5a62), 20);
    stack.position.set(3.5, 7.5, 0); g.add(stack);
    var stackTop = this._cyl(0.50, 0.50, 0.40, mm, 20);
    stackTop.position.set(3.5, 15.2, 0); g.add(stackTop);
    // 烟囱三道加强箍
    for(var i=0;i<3;i++){
      var sband = this._tor(0.45, 0.045, mm);
      sband.rotation.x = Math.PI/2;
      sband.position.set(3.5, 3.0 + i*4.0, 0); g.add(sband);
    }
    // 锅炉顶部烟箱 → 烟囱的水平烟道（真实锅炉房布置）
    var flue = this._cyl(0.34, 0.34, 3.1, mm, 14);
    flue.rotation.z = Math.PI/2;
    flue.position.set(2.0, 3.5, 0); g.add(flue);
    // 安全阀
    for(var i=0;i<2;i++){
      var sv = this._cyl(0.12, 0.12, 0.45, mm, 8);
      sv.position.set(-0.5 + i*1.0, 3.8, 0); g.add(sv);
      var wheel = this._tor(0.15, 0.03, this.makePaint(0xcc3333));
      wheel.rotation.x = Math.PI/2;
      wheel.position.set(-0.5 + i*1.0, 4.1, 0); g.add(wheel);
    }
    // 汽水分离罐（侧面小罐）
    var sepTank = this._cyl(0.55, 0.55, 1.6, this.makePaint(0x556677), 16);
    sepTank.position.set(1.8, 1.8, 1.6); g.add(sepTank);
    var sepTop = this._sph(0.55, this.makePaint(0x556677), 12);
    sepTop.scale.y = 0.4;
    sepTop.position.set(1.8, 2.6, 1.6); g.add(sepTop);

    
    // —— 运转机构（补）：锅炉给水泵 + 鼓风机（燃气锅炉辅机）
    var fwPump = this._cyl(0.28, 0.28, 0.58, this.makePaint(0xcc4444), 16);
    fwPump.rotation.z = Math.PI/2;
    fwPump.position.set(2.60, 0.58, 1.60); this._spin(fwPump, 1470, 'x'); g.add(fwPump);
    var fwMot = this._cyl(0.22, 0.22, 0.62, this.makePaint(0x2a4a6a), 14);
    fwMot.rotation.z = Math.PI/2;
    fwMot.position.set(2.60, 0.58, 2.30); this._spin(fwMot, 1470, 'x'); g.add(fwMot);
    var fdFan = new THREE.Group();
    var fdHub = this._cyl(0.14, 0.14, 0.24, mm, 12);
    fdHub.rotation.z = Math.PI/2; fdFan.add(fdHub);
    for(var fdb=0; fdb<6; fdb++){
      var fdB = this._box(0.34, 0.05, 0.16, this.makePaint(0x99aabb));
      fdB.rotation.x = fdb*Math.PI/3; fdB.rotation.z = 0.42;
      fdFan.add(fdB);
    }
    fdFan.position.set(-2.60, 1.20, 1.20);
    this._spin(fdFan, 1470, 'x'); g.add(fdFan);
g.scale.set(2.470, 1.000, 2.670);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // ============================================================
  //  补充的真实工序设备（工艺链补全：引风机 / 熟料湿磨 / 除杂 / 蒸发结晶）
  // ============================================================

  // P-204 窑尾排烟引风机（离心式，皮带传动，机壳蜗壳+叶轮+电机+风道）
  'P-204': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a5a6a);
    var mm = this.makeMetal(0x707070);
    var concrete = this.makeConcrete();

    // 混凝土基础
    var base = this._box(4.2, 0.5, 3.0, concrete);
    base.position.y = 0.25; g.add(base);
    // 钢底座（公用底座，电机与风机同底板）
    var skid = this._box(4.0, 0.18, 2.6, this.makePaint(0x3a4a5a));
    skid.position.y = 0.59; g.add(skid);

    // 蜗壳：主圆筒 + 出风口（切向矩形蜗舌）
    var casing = this._cyl(1.15, 1.15, 0.95, pm, 28);
    casing.rotation.x = Math.PI/2;          // 轴沿 Z（垂直于轴）
    casing.position.set(0, 1.75, 0); g.add(casing);
    var outlet = this._box(0.95, 1.25, 1.0, pm);
    outlet.position.set(0, 2.75, 0); g.add(outlet);
    var outFl = this._box(1.15, 0.12, 1.2, mm);
    outFl.position.set(0, 3.30, 0); g.add(outFl);
    // 轴向进风口（喇叭口）
    var inlet = this._cyl(0.55, 0.85, 0.9, pm, 24);
    inlet.rotation.z = Math.PI/2;
    inlet.position.set(-1.45, 1.75, 0); g.add(inlet);
    var inFl = this._cyl(0.90, 0.90, 0.10, mm, 24);
    inFl.rotation.z = Math.PI/2;
    inFl.position.set(-1.90, 1.75, 0); g.add(inFl);

    // 叶轮（剖切可见；真实转速 960 r/min）
    var impeller = new THREE.Group();
    var hub = this._cyl(0.22, 0.22, 0.55, mm, 16);
    hub.rotation.x = Math.PI/2; hub.position.set(0, 0, 0); impeller.add(hub);
    for(var i=0;i<12;i++){
      var bd = this._box(0.62, 0.06, 0.50, this.makePaint(0x8a8a90));
      bd.position.set(Math.cos(i*Math.PI/6)*0.55, Math.sin(i*Math.PI/6)*0.55, 0);
      bd.rotation.z = i*Math.PI/6 + 0.5;
      impeller.add(bd);
    }
    impeller.position.set(0, 1.75, 0);
    this._spin(impeller, 960, 'z');
    g.add(impeller);

    // 主轴 + 轴承座（皮带轮侧）
    var shaft = this._cyl(0.13, 0.13, 1.9, mm, 12);
    shaft.rotation.x = Math.PI/2;
    shaft.position.set(0, 1.75, 1.05); g.add(shaft);
    var brg = this._box(0.55, 0.65, 0.62, this.makePaint(0x2a3a4a));
    brg.position.set(0, 1.90, 1.35); g.add(brg);
    // 皮带轮 + 皮带罩
    var pulley = this._cyl(0.42, 0.42, 0.22, this.makePaint(0x2a3a4a), 20);
    pulley.rotation.x = Math.PI/2;
    pulley.position.set(0, 1.75, 1.95); this._spin(pulley, 960, 'z'); g.add(pulley);
    var guard = this._box(0.95, 0.95, 0.30, this.makePaint(0xcc8800));
    guard.position.set(0, 1.75, 1.95); g.add(guard);
    // 电机（与风机并列在公用底座上）
    var motor = this._cyl(0.45, 0.45, 1.5, this.makePaint(0x2a4a6a), 20);
    motor.rotation.x = Math.PI/2;
    motor.position.set(1.55, 1.35, 1.95); this._spin(motor, 1470, 'z'); g.add(motor);
    var mPulley = this._cyl(0.28, 0.28, 0.22, this.makePaint(0x2a3a4a), 18);
    mPulley.rotation.x = Math.PI/2;
    mPulley.position.set(1.55, 1.35, 1.05); this._spin(mPulley, 1470, 'z'); g.add(mPulley);
    var belt = this._box(0.16, 0.10, 0.90, this.makePaint(0x222222));
    belt.position.set(0.78, 1.55, 1.50); g.add(belt);
    // 出口风道（去洗涤塔，矩形管道）
    var duct = this._box(0.90, 1.30, 2.6, this.makePaint(0x5a6a7a));
    duct.position.set(0, 3.95, 1.4); g.add(duct);

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // M-205 熟料湿式球磨机（φ2.1×3.6 m 溢流型，焙烧熟料浸出前再磨）
  'M-205': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x4a6a7a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    var MR = 1.05;    // 筒体内半径（φ2.1）
    var ML = 3.6;     // 筒体长度
    var AY = 1.85;    // 筒体中心线标高（磨机中心线约 1.7~2.0 m）

    // 条形基础（两台轴承座 + 传动侧）
    var f1 = this._box(1.4, 0.85, 6.0, concrete);
    f1.position.set(0, 0.425, 0); g.add(f1);
    var f2 = this._box(2.4, 0.85, 2.4, concrete);
    f2.position.set(2.6, 0.425, -3.0); g.add(f2);

    // 回转组（筒体 + 衬板 + 端盖 + 大齿圈）
    var rot = new THREE.Group();
    // 筒体（轴沿 X）
    var shell = this._cyl(MR, MR, ML, pm, 32);
    shell.rotation.z = Math.PI/2;
    shell.position.set(0, AY, 0); rot.add(shell);
    // 端盖（锥形封头）
    var capA = this._cyl(MR, 0.45, 0.6, pm, 28);
    capA.rotation.z = -Math.PI/2;
    capA.position.set(-(ML/2+0.3), AY, 0); rot.add(capA);
    var capB = this._cyl(0.45, MR, 0.6, pm, 28);
    capB.rotation.z = -Math.PI/2;
    capB.position.set((ML/2+0.3), AY, 0); rot.add(capB);
    // 中空轴颈
    var jA = this._cyl(0.42, 0.42, 1.2, mm, 18);
    jA.rotation.z = Math.PI/2;
    jA.position.set(-(ML/2+1.1), AY, 0); rot.add(jA);
    var jB = this._cyl(0.42, 0.42, 1.2, mm, 18);
    jB.rotation.z = Math.PI/2;
    jB.position.set((ML/2+1.1), AY, 0); rot.add(jB);
    // 衬板波峰（沿筒内壁 12 道）
    for(var i=0;i<12;i++){
      var lin = this._box(ML*0.94, 0.10, 0.20, this.makePaint(0x8a7a55));
      var a = i*Math.PI/6;
      lin.position.set(0, AY + Math.sin(a)*(MR-0.16), Math.cos(a)*(MR-0.16));
      lin.rotation.x = -a;
      rot.add(lin);
    }
    // 钢球 + 料浆（剖切可见，随筒体被带到高处抛落）
    var charge = this._cyl(MR*0.55, MR*0.55, ML*0.90, this.makePaint(0x556065), 20);
    charge.rotation.z = Math.PI/2;
    charge.position.set(0, AY - MR*0.50, 0); rot.add(charge);
    // 大齿圈
    var gear = this._cyl(1.32, 1.32, 0.34, this.makePaint(0xbb9933), 36);
    gear.rotation.z = Math.PI/2;
    gear.position.set(-1.1, AY, 0); rot.add(gear);
    this._spin(rot, 21.5, 'x', 0, AY, 0);
    g.add(rot);

    // 主轴承（两端轴瓦座）
    for(var s=0;s<2;s++){
      var sx = (s===0 ? -(ML/2+1.1) : (ML/2+1.1));
      var brg = this._box(1.0, 0.95, 1.3, this.makePaint(0x3a4a5a));
      brg.position.set(sx, 1.33, 0); g.add(brg);
      var ped = this._box(1.2, 0.55, 1.5, concrete);
      ped.position.set(sx, 1.10, 0); g.add(ped);
    }
    // 小齿轮 + 减速机 + 电机
    var pin = this._cyl(0.38, 0.38, 0.34, this.makePaint(0xcc9933), 20);
    pin.rotation.z = Math.PI/2;
    pin.position.set(-1.1, AY - 1.28, 0); this._spin(pin, 74, 'x'); g.add(pin);
    var gb = this._box(1.3, 1.0, 1.2, this.makePaint(0x3a5a7a));
    gb.position.set(-1.1, 0.95, -2.1); g.add(gb);
    var mot = this._cyl(0.42, 0.42, 1.5, this.makePaint(0x2a4a6a), 20);
    mot.rotation.z = Math.PI/2;
    mot.position.set(-1.1, 0.75, -3.6); this._spin(mot, 985, 'x'); g.add(mot);
    // 给料器（鼓形给料 + 给料溜槽）
    var feeder = this._box(0.9, 0.9, 0.7, this.makePaint(0x5a6a5a));
    feeder.position.set(-(ML/2+1.9), AY, 0); g.add(feeder);
    var chute = this._box(0.55, 1.4, 0.55, mm);
    chute.position.set(-(ML/2+1.9), AY + 1.2, 0); g.add(chute);
    // 出料（溢流型：出料端中空轴 + 排料槽）
    var trough = this._box(1.0, 0.8, 1.4, this.makePaint(0x5a6a5a));
    trough.position.set(ML/2+1.9, AY - 0.35, 0); g.add(trough);
    var outP = this._cyl(0.20, 0.20, 1.0, mm, 12);
    outP.position.set(ML/2+1.9, AY - 1.1, 0); g.add(outP);

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // R-305 除杂反应槽（φ5×5.5 m，除硅除磷，药剂加入 + 机械搅拌）
  'R-305': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x6a7a4a);
    var mm = this.makeMetal(0x666666);
    var concrete = this.makeConcrete();

    var base = this._box(6.2, 0.5, 6.2, concrete);
    base.position.y = 0.25; g.add(base);
    var tank = this._cyl(2.5, 2.5, 5.0, pm, 32);
    tank.position.y = 3.0; g.add(tank);
    var lid = this._cyl(2.55, 2.55, 0.20, mm, 32);
    lid.position.y = 5.60; g.add(lid);
    var dome = this._sph(2.5, pm, 24);
    dome.scale.y = 0.32; dome.position.y = 5.70; g.add(dome);
    // 保温带
    for(var i=0;i<5;i++){
      var band = this._tor(2.53, 0.05, this.makePaint(0x888888));
      band.rotation.x = Math.PI/2; band.position.y = 0.9 + i*1.0; g.add(band);
    }
    // 顶置搅拌传动（电机 + 减速机 + 机架）
    var gearbox = this._box(1.0, 0.6, 1.0, mm);
    gearbox.position.y = 6.10; g.add(gearbox);
    var motor = this._cyl(0.38, 0.38, 1.1, this.makePaint(0x2a4a6a), 16);
    motor.position.y = 6.85; g.add(motor);
    var frame = this._box(0.5, 0.5, 0.5, mm);
    frame.position.y = 5.85; g.add(frame);
    // 搅拌（双层桨 52 r/min）
    var ag = new THREE.Group();
    var sh = this._cyl(0.07, 0.07, 4.6, mm, 8);
    sh.position.y = 3.0; ag.add(sh);
    for(var k=0;k<2;k++){
      var iy = k===0 ? 1.3 : 2.6;
      var disc = this._cyl(0.95, 0.95, 0.08, mm, 18);
      disc.position.y = iy; ag.add(disc);
      for(var b=0;b<6;b++){
        var bl = this._box(0.55, 0.34, 0.07, mm);
        bl.position.set(Math.cos(b*Math.PI/3)*0.75, iy, Math.sin(b*Math.PI/3)*0.75);
        bl.rotation.y = -b*Math.PI/3;
        ag.add(bl);
      }
    }
    this._spin(ag, 52, 'y');
    g.add(ag);
    // 药液加入管（顶部三根：MgSO₄ / NH₄Cl / 碱液）
    var cols = [0x3366cc, 0xcc6633, 0x33cc66];
    for(var c=0;c<3;c++){
      var dp = this._cyl(0.09, 0.09, 1.6, this.makePaint(cols[c]), 10);
      dp.position.set(Math.cos(c*2.1)*1.5, 6.3, Math.sin(c*2.1)*1.5); g.add(dp);
      var dv = this._box(0.22, 0.22, 0.22, mm);
      dv.position.set(Math.cos(c*2.1)*1.5, 5.5, Math.sin(c*2.1)*1.5); g.add(dv);
    }
    // 液面 + 排泥口 + 溢流口
    var liq = this._cyl(2.4, 2.4, 0.12, this.makeGlass(0x8aa06a, 0.5), 32);
    liq.position.y = 4.6; g.add(liq);
    var drain = this._cyl(0.22, 0.22, 0.8, mm, 12);
    drain.rotation.x = Math.PI/2;
    drain.position.set(0, 0.7, 2.7); g.add(drain);
    var ovf = this._cyl(0.22, 0.22, 0.8, mm, 12);
    ovf.rotation.x = Math.PI/2;
    ovf.position.set(0.9, 4.9, 2.6); g.add(ovf);
    // 人孔 + 液位计
    var mh = this._cyl(0.42, 0.42, 0.08, mm, 16);
    mh.rotation.x = Math.PI/2;
    mh.position.set(0, 2.2, 2.52); g.add(mh);
    var lg = this._cyl(0.07, 0.07, 3.2, this.makeGlass(0xffffff, 0.7), 8);
    lg.position.set(2.45, 3.0, 0); g.add(lg);

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // F-305 厢式压滤机（150 m²，除杂渣过滤）
  'F-305': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var mm = this.makeMetal(0x777777);
    var pm = this.makePaint(0x4466aa);
    var concrete = this.makeConcrete();

    var base = this._box(7.6, 0.45, 3.0, concrete);
    base.position.y = 0.225; g.add(base);
    // 主梁（双横梁）
    for(var s=0;s<2;s++){
      var beam = this._box(7.2, 0.28, 0.22, this.makePaint(0x555f68));
      beam.position.set(0, 1.35, s*1.3 - 0.65); g.add(beam);
    }
    // 止推板 + 压紧板 + 液压缸
    var head = this._box(0.22, 1.5, 1.6, pm);
    head.position.set(-3.3, 1.9, 0); g.add(head);
    var tail = this._box(0.26, 1.5, 1.6, pm);
    tail.position.set(3.3, 1.9, 0); g.add(tail);
    var cyl = this._cyl(0.19, 0.19, 1.1, mm, 16);
    cyl.rotation.z = Math.PI/2;
    cyl.position.set(3.85, 1.9, 0); g.add(cyl);
    // 液压站
    var hp = this._box(1.0, 1.1, 0.8, this.makePaint(0x336699));
    hp.position.set(4.6, 0.95, 0.9); g.add(hp);
    // 滤板（厢式，无滤框，滤板自带凹腔）
    var plateGroup = new THREE.Group();
    for(var i=0;i<46;i++){
      var pl = this._box(0.085, 1.25, 1.25, this.makePaint(0x2f3a44));
      pl.position.set(-3.05 + i*0.135, 1.95, 0);
      plateGroup.add(pl);
    }
    g.add(plateGroup);
    // 拉板小车（沿主梁往复，真实卸饼动作）
    var cart = new THREE.Group();
    var cb = this._box(0.5, 0.35, 1.5, this.makePaint(0xcc8800));
    cb.position.set(0, 2.95, 0); cart.add(cb);
    var arm = this._box(0.12, 0.55, 0.12, mm);
    arm.position.set(0, 2.55, 0); cart.add(arm);
    this._osc(cart, 2.4, 0.22, 'x');
    g.add(cart);
    // 进料管 + 明流水嘴 + 接液盘
    var feed = this._cyl(0.13, 0.13, 2.2, mm, 14);
    feed.position.set(-3.9, 2.4, 0); feed.rotation.z = Math.PI/2; g.add(feed);
    for(var k=0;k<8;k++){
      var sp = this._cyl(0.045, 0.03, 0.32, mm, 8);
      sp.position.set(-2.6 + k*0.75, 1.15, 0.68);
      sp.rotation.x = Math.PI/2.6; g.add(sp);
    }
    var tray = this._box(6.6, 0.10, 0.9, this.makePaint(0x556070));
    tray.position.set(0, 0.85, 0.75); g.add(tray);
    // 四根立柱
    for(var p=0;p<4;p++){
      var leg = this._box(0.18, 1.2, 0.18, this.makePaint(0x555f68));
      leg.position.set((p<2?-3.1:3.1), 0.95, (p%2===0?-1.1:1.1)); g.add(leg);
    }
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // E-504 沉钒母液三效蒸发结晶（加热室 + 分离室 + 冷凝器 + 结晶器）
  'E-504': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x5a7a8a);
    var mm = this.makeMetal(0x777777);
    var concrete = this.makeConcrete();

    var base = this._box(8.0, 0.45, 5.2, concrete);
    base.position.y = 0.225; g.add(base);
    // 三效：每效 = 立式加热室（列管换热器）+ 分离室（大直径筒）+ 循环管
    for(var e=0;e<3;e++){
      var ex = -2.7 + e*2.7;
      // 加热室（列管壳程）
      var heat = this._cyl(0.62, 0.62, 3.0, this.makePaint(0x4a6a7a), 22);
      heat.position.set(ex, 1.95, -1.3); g.add(heat);
      for(var t=0;t<3;t++){
        var tb = this._tor(0.65, 0.05, mm);
        tb.rotation.x = Math.PI/2;
        tb.position.set(ex, 1.0 + t*0.95, -1.3); g.add(tb);
      }
      // 分离室（直径更大，二次蒸汽在此分离）
      var sep = this._cyl(1.05, 1.05, 2.4, pm, 26);
      sep.position.set(ex, 2.55, 1.0); g.add(sep);
      var dome = this._sph(1.05, pm, 20);
      dome.scale.y = 0.40; dome.position.set(ex, 3.75, 1.0); g.add(dome);
      // 锥底（结晶沉底）
      var cone = this._cyl(1.05, 0.28, 1.0, pm, 26);
      cone.position.set(ex, 0.85, 1.0); g.add(cone);
      // 循环管（加热室 ↔ 分离室，自然循环）
      var loop = this._cyl(0.22, 0.22, 2.4, mm, 12);
      loop.rotation.x = Math.PI/2;
      loop.position.set(ex, 1.55, -0.15); g.add(loop);
      // 二次蒸汽出口（顶部接管，去下一效加热室）
      var vap = this._cyl(0.20, 0.20, 1.0, mm, 12);
      vap.position.set(ex, 4.15, 1.0); g.add(vap);
      // 视镜
      var sight = this._cyl(0.16, 0.16, 0.06, this.makeGlass(0xaaddff, 0.6), 12);
      sight.rotation.x = Math.PI/2;
      sight.position.set(ex, 2.4, 2.05); g.add(sight);
    }
    // 冷凝器 + 真空泵
    var cond = this._cyl(0.55, 0.55, 2.8, this.makePaint(0x6a8a9a), 20);
    cond.rotation.z = Math.PI/2;
    cond.position.set(3.6, 2.2, -1.3); g.add(cond);
    var vp = this._box(0.9, 0.8, 0.9, this.makePaint(0x336699));
    vp.position.set(3.6, 0.85, 0.6); g.add(vp);
    var vpMot = this._cyl(0.22, 0.22, 0.5, this.makePaint(0x2a4a6a), 14);
    vpMot.rotation.z = Math.PI/2;
    vpMot.position.set(3.6, 0.85, 1.35); this._spin(vpMot, 1470, 'x'); g.add(vpMot);
    // 出料泵（母液结晶浆送出）
    var pump = this._cyl(0.28, 0.28, 0.55, this.makePaint(0x446688), 16);
    pump.rotation.z = Math.PI/2;
    pump.position.set(-4.2, 0.75, 1.8); this._spin(pump, 1470, 'x'); g.add(pump);
    var pmot = this._cyl(0.20, 0.20, 0.6, this.makePaint(0x2a4a6a), 14);
    pmot.rotation.z = Math.PI/2;
    pmot.position.set(-4.2, 0.75, 2.5); this._spin(pmot, 1470, 'x'); g.add(pmot);
    // 操作平台（钢格栅 + 栏杆，真实蒸发框架标配）
    var plat = this._box(8.0, 0.10, 5.0, this.makePaint(0x8a8a8a));
    plat.position.set(0, 3.05, 0); g.add(plat);
    for(var r=0;r<8;r++){
      var post = this._box(0.08, 3.0, 0.08, mm);
      post.position.set(-3.5 + (r%4)*2.3, 1.55, (r<4?-2.3:2.3)); g.add(post);
    }
    for(var h=0;h<2;h++){
      var rail = this._box(8.0, 0.06, 0.06, this.makePaint(0xddaa00));
      rail.position.set(0, 4.1 + h*0.5, (h===0?-2.3:2.3)); g.add(rail);
    }

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // B-901 厂区道路 + 堆场 + 绿化
  'B-901': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 环形主干道（用 4 段组成）
    var roadMat = this.makePaint(0x444444);
    // 北段
    var rN = this._box(50, 0.05, 6, roadMat);
    rN.position.set(0, 0.03, -40); g.add(rN);
    // 南段
    var rS = this._box(50, 0.05, 6, roadMat);
    rS.position.set(0, 0.03, 40); g.add(rS);
    // 西段
    var rW = this._box(6, 0.05, 80, roadMat);
    rW.position.set(-22, 0.03, 0); g.add(rW);
    // 东段
    var rE = rW.clone();
    rE.position.set(22, 0.03, 0); g.add(rE);
    // 黄色虚线中线
    var lineMat = this.makePaint(0xccaa22);
    for(var i=0;i<8;i++){
      var dash = this._box(1.5, 0.03, 0.25, lineMat);
      dash.position.set(-30 + i*8, 0.06, -40); g.add(dash);
      var dash2 = dash.clone();
      dash2.position.z = 40; g.add(dash2);
    }
    for(var i=0;i<10;i++){
      var dashV = this._box(0.25, 0.03, 1.5, lineMat);
      dashV.position.set(-22, 0.06, -35 + i*7); g.add(dashV);
      var dashV2 = dashV.clone();
      dashV2.position.x = 22; g.add(dashV2);
    }
    // 堆场（3 个）
    for(var i=0;i<3;i++){
      var cx = -12 + i*12;
      var berm = this._cyl(3.0, 3.5, 0.3, concrete, 20);
      berm.position.set(cx, 0.15, 55); g.add(berm);
      var pile = this._cone(2.0, 1.2, this.makePaint(0x8a7a5a), 16);
      pile.position.set(cx, 1.0, 55); g.add(pile);
    }
    // 绿化（12 棵树）
    for(var i=0;i<12;i++){
      var tx = (i%4 - 1.5) * 15;
      var tz = i < 6 ? -48 + Math.floor(i/4)*96 : -10;
      var trunk = this._cyl(0.1, 0.15, 1.0, this.makePaint(0x5a3a1a), 8);
      trunk.position.set(tx, 0.5, tz); g.add(trunk);
      var crown = this._cone(0.8, 1.5, this.makePaint(0x3a7a3a), 12);
      crown.position.set(tx, 1.8, tz); g.add(crown);
    }

    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // L-901 化验室
  'L-901': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x6a8a9a);
    var mm = this.makeMetal(0x555555);
    var concrete = this.makeConcrete();

    // 基础
    var base = this._box(4.0, 0.3, 3.0, concrete);
    base.position.y = 0.15; g.add(base);
    // 主体
    var body = this._box(3.5, 3.0, 2.5, pm, 24);
    body.position.y = 1.8; g.add(body);
    // 屋顶
    var roof = this._box(3.8, 0.2, 2.8, this.makePaint(0x556677), 24);
    roof.position.y = 3.45; g.add(roof);
    // 玻璃窗（3 扇）
    for(var i=0;i<3;i++){
      var win = this._box(0.8, 0.9, 0.05, this.makeGlass(0x88ccee, 0.5), 8);
      win.position.set(-1.0 + i*1.0, 2.0, 1.28); g.add(win);
    }
    // 门
    var door = this._box(0.8, 1.8, 0.08, this.makePaint(0x334455));
    door.position.set(1.4, 0.9, 1.28); g.add(door);
    // 排气罩（顶部）
    var vent = this._cyl(0.3, 0.3, 0.6, mm, 12);
    vent.position.set(-0.5, 3.8, 0); g.add(vent);
    // 标识
    var sign = this._box(1.0, 0.3, 0.05, this.makeLamp());
    sign.position.set(0, 3.1, 1.3); g.add(sign);

    g.scale.set(3.750, 1.220, 3.330);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  },

  // ---------- 默认兜底 ----------
  '_default': function(scene, eq){
    var g = new THREE.Group(); g.name = eq.tag;
    var pm = this.makePaint(0x8899aa);
    var box = this._box(1.5, 1.5, 1.5, pm);
    box.position.y = 0.75;
    g.add(box);
    g.position.set(eq.pos[0], 0, eq.pos[2]);
    g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);
    return g;
  }
};
