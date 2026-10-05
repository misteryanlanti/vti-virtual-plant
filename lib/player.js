// ============================================================
// 第一人称漫游控制器
// WASD移动 + 鼠标视角(指针锁定) + Shift加速
// ============================================================
var Player = function(camera, domElement, options) {
  var self = this;
  var opts = options || {};
  this.speed = opts.speed || 5.0;
  this.sprintMult = opts.sprintMult || 2.5;
  this.height = opts.height || 1.7;
  this.fov = opts.fov || 60;
  this.enabled = true;
  this.mode = 'walk'; // walk | free

  this.camera = camera;
  this.dom = domElement;
  this.keys = {};
  this.locked = false;
  this.velY = 0;

  // 水平视角
  this.yaw = 0;
  this.pitch = 0;

  // 初始位置
  camera.position.set(0, this.height, 65);
  camera.rotation.order = 'YXZ';
  camera.rotation.x = 0;
  camera.rotation.y = 0;
  camera.rotation.z = 0;
  camera.fov = this.fov;
  camera.updateProjectionMatrix();

  // 事件
  this._onKeyDown = function(e) { self.keys[e.code] = true; };
  this._onKeyUp = function(e) { self.keys[e.code] = false; };

  this._onMouseMove = function(e) {
    if (!self.locked) return;
    var sens = 0.002;
    self.yaw -= e.movementX * sens;
    self.pitch -= e.movementY * sens;
    self.pitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, self.pitch));
  };

  this._onMouseDown = function(e) {
    if (!self.locked && self.mode === 'walk' && self.enabled) {
      self.lock();
    }
  };

  this._onLockChange = function() {
    self.locked = (document.pointerLockElement === domElement);
    var hint = document.getElementById('hint');
    if (hint) {
      if (self.locked) {
        hint.textContent = 'WASD移动 · Shift加速 · 鼠标环视 · 点击设备看数据';
        hint.style.color = '#88ccaa';
      } else {
        hint.textContent = '点击画面锁定鼠标进入第一人称漫游 · WASD移动 · Shift加速';
        hint.style.color = '#ffd54f';
      }
    }
  };

  document.addEventListener('keydown', this._onKeyDown);
  document.addEventListener('keyup', this._onKeyUp);
  document.addEventListener('mousemove', this._onMouseMove);
  domElement.addEventListener('mousedown', this._onMouseDown);
  document.addEventListener('pointerlockchange', this._onLockChange);

  this.lock = function() {
    domElement.requestPointerLock();
  };
  this.unlock = function() {
    document.exitPointerLock();
  };

  this.update = function(dt) {
    if (!this.enabled || this.mode !== 'walk') return;
    var speed = this.speed;
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) speed *= this.sprintMult;

    var dx = 0, dz = 0;
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'))
    );
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'))
    );

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    dz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])   dz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])   dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight'])  dx += 1;

    if (dz !== 0 || dx !== 0) {
      var len = Math.sqrt(dx*dx + dz*dz);
      dx /= len; dz /= len;
      var move = new THREE.Vector3();
      move.addScaledVector(fwd, -dz * speed * dt);
      move.addScaledVector(right, dx * speed * dt);
      this.camera.position.add(move);
      // 限制在厂区
      this.camera.position.x = Math.max(-52, Math.min(52, this.camera.position.x));
      this.camera.position.z = Math.max(-52, Math.min(70, this.camera.position.z));
    }

    // 保持人眼高度
    this.camera.position.y = this.height;

    // 应用视角
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  };

  this.teleport = function(x, y, z, lookX, lookZ) {
    this.camera.position.set(x, this.height, z);
    if (lookX !== undefined && lookZ !== undefined) {
      this.yaw = Math.atan2(lookX - x, lookZ - z);
      this.pitch = 0;
      this.camera.rotation.set(0, this.yaw, 0, 'YXZ');
    }
  };

  this.dispose = function() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.dom.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  };
};
