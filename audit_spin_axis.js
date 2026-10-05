var fs=require('fs'),path=require('path'),vm=require('vm');
global.self=global; THREE=require('./lib/three.min.js');
function load(f){vm.runInThisContext(fs.readFileSync(path.join(__dirname,f),'utf8'),{filename:f});}
load('equipment_data.js');load('instrument_data.js');
load('lib/equip_builders.js');load('lib/pipes.js');load('lib/instrument_builders.js');
var scene=new THREE.Scene(),em=new Map();
EQUIPMENT.forEach(function(e){var fn=EQUIP_BUILDERS[e.tag];if(!fn)return;
  var g=fn.call(EQUIP_BUILDERS,scene,e);g.position.set(e.pos[0],e.pos[1],e.pos[2]);scene.add(g);em.set(e.tag,g);});
scene.updateMatrixWorld(true);

var AXIS={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
var nBad=0, nOk=0;
em.forEach(function(g,tag){
  g.traverse(function(o){
    if(!o.userData||!o.userData.motion||o.userData.motion.kind!=='spin')return;
    var m=o.userData.motion;
    var sw=AXIS[m.axis].clone().transformDirection(o.parent.matrixWorld); // 旋转轴→世界
    // 找本对象(或子对象)里第一个圆柱，取其几何Y轴的世界方向
    var geo=null;
    if(o.isMesh && o.geometry && o.geometry.type==='CylinderGeometry') geo=o;
    else o.traverse(function(c){ if(!geo && c.isMesh && c.geometry.type==='CylinderGeometry') geo=c; });
    if(!geo){ nOk++; return; }  // 非圆柱（浆叶组等）跳过
    var dir=new THREE.Vector3(0,1,0).transformDirection(geo.matrixWorld);
    var ang=sw.angleTo(dir)*180/Math.PI;
    if(ang>15){ nBad++;
      console.log('✗',tag,'spin-axis=' + m.axis + ' rpm=' + m.rpm,
        ' 圆柱轴向与旋转轴夹角=' + ang.toFixed(0) + '°',
        ' size=' + (function(){var b=new THREE.Box3().setFromObject(o);var s=b.getSize(new THREE.Vector3());return '('+s.x.toFixed(2)+','+s.y.toFixed(2)+','+s.z.toFixed(2)+')';})());
    } else nOk++;
  });
});
console.log('--- 轴向不匹配: ' + nBad + ' / 正常(或非圆柱): ' + nOk);
