// ============================================================
// 轻量 OrbitControls — 左键旋转 / 右键平移 / 滚轮缩放
// 用于自由视角模式
// ============================================================
var OrbitControls = (function () {
  function OrbitControls(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.target = new THREE.Vector3(0, 2, 0);
    this.enabled = true;
    this.enableDamping = true;
    this.dampingFactor = 0.08;
    this.minDistance = 2;
    this.maxDistance = 120;
    this.maxPolarAngle = Math.PI * 0.49;
    this.minPolarAngle = 0.01;
    this.autoRotate = false;
    this.autoRotateSpeed = 0.4;

    var self = this;
    var spherical = new THREE.Spherical();
    var sphericalDelta = new THREE.Spherical();

    var offset = camera.position.clone().sub(this.target);
    spherical.setFromVector3(offset);
    spherical.theta = Math.atan2(offset.x, offset.z);
    spherical.phi = Math.acos(THREE.MathUtils.clamp(offset.y / spherical.radius, -1, 1));

    var _lastPointer = {x: 0, y: 0};
    var _dragBtn = -1;

    function onPointerDown(e) {
      if (!self.enabled) return;
      e.preventDefault();
      _dragBtn = e.button;
      _lastPointer.x = e.clientX;
      _lastPointer.y = e.clientY;
      domElement.setPointerCapture(e.pointerId);
      window.addEventListener('pointermove', onPointerMove, false);
      window.addEventListener('pointerup', onPointerUp, false);
    }
    function onPointerMove(e) {
      if (!self.enabled || _dragBtn < 0) return;
      var dx = e.clientX - _lastPointer.x;
      var dy = e.clientY - _lastPointer.y;
      _lastPointer.x = e.clientX;
      _lastPointer.y = e.clientY;

      var rotSpeed = 0.003;

      if (_dragBtn === 0) {
        sphericalDelta.theta -= dx * rotSpeed;
        sphericalDelta.phi -= dy * rotSpeed;
      } else if (_dragBtn === 2 || _dragBtn === 1) {
        var panSpeed = spherical.radius * 0.001;
        var right = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0), camera.getWorldDirection(new THREE.Vector3())
        ).normalize();
        var forward = new THREE.Vector3().crossVectors(right, new THREE.Vector3(0, 1, 0)).normalize();
        var panVec = right.multiplyScalar(dx * panSpeed).add(forward.multiplyScalar(dy * panSpeed));
        self.target.add(panVec);
      }
    }
    function onPointerUp(e) {
      _dragBtn = -1;
      try { domElement.releasePointerCapture(e.pointerId); } catch(err) {}
      window.removeEventListener('pointermove', onPointerMove, false);
      window.removeEventListener('pointerup', onPointerUp, false);
    }
    function onWheel(e) {
      if (!self.enabled) return;
      e.preventDefault();
      var factor = e.deltaY > 0 ? 1.08 : 0.92;
      spherical.radius *= factor;
      spherical.radius = THREE.MathUtils.clamp(spherical.radius, self.minDistance, self.maxDistance);
    }
    function onCtxMenu(e) { e.preventDefault(); }

    domElement.addEventListener('pointerdown', onPointerDown, false);
    domElement.addEventListener('wheel', onWheel, {passive: false});
    domElement.addEventListener('contextmenu', onCtxMenu, false);

    this.update = function () {
      if (self.enableDamping) {
        spherical.theta += sphericalDelta.theta * self.dampingFactor * 1.2;
        spherical.phi += sphericalDelta.phi * self.dampingFactor * 1.2;
        sphericalDelta.theta *= (1 - self.dampingFactor);
        sphericalDelta.phi *= (1 - self.dampingFactor);
      } else {
        spherical.theta += sphericalDelta.theta;
        spherical.phi += sphericalDelta.phi;
        sphericalDelta.theta = 0;
        sphericalDelta.phi = 0;
      }

      if (self.autoRotate) {
        spherical.theta += THREE.MathUtils.degToRad(self.autoRotateSpeed) * 0.01;
      }

      spherical.phi = THREE.MathUtils.clamp(spherical.phi, self.minPolarAngle, self.maxPolarAngle);
      spherical.radius = THREE.MathUtils.clamp(spherical.radius, self.minDistance, self.maxDistance);

      var sinPhi = Math.sin(spherical.phi);
      var cosPhi = Math.cos(spherical.phi);
      camera.position.set(
        self.target.x + spherical.radius * sinPhi * Math.sin(spherical.theta),
        self.target.y + spherical.radius * cosPhi,
        self.target.z + spherical.radius * sinPhi * Math.cos(spherical.theta)
      );
      camera.lookAt(self.target);
    };

    this.dispose = function () {
      domElement.removeEventListener('pointerdown', onPointerDown, false);
      domElement.removeEventListener('wheel', onWheel, false);
      domElement.removeEventListener('contextmenu', onCtxMenu, false);
    };
  }
  return OrbitControls;
})();
