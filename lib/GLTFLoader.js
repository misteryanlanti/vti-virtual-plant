/**
 * 轻量 GLTFLoader — 解析 glTF 2.0 JSON + 外部 .bin 文件
 * 替代 three/addons/loaders/GLTFLoader.js
 * 用法: var loader = new GLTFLoader(); loader.load(url, onLoad, onProgress, onError);
 */
var GLTFLoader = (function () {
  var GLTFComponentTypes = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
  };
  var GLTFComponentSizes = {
    SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 4
  };

  function GLTFLoader() {
    this.manager = { resolveURL: function (u) { return new URL(u, document.baseURI).href; } };
  }

  GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    var self = this;
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText + ' @ ' + url);
        return res.text();
      })
      .then(function (text) {
        var gltf = JSON.parse(text);
        var dir = url.slice(0, url.lastIndexOf('/') + 1);
        self._parse(gltf, dir).then(function (result) {
          onLoad(result);
        }).catch(function (err) {
          if (onError) onError(err); else console.error('GLTFLoader parse failed:', err);
        });
      })
      .catch(function (err) {
        if (onError) onError(err); else console.error('GLTFLoader fetch failed:', err);
      });
  };

  GLTFLoader.prototype._parse = function (gltf, dir) {
    var self = this;
    var baseDir = dir;

    // 并发加载所有外部 buffer
    var bufferPromises = gltf.buffers.map(function (buf) {
      if (!buf.uri) return Promise.resolve(new ArrayBuffer(0));
      var bufUrl = baseDir + buf.uri;
      return fetch(bufUrl).then(function (res) {
        if (!res.ok) throw new Error('buffer fetch HTTP ' + res.status + ' @ ' + bufUrl);
        return res.arrayBuffer();
      });
    });

    return Promise.all(bufferPromises).then(function (bufferArrayBuffers) {
      var buffers = bufferArrayBuffers.map(function (ab) { return new Uint8Array(ab); });
      var result = { scene: new THREE.Group(), sceneName: gltf.asset ? gltf.asset.generator : 'glTF', parser: null };

      // 构建 accessor 读取器
      function getAccessorData(accessorIndex) {
        var acc = gltf.accessors[accessorIndex];
        var bv = gltf.bufferViews[acc.bufferView];
        var buf = buffers[bv.buffer];
        var offset = (bv.byteOffset || 0) + acc.byteOffset;
        var T = GLTFComponentTypes[acc.componentType];
        var compSize = GLTFComponentSizes[acc.type];
        var count = acc.count;
        if (acc.type === 'SCALAR') {
          return new T(buf.buffer, offset, count);
        } else {
          return new T(buf.buffer, offset, count * compSize);
        }
      }

      // 构建 mesh
      gltf.meshes.forEach(function (meshDef, meshIdx) {
        var group = new THREE.Group();
        group.name = meshDef.name || ('mesh_' + meshIdx);

        meshDef.primitives.forEach(function (prim, primIdx) {
          var posAcc = prim.attributes['POSITION'];
          var positions = getAccessorData(posAcc);
          var nCount = positions.length / 3;

          var geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

          if (prim.attributes['NORMAL'] !== undefined) {
            var normals = getAccessorData(prim.attributes['NORMAL']);
            geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
          }

          if (prim.indices !== undefined) {
            var idxData = getAccessorData(prim.indices);
            geo.setIndex(new THREE.BufferAttribute(idxData, 1));
          }

          // 材质
          var matDef = gltf.materials ? gltf.materials[prim.material] : null;
          var mat;
          if (matDef && matDef.pbrMetallicRoughness) {
            var c = matDef.pbrMetallicRoughness.baseColorFactor;
            mat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(c[0], c[1], c[2]),
              roughness: matDef.pbrMetallicRoughness.roughnessFactor != null ? matDef.pbrMetallicRoughness.roughnessFactor : 0.8,
              metalness: matDef.pbrMetallicRoughness.metallicFactor != null ? matDef.pbrMetallicRoughness.metallicFactor : 0.2,
              side: THREE.DoubleSide
            });
          } else {
            mat = new THREE.MeshStandardMaterial({
              color: 0x888888, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide
            });
          }

          var mesh = new THREE.Mesh(geo, mat);
          mesh.name = group.name + '_' + primIdx;
          group.add(mesh);
        });

        result.scene.add(group);
      });

      // 设置 node 变换（简化：直接挂到 scene）
      // 我们由调用方（factory.js）自行设置 group.position/scale

      return result;
    });
  };

  return GLTFLoader;
})();
