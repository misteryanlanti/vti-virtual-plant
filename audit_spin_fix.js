// 增强诊断：对每个 spin 部件算出"长轴方向 -> 父坐标系最接近轴(建议轴)"，
// 标注 180°(平行=正确) vs 90°(真错=翻滚)，并记录源码行号便于精确修改。
var fs=require('fs'),path=require('path'),vm=require('vm');
global.self=global; THREE=require('./lib/three.min.js');
function load(f){vm.runInThisContext(fs.readFileSync(path.join(__dirname,f),'utf8'),{filename:f});}
load('equipment_data.js');load('instrument_data.js');
load('lib/equip_builders.js');load('lib/pipes.js');load('lib/instrument_builders.js');

// monkey-patch：记录 _spin 调用所在的 equip_builders.js 源码行号
var origSpin = EQUIP_BUILDERS._spin;
EQUIP_BUILDERS._spin = function(mesh, rpm, axis, px,py,pz){
  var e=new Error(), st=e.stack.split('\n'), line='?';
  for (var i=0;i<st.length;i++){ var mm=st[i].match(/equip_builders\.js:(\d+)/); if(mm){ line=mm[1]; break; } }
  var r=origSpin.apply(this, arguments);
  if (mesh && mesh.userData && mesh.userData.motion) mesh.userData.motion._line=line;
  return r;
};

var scene=new THREE.Scene(), em=new Map(), currentTag=null;
EQUIPMENT.forEach(function(e){
  var fn=EQUIP_BUILDERS[e.tag]; if(!fn) return;
  currentTag=e.tag;
  var g=fn.call(EQUIP_BUILDERS,scene,e); g.position.set(e.pos[0],e.pos[1],e.pos[2]); scene.add(g); em.set(e.tag,g);
});
scene.updateMatrixWorld(true);

var AXIS={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};

function suggest(o){
  var geo=null;
  if(o.isMesh && o.geometry && o.geometry.type==='CylinderGeometry') geo=o;
  else o.traverse(function(c){ if(!geo && c.isMesh && c.geometry.type==='CylinderGeometry') geo=c; });
  if(geo) return new THREE.Vector3(0,1,0).transformDirection(geo.matrixWorld);
  // 非圆柱：用包围盒最长轴（设备 group 一般无旋转，最长轴平行世界轴）
  var bb=new THREE.Box3().setFromObject(o), s=bb.getSize(new THREE.Vector3());
  if(s.x>=s.y && s.x>=s.z) return new THREE.Vector3(1,0,0);
  if(s.y>=s.x && s.y>=s.z) return new THREE.Vector3(0,1,0);
  return new THREE.Vector3(0,0,1);
}

var fixes=[];
em.forEach(function(g,tag){
  g.traverse(function(o){
    if(!o.userData || !o.userData.motion || o.userData.motion.kind!=='spin') return;
    var m=o.userData.motion;
    var sw=AXIS[m.axis].clone().transformDirection(o.parent.matrixWorld);
    var dir=suggest(o);
    var ang=sw.angleTo(dir)*180/Math.PI;
    var pm=o.parent?o.parent.matrixWorld:new THREE.Matrix4();
    var ax=AXIS.x.clone().transformDirection(pm), ay=AXIS.y.clone().transformDirection(pm), az=AXIS.z.clone().transformDirection(pm);
    var cx=Math.abs(dir.dot(ax)), cy=Math.abs(dir.dot(ay)), cz=Math.abs(dir.dot(az));
    var best='y'; if(cx>=cy&&cx>=cz) best='x'; else if(cy>=cx&&cy>=cz) best='y'; else best='z';
    var status = (Math.abs(ang-180)<15)?'parallel-OK':(ang>15?'WRONG':'OK');
    if(status==='WRONG') fixes.push({tag:tag,line:parseInt(m._line,10),cur:m.axis,best:best,ang:ang});
    console.log([tag,'L'+m._line,'cur='+m.axis,'ang='+ang.toFixed(0),'best='+best,status,'c='+cx.toFixed(2)+'/'+cy.toFixed(2)+'/'+cz.toFixed(2)].join('  '));
  });
});
console.log('=== 需修改(真错): '+fixes.length);
fixes.forEach(function(f){ console.log(f.tag,'L'+f.line,'cur='+f.cur,'-> best='+f.best); });
