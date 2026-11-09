(function(){
  var BASE='__BASE__';
  var lang=function(){return localStorage.getItem('sefr.lang')==='en'?'en':'fr';};
  var T={fr:{title:'Assistant de la bibliothèque',ph:'Pose ta question sur un composant…',send:'Envoyer',hello:'Bonjour ! Je connais les composants de la bibliothèque : dis-moi ce que tu veux démontrer.',err:'Désolé, l’assistant est indisponible pour le moment.',wait:'…',seeAlso:'Fiches citées',reset:'Nouvelle conversation'},
         en:{title:'Library assistant',ph:'Ask about a component…',send:'Send',hello:'Hi! I know the library components — tell me what you want to demo.',err:'Sorry, the assistant is unavailable right now.',wait:'…',seeAlso:'Cited pages',reset:'New conversation'}};
  var css='#sfa-btn{position:fixed;right:20px;bottom:20px;z-index:9998;width:56px;height:56px;border-radius:50%;border:0;background:#0176d3;color:#fff;font-size:26px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)}'
  +'#sfa-box{position:fixed;right:20px;bottom:88px;z-index:9999;width:400px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);display:none;flex-direction:column;background:#fff;color:#181818;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:14px/1.5 system-ui,sans-serif;overflow:hidden}'
  +'#sfa-box.open{display:flex}#sfa-h{background:#0176d3;color:#fff;padding:12px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center;gap:10px}#sfa-h span{cursor:pointer;opacity:.85}#sfa-h span:hover{opacity:1}#sfa-t{flex:1}'
  +'#sfa-m{flex:1;overflow:auto;padding:12px;background:#f3f3f3}.sfa-b{margin:0 0 10px;padding:9px 12px;border-radius:10px;max-width:92%;word-wrap:break-word}.sfa-u{background:#0176d3;color:#fff;margin-left:auto;white-space:pre-wrap}.sfa-a{background:#fff;border:1px solid #ddd}'
  +'.sfa-a p{margin:0 0 8px}.sfa-a p:last-child{margin-bottom:0}.sfa-a h3{font-size:14.5px;margin:2px 0 8px;padding-bottom:6px;border-bottom:1px solid #eee}.sfa-a ul{margin:0 0 8px;padding-left:18px}.sfa-a li{margin:3px 0}.sfa-a code{background:#eef2f9;padding:1px 5px;border-radius:3px;font-size:12.5px}.sfa-a pre{background:#181818;color:#eee;padding:8px 10px;border-radius:6px;overflow:auto;margin:0 0 8px;font-size:12px}.sfa-a .sfa-k{color:#444;font-weight:600}'
  +'.sfa-a a.sfa-l{color:#0176d3;font-weight:600;text-decoration:none;border-bottom:1px dashed #0176d3}.sfa-a a.sfa-l:hover{background:#e8f3fd}'
  +'.sfa-cards{margin-top:10px;padding-top:8px;border-top:1px solid #eee}.sfa-cards small{display:block;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;font-size:10.5px}'
  +'a.sfa-card{display:flex;gap:10px;align-items:center;padding:6px;margin-bottom:6px;border:1px solid #ddd;border-radius:8px;text-decoration:none;color:inherit;background:#fafafa}a.sfa-card:hover{border-color:#0176d3;background:#f0f7fe}a.sfa-card img{width:64px;height:44px;object-fit:cover;border-radius:4px;background:#e5e5e5;flex:none}a.sfa-card b{display:block;font-size:13px;color:#0176d3}a.sfa-card i{display:block;font-style:normal;font-size:12px;color:#555;line-height:1.3}'
  +'#sfa-f{display:flex;border-top:1px solid #ddd}#sfa-i{flex:1;border:0;padding:12px;font:inherit;outline:0}#sfa-s{border:0;background:#fff;color:#0176d3;font-weight:600;padding:0 14px;cursor:pointer}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  // ---- catalogue (components + recipes) from the search index every page already embeds
  var byApi={},recipes=[],loaded=false;
  function load(){
    if(loaded||!window.__SE_INDEX)return;loaded=true;
    window.__SE_INDEX.forEach(function(e){
      if(e.api==='recipe'){recipes.push({title:(e.name||'').replace(/^📖\s*/,''),href:e.href,tagline:e.tagline});}
      else byApi[e.api]=e;
    });
  }
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function link(api){return '<a class="sfa-l" href="'+BASE+byApi[api].href+'">'+api+'</a>';}
  function inl(t){
    t=t.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
    t=t.replace(/\bseFr[A-Za-z0-9]+\b/g,function(m){return byApi[m]?link(m):m;});
    recipes.forEach(function(r){
      if(r.title&&r.title.length>5&&t.indexOf(esc(r.title))>-1&&t.indexOf('href="'+BASE+r.href)<0)
        t=t.split(esc(r.title)).join('<a class="sfa-l" href="'+BASE+r.href+'">'+esc(r.title)+'</a>');
    });
    // "Label — text" / "Label : text" at line start → bold label
    return t.replace(/^([^<>—:]{2,40}?)\s(—|:)\s/,function(_,k,s){return '<span class="sfa-k">'+k+'</span> '+s+' ';});
  }
  // The agent returns plain text (no markdown markers): rebuild structure from layout.
  function fmt(raw){
    var blocks=[];
    var s=esc(raw).replace(/```[a-z]*\n?([\s\S]*?)```/g,function(_,c){blocks.push(c);return '\n\n\u0000'+(blocks.length-1)+'\u0000\n\n';});
    var out=[];
    s.split(/\n\s*\n/).forEach(function(b){
      b=b.trim();if(!b)return;
      var m=b.match(/^\u0000(\d+)\u0000$/);if(m){out.push('<pre>'+blocks[m[1]]+'</pre>');return;}
      var lines=b.split('\n').map(function(l){return l.trim();}).filter(Boolean);
      if(lines.length&&/^(sf|npm|git|unzip)\s/.test(lines[0])){out.push('<pre>'+lines.join('\n')+'</pre>');return;}
      var isHead=/^(#{1,3}\s+|[\u{1F300}-\u{1FAFF}☀-➿⭐️])/u.test(lines[0])&&lines[0].length<90;
      if(isHead){out.push('<h3>'+inl(lines[0].replace(/^#{1,3}\s+/,''))+'</h3>');lines=lines.slice(1);}
      if(!lines.length)return;
      var bullets=lines.filter(function(l){return /^[-*•]\s+/.test(l);}).length;
      if(bullets===lines.length||(lines.length>=2&&lines.every(function(l){return l.length<220;}))){
        out.push('<ul>'+lines.map(function(l){return '<li>'+inl(l.replace(/^[-*•]\s+/,''))+'</li>';}).join('')+'</ul>');
      }else out.push('<p>'+lines.map(inl).join('<br>')+'</p>');
    });
    return out.join('');
  }
  function cards(raw){
    var seen=[],re=/\bseFr[A-Za-z0-9]+\b/g,m;
    while((m=re.exec(raw))){if(byApi[m[0]]&&seen.indexOf(m[0])<0)seen.push(m[0]);}
    var recs=recipes.filter(function(r){return r.title&&r.title.length>5&&raw.indexOf(r.title)>-1;}).slice(0,2);
    if(!seen.length&&!recs.length)return '';
    var h='<div class="sfa-cards"><small>'+T[lang()].seeAlso+'</small>';
    seen.slice(0,4).forEach(function(a){var e=byApi[a];
      h+='<a class="sfa-card" href="'+BASE+e.href+'"><img src="'+BASE+'assets/previews/'+a+'.png" alt="" onerror="this.style.display=\'none\'"><span><b>'+esc(e.name)+'</b><i>'+esc(e.tagline||'')+'</i></span></a>';});
    recs.forEach(function(r){h+='<a class="sfa-card" href="'+BASE+r.href+'"><span><b>📖 '+esc(r.title)+'</b><i>'+esc(r.tagline||'')+'</i></span></a>';});
    return h+'</div>';
  }
  function render(raw){load();return fmt(raw)+cards(raw);}

  // ---- UI
  var btn=document.createElement('button');btn.id='sfa-btn';btn.setAttribute('aria-label','Chat');btn.textContent='💬';
  var box=document.createElement('div');box.id='sfa-box';
  box.innerHTML='<div id="sfa-h"><div id="sfa-t"></div><span id="sfa-r" title="">↺</span><span id="sfa-x">✕</span></div><div id="sfa-m"></div><form id="sfa-f"><input id="sfa-i" autocomplete="off"><button id="sfa-s" type="submit"></button></form>';
  document.body.appendChild(btn);document.body.appendChild(box);
  var m=box.querySelector('#sfa-m'),inp=box.querySelector('#sfa-i'),busy=false;
  var ss=window.sessionStorage;
  var sid=ss.getItem('sfa.sid')||'',hist=[];try{hist=JSON.parse(ss.getItem('sfa.h')||'[]');}catch(e){}
  function save(){ss.setItem('sfa.sid',sid);ss.setItem('sfa.h',JSON.stringify(hist.slice(-40)));}
  function labels(){var t=T[lang()];box.querySelector('#sfa-t').textContent=t.title;inp.placeholder=t.ph;box.querySelector('#sfa-s').textContent=t.send;box.querySelector('#sfa-r').title=t.reset;}
  function add(cls,html){var d=document.createElement('div');d.className='sfa-b '+cls;d.innerHTML=html;m.appendChild(d);m.scrollTop=m.scrollHeight;return d;}
  function paint(){m.innerHTML='';if(!hist.length)add('sfa-a','<p>'+esc(T[lang()].hello)+'</p>');
    hist.forEach(function(h){if(h.r==='u'){add('sfa-u','').textContent=h.t;}else add('sfa-a',render(h.t));});}
  function setOpen(o){box.classList.toggle('open',o);ss.setItem('sfa.open',o?'1':'0');if(o){labels();inp.focus();m.scrollTop=m.scrollHeight;}}
  btn.onclick=function(){setOpen(!box.classList.contains('open'));};
  box.querySelector('#sfa-x').onclick=function(){setOpen(false);};
  box.querySelector('#sfa-r').onclick=function(){
    if(sid)fetch('/api/agent/end',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid})}).catch(function(){});
    sid='';hist=[];save();paint();};
  function ask(q,retry){
    return fetch('/api/agent/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid,message:q})})
      .then(function(r){if(!r.ok){if(sid&&!retry){sid='';return ask(q,true);}throw new Error(r.status);}return r.json();});
  }
  box.querySelector('#sfa-f').onsubmit=function(e){
    e.preventDefault();var q=inp.value.trim();if(!q||busy)return;inp.value='';busy=true;
    add('sfa-u','').textContent=q;hist.push({r:'u',t:q});var w=add('sfa-a',T[lang()].wait);
    ask(q).then(function(j){sid=j.sessionId||sid;var t=j.text||'';hist.push({r:'a',t:t});w.innerHTML=render(t);save();})
      .catch(function(){w.textContent=T[lang()].err;})
      .then(function(){busy=false;m.scrollTop=m.scrollHeight;});
  };
  labels();paint();if(ss.getItem('sfa.open')==='1')setOpen(true);
})();
