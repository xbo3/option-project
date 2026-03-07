// Generate site images dynamically
function generateSiteImage(name, color1, color2) {
  var c = document.createElement('canvas');
  c.width = 400; c.height = 200;
  var ctx = c.getContext('2d');
  var g = ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0, color1); g.addColorStop(1, color2);
  ctx.fillStyle = g; ctx.fillRect(0,0,400,200);
  for(var i=0;i<6;i++){
    ctx.beginPath();
    ctx.arc(Math.random()*400, Math.random()*200, 20+Math.random()*60, 0, Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.stroke();
  }
  ctx.fillStyle='#fff'; ctx.font='bold 36px Sora,sans-serif';
  ctx.fillText(name, 20, 100);
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(20,115,100,3);
  return c.toDataURL('image/jpeg', 0.7);
}
var SITE_COLORS = {
  "\uacdc\ube14\uc2dc\ud2f0":["#D4920F","#A06B08"],"\ubca7\ucf69":["#2660D4","#143CA0"],"\ub7ed\ud0a4\uc2a4\ud0c0":["#DC2626","#A01414"],
  "\ud06c\ub9ac\uc2a4\ud0c8\ubcb3":["#8B5CF6","#6438C8"],"\ud50c\ub798\ud2f0\ub118":["#94A3B8","#64748B"],"\ub2e4\uc774\uc544\ubaac\ub4dc":["#06B6D4","#0891B2"],
  "\ub85c\uc584\ud0b9":["#EAB308","#B48200"],"\uace8\ub4dc\ub7ec\uc2dc":["#F59E0B","#C87800"],"\uc5d0\uc774\uc2a4\ubcb3":["#10B981","#059669"],
  "\ube44\ud2b8\uc708":["#6366F1","#4338CA"]
};

var SAMPLE_SITES = [
  {"name":"\uacdc\ube14\uc2dc\ud2f0","cat":"casino","first":31,"reload":15,"cashback":5,"allin":20,"join":3,"rolling":300,"events":12,"insurance":true,"option":true,"rating":9.4,"reviews":328,"users":4520,"pkg_font":"gold","pkg_border":"gold","image":""},
  {"name":"\ubca7\ucf69","cat":"casino","first":31,"reload":12,"cashback":4,"allin":18,"join":2,"rolling":300,"events":8,"insurance":true,"option":true,"rating":9.1,"reviews":245,"users":3800,"pkg_font":"blue","pkg_border":"blue","image":""},
  {"name":"\ub7ed\ud0a4\uc2a4\ud0c0","cat":"slot","first":28,"reload":10,"cashback":3,"allin":15,"join":2,"rolling":500,"events":5,"insurance":false,"option":false,"rating":7.2,"reviews":89,"users":1200,"pkg_font":"","pkg_border":"","image":""},
  {"name":"\ud06c\ub9ac\uc2a4\ud0c8\ubcb3","cat":"casino","first":27,"reload":13,"cashback":6,"allin":22,"join":5,"rolling":400,"events":10,"insurance":true,"option":false,"rating":8.8,"reviews":190,"users":2900,"pkg_font":"purple","pkg_border":"purple","image":""},
  {"name":"\ud50c\ub798\ud2f0\ub118","cat":"sports","first":25,"reload":10,"cashback":3,"allin":12,"join":1,"rolling":400,"events":3,"insurance":false,"option":false,"rating":6.5,"reviews":45,"users":800,"pkg_font":"","pkg_border":"","image":""},
  {"name":"\ub2e4\uc774\uc544\ubaac\ub4dc","cat":"slot","first":25,"reload":14,"cashback":5,"allin":20,"join":3,"rolling":300,"events":9,"insurance":true,"option":true,"rating":9.0,"reviews":210,"users":3100,"pkg_font":"cyan","pkg_border":"cyan","image":""},
  {"name":"\ub85c\uc584\ud0b9","cat":"casino","first":24,"reload":11,"cashback":4,"allin":16,"join":2,"rolling":350,"events":7,"insurance":true,"option":false,"rating":8.5,"reviews":167,"users":2400,"pkg_font":"","pkg_border":"","image":""},
  {"name":"\uace8\ub4dc\ub7ec\uc2dc","cat":"sports","first":23,"reload":9,"cashback":3,"allin":14,"join":2,"rolling":300,"events":6,"insurance":false,"option":true,"rating":7.8,"reviews":120,"users":1600,"pkg_font":"orange","pkg_border":"orange","image":""},
  {"name":"\uc5d0\uc774\uc2a4\ubcb3","cat":"slot","first":22,"reload":12,"cashback":5,"allin":18,"join":3,"rolling":350,"events":8,"insurance":true,"option":false,"rating":8.2,"reviews":155,"users":2100,"pkg_font":"","pkg_border":"","image":""},
  {"name":"\ube44\ud2b8\uc708","cat":"etc","first":20,"reload":8,"cashback":2,"allin":10,"join":1,"rolling":500,"events":4,"insurance":false,"option":false,"rating":6.0,"reviews":30,"users":500,"pkg_font":"","pkg_border":"","image":""}
];

// Generate images for each site
SAMPLE_SITES.forEach(function(s){
  var c = SITE_COLORS[s.name];
  if(c) s.image = generateSiteImage(s.name, c[0], c[1]);
});
