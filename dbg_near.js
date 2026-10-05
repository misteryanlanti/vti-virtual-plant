var fs=require('fs'),path=require('path'),vm=require('vm');
global.self=global; THREE=require('./lib/three.min.js');
function load(f){vm.runInThisContext(fs.readFileSync(path.join(__dirname,f),'utf8'),{filename:f});}
load('equipment_data.js');load('instrument_data.js');
load('lib/equip_builders.js');load('lib/pipes.js');load('lib/instrument_builders.js');
var scene=new THREE.Scene(),em=new Map();
EQUIPMENT.forEach(function(e){var fn=EQUIP_BUILDERS[e.tag];if(!fn)return;
  var g=fn.call(EQUIP_BUILDERS,scene,e);g.position.set(e.pos[0],e.pos[1],e.pos[2]);scene.add(g);em.set(e.tag,g);});
scene.updateMatrixWorld(true);
// S-201 位于 (-32,-32)，查 20m 范围内带 motion 的部件
var cx=-32,cz=-32;
em.forEach(function(g,tag){
  var p=g.position;
  var d=Math.sqrt((p.x-cx)*(p.x-cx)+(p.z-cz)*(p.z-cz));
  if(d>25)return;
  g.traverse(function(o){
    if(o.isMesh && o.userData && o.userData.motion){
      var b=new THREE.Box3().setFromObject(o);
      var s=b.getSize(new THREE.Vector3());
      var col=o.material&&o.material.color?o.material.color.getHexString():'?';
      console.log(tag,'motion=' + o.userData.motion.kind + ':' + (o.userData.motion.axis||'') ,
        'size=(' + s.x.toFixed(2) + ',' + s.y.toFixed(2) + ',' + s.z.toFixed(2) + ')',
        'boxMinY=' + b.min.y.toFixed(2), 'color=#' + col,
        'center=(' + ((b.min.x+b.max.x)/2).toFixed(1) + ',' + ((b.min.y+b.max.y)/2).toFixed(1) + ',' + ((b.min.z+b.max.z)/2).toFixed(1) + ')');
    }
  });
});
