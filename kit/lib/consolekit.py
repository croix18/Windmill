"""The console: the unit's HTML deck with the day wrapped around it (Room Coordination Plan, phase 3).

Same slides as the lesson decks, drawn by htmlkit, plus: a TODAY screen that knows the period from the
bell, the plan's lesson for the date and this period's bookmark; a RAIL of the lesson's segments with
their minutes (the TE timing table, live); a PACING line against the clock; the WHITEBOARD ROUND run
like a question in Geopardy — timer, boards up, stepped reveal, a tally of the letters the room held;
per-period RESUME; the room (Windmill) read through room-reader.js, with the room code typed once.
What it writes: the `panel` part of the room (bookmarks, tallies, pacing) in this browser's store, in
the shape Deckhand will publish. Nothing teacher-only is drawn on the slide surface (ruling 12).
"""
import json, os
from .htmlkit import esc, render_page, _read
from .profile import C

HERE = os.path.dirname(os.path.abspath(__file__))
WM = os.path.join(HERE, "..", "assets", "windmill")
PERIOD_MIN = C.PERIOD
INDEX_TITLE = "Settle in; post the learning target"


def _segments(side, first, last, course_min=PERIOD_MIN):
    """Group a lesson's slides into the TE's segments (the same rule as tekit.plan_from_sidecar):
    consecutive slides with one title are one block; every whiteboard slide is the one Whiteboards
    block, which takes the minutes the fixed blocks leave."""
    blocks = []
    for k in range(first, last):
        s = side[k]
        seg = s["title"] if s["kind"] != "wb" else "Whiteboards"
        if s["kind"] == "title":
            seg = INDEX_TITLE
        if blocks and blocks[-1]["title"] == seg:
            blocks[-1]["last"] = k; blocks[-1]["min"] += s["min"]
        else:
            blocks.append({"title": seg, "kind": s["kind"], "first": k, "last": k, "min": s["min"]})
    fixed = sum(b["min"] for b in blocks if b["kind"] != "wb")
    counts = {}
    for b in blocks:
        if b["kind"] == "wb":
            b["min"] = course_min - fixed
        base = {"title": "settle", "warmup": "wu", "notes": "notes", "example": "ex", "yourturn": "yt", "wb": "wb",
                "independent": "ind", "set": "ind", "close": "close", "ixl": "ixl"}.get(b["kind"], b["kind"])
        counts[base] = counts.get(base, 0) + 1
        b["id"] = base + (str(counts[base]) if base in ("ex", "yt") else "")
        b["short"] = {"settle": "Settle in", "wu": "Warm-Up", "notes": "Notes", "wb": "Whiteboards", "ind": "Independent", "close": "Before You Go", "ixl": "IXL"}.get(base, b["title"])
    return blocks


def unit_index(D, course_key, unit):
    """Everything the console's JS needs about the deck, derived from what the deck recorded."""
    lessons = []
    for j, L in enumerate(D.lessons):
        first = L["first"]
        last = D.lessons[j + 1]["first"] if j + 1 < len(D.lessons) else len(D.slides)
        segs = _segments(D.side, first, last)
        boards = [{"slide": k, "i": D.slides[k]["wb"]["i"], "reveal": D.slides[k]["wb"]["reveal"]}
                  for k in range(first, last) if D.slides[k].get("wb")]
        lessons.append({"code": L["code"], "label": L["label"], "title": L["title"], "first": first, "last": last - 1,
                        "segments": segs, "boards": boards})
    return {"course": course_key, "unit": unit, "title": D.page_title, "lessons": lessons, "periodMin": PERIOD_MIN}


def render_console(D, course_key=None):
    course_key = course_key or C.COURSE_KEY
    """The page: htmlkit's slides and chrome inside, the console around them."""
    base = render_page(D)
    idx = unit_index(D, course_key, D.unit)
    version = open(os.path.join(WM, "VERSION")).read().strip() if os.path.exists(os.path.join(WM, "VERSION")) else "Windmill (unvendored)"
    head_extra = "<style>" + CSS + "</style>"
    chrome = CHROME.replace("{{TITLE}}", esc(f"Unit {D.unit} · {D.page_title}")).replace("{{UNIT}}", str(D.unit)).replace("{{VERSION}}", esc(version))
    def inline(name):                             # a "</script" inside an inlined file would end the block
        return open(os.path.join(WM, name), encoding="utf-8").read().replace("</script", "<\\/script")
    tail = ("<script>" + inline("spine.js") + "</script>"
            "<script>window.BENCHMARKS=" + inline("benchmarks.json") + ";</script>"
            "<script>" + inline("room-reader.js") + "</script>"
            "<script>window.UNIT=" + json.dumps(idx, ensure_ascii=True) + ";</script>"
            "<script>" + JS + "</script>")
    page = base.replace("</style></head><body>", "</style>" + head_extra + "</head><body class=\"console\">", 1)
    page = page.replace('<div id="stage">', chrome + '<div id="stage">', 1)
    page = page.replace("</body></html>", tail + "</body></html>")
    return page


CHROME = r"""
<div id="bar">
  <button id="railBtn" class="cb" title="Lesson rail (L)">☰</button>
  <div id="barLesson"><b id="barCode"></b> <span id="barTitle"></span></div>
  <div id="barSeg"><span id="segName"></span><span id="pace" class="pace"></span></div>
  <div id="barClock"><span id="periodNow"></span><span id="bellLeft"></span><span id="clock"></span></div>
  <button id="todayBtn" class="cb" title="Today (Esc)">Today</button>
</div>
<aside id="rail">
  <div class="railHead"><span>Unit {{UNIT}}</span><button id="lessonsBtn" class="lk">Lessons ▾</button></div>
  <ol id="lessonList" class="hidden"></ol>
  <ol id="segList"></ol>
  <div id="round" class="hidden">
    <div class="rh">Boards <b id="roundN"></b></div>
    <div id="timerBox"><div id="timerRing"><span id="timerDigits">0:45</span></div>
      <div class="tbtns"><button data-t="30">0:30</button><button data-t="45">0:45</button><button data-t="60">1:00</button><button data-t="90">1:30</button></div>
      <div class="tbtns"><button id="tStart" class="go">Start</button><button id="tStop">Stop</button></div></div>
    <div id="tally"></div>
    <div id="tallyNote" class="tn"></div>
  </div>
  <div class="railFoot"><span id="roomLine"></span><button id="roomBtn" class="lk">room code</button></div>
</aside>
<div id="today" class="hidden">
  <div class="tcard">
    <p class="eyebrow">{{TITLE}}</p>
    <h1 id="tDate"></h1>
    <p id="tPeriod" class="tline"></p>
    <p id="tPlan" class="tline"></p>
    <p id="tRoom" class="tline quiet"></p>
    <div class="tbtn"><button id="tResume" class="big"></button><button id="tStart2" class="big"></button><button id="tPick">Choose a lesson…</button></div>
    <div id="tPickList" class="hidden"></div>
    <div class="tper">Period: <span id="tPerBtns"></span></div>
    <p class="tiny">{{VERSION}} · Space or → advance · ← back · L rail · T timer · R reveal · Esc here · P print one slide per page</p>
  </div>
</div>
<div id="codeBox" class="hidden"><div class="tcard small"><h2>Room code</h2><p>From Tally. Either form: <code>A3 W 8NSO13 7NSO11</code> or <code>4CG2-P5CD-…</code></p>
  <input id="codeIn" placeholder="type or paste the code"><p id="codeMsg" class="quiet"></p><div class="tbtn"><button id="codeSave" class="big">Save</button><button id="codeClose">Close</button></div></div></div>
"""

CSS = r"""
body.console{background:#1f2328;overflow:hidden}
#bar{position:fixed;left:0;right:0;top:0;height:40px;background:#111418;color:#ddd;display:flex;align-items:center;gap:14px;padding:0 10px;font:14px/1 system-ui,sans-serif;z-index:20;border-bottom:1px solid #2a2f36}
#bar .cb{background:#2a2f36;color:#eee;border:0;border-radius:6px;padding:7px 11px;font:inherit;cursor:pointer}
#barLesson{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#barLesson b{color:#fff;margin-right:6px}
#barSeg{margin-left:auto;display:flex;align-items:center;gap:10px;color:#9fb4c7}
.pace{padding:3px 8px;border-radius:10px;background:#2a2f36;color:#ddd}.pace.ahead{background:#1d4d3a;color:#bff2d6}.pace.behind{background:#5a2a24;color:#ffd4cc}
#barClock{display:flex;gap:14px;font-variant-numeric:tabular-nums;color:#ddd}#barClock span:empty{display:none}#periodNow{font-weight:700;color:#fff}
#rail{position:fixed;left:0;top:40px;bottom:0;width:300px;background:#15181c;color:#ddd;font:14px/1.35 system-ui,sans-serif;overflow-y:auto;z-index:15;border-right:1px solid #2a2f36;display:flex;flex-direction:column}
body.norail #rail{display:none}
.railHead{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;color:#9fb4c7;border-bottom:1px solid #2a2f36}
.lk{background:none;border:0;color:#9fb4c7;font:inherit;cursor:pointer;text-decoration:underline;padding:0}
#rail ol{list-style:none;margin:0;padding:6px 0}
#rail li{display:flex;justify-content:space-between;gap:8px;padding:7px 12px;cursor:pointer;border-left:3px solid transparent}
#rail li:hover{background:#1d2228}#rail li.on{border-left-color:#f2c14e;background:#20262d;color:#fff}
#rail li.done{color:#8a93a0}#rail li .m{color:#9fb4c7;font-variant-numeric:tabular-nums;white-space:nowrap}
#lessonList li{font-weight:600}#lessonList li small{display:block;font-weight:400;color:#9fb4c7}
.hidden{display:none!important}
#round{border-top:1px solid #2a2f36;padding:10px 12px}.rh{color:#9fb4c7;margin-bottom:6px}.rh b{color:#fff}
#timerRing{width:120px;height:120px;border-radius:50%;margin:4px auto;display:flex;align-items:center;justify-content:center;background:conic-gradient(#f2c14e var(--p,0%),#2a2f36 0);position:relative}
#timerRing::before{content:'';position:absolute;inset:9px;border-radius:50%;background:#15181c}
#timerDigits{position:relative;font:700 30px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:#fff}
#timerRing.low #timerDigits{color:#ff8a7a}#timerRing.done{animation:flash .6s 3}
@keyframes flash{50%{background:#f2c14e}}
.tbtns{display:flex;gap:6px;justify-content:center;margin:6px 0}.tbtns button{background:#2a2f36;color:#eee;border:0;border-radius:6px;padding:6px 9px;font:inherit;cursor:pointer}.tbtns button.sel{background:#f2c14e;color:#111}.tbtns button.go{background:#2e7d32;color:#fff}
#tally{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px}
#tally .tile{background:#2a2f36;border-radius:8px;padding:10px 8px;text-align:center;cursor:pointer;user-select:none;border:2px solid transparent}
#tally .tile .L{font-weight:700;font-size:18px}#tally .tile .c{font-size:26px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
#tally .tile.key{border-color:#f2c14e}#tally .tile small{display:block;color:#9fb4c7;font-size:11px;min-height:14px}
.tn{color:#9fb4c7;font-size:12px;margin-top:8px;line-height:1.3}
.railFoot{margin-top:auto;border-top:1px solid #2a2f36;padding:10px 12px;color:#9fb4c7;font-size:12px;display:flex;justify-content:space-between;gap:8px}
#today,#codeBox{position:fixed;inset:0;background:rgba(10,12,15,.92);z-index:40;display:flex;align-items:center;justify-content:center;font:16px/1.4 system-ui,sans-serif;color:#eee}
.tcard{background:#1b1f25;border:1px solid #2a2f36;border-radius:14px;padding:30px 38px;width:min(860px,92vw);max-height:92vh;overflow:auto;font-size:18px}
.tcard.small{width:min(520px,92vw)}
.tcard .eyebrow{margin:0;color:#9fb4c7;letter-spacing:.06em;text-transform:uppercase;font-size:12px}
.tcard h1{margin:6px 0 14px;font-size:34px;color:#fff}.tcard h2{margin:0 0 8px}
.tline{margin:8px 0;font-size:21px}.tline b{color:#fff}.quiet{color:#9fb4c7;font-size:14px}
.tbtn{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 8px}
.tbtn button{background:#2a2f36;color:#eee;border:0;border-radius:8px;padding:10px 14px;font:inherit;cursor:pointer}
.tbtn button.big{background:#f2c14e;color:#111;font-weight:700;font-size:17px;padding:12px 18px}
.tbtn button:empty{display:none}
#tPickList{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}#tPickList button{text-align:left;background:#2a2f36;color:#eee;border:0;border-radius:8px;padding:8px 10px;font:inherit;cursor:pointer}
#tPickList button b{display:inline-block;width:46px}
.tper{margin-top:10px;color:#9fb4c7}.tper button{background:#2a2f36;color:#eee;border:0;border-radius:6px;padding:4px 9px;margin:0 2px;font:inherit;cursor:pointer}.tper button.sel{background:#f2c14e;color:#111}
.tiny{color:#6f7a86;font-size:12px;margin:14px 0 0}
#codeIn{width:100%;box-sizing:border-box;font:16px/1.3 ui-monospace,monospace;padding:10px;border-radius:8px;border:1px solid #2a2f36;background:#0f1216;color:#fff}
.slide.veiled .answer,.slide.veiled .wa{visibility:hidden}
.slide.veiled ol.choices li.correct{color:inherit;font-weight:400}
body.console #hud{display:none}
@media print{#bar,#rail,#today,#codeBox{display:none!important}.slide.veiled .answer,.slide.veiled .wa{visibility:visible}}
"""

JS = r"""
(function(){
  'use strict';
  const U=window.UNIT, S=window.SPINE, LS='windmill.panel.v1', LSC='windmill.code', LSP='windmill.period';
  const slides=[...document.querySelectorAll('.slide')], stage=document.getElementById('stage');
  const $=id=>document.getElementById(id);
  const W=1333.33,H=750;
  // ---- geometry: the stage fits the space the bar and rail leave ------------------------------
  function fit(){const rail=document.body.classList.contains('norail')?0:300;const aw=innerWidth-rail,ah=innerHeight-40;const s=Math.min(aw/W,ah/H);
    stage.style.transform=`translate(-50%,-50%) scale(${s})`;stage.style.left=(rail+aw/2)+'px';stage.style.top=(40+ah/2)+'px';}
  addEventListener('resize',fit);
  // ---- time, bell, period ---------------------------------------------------------------------------
  const pad=n=>String(n).padStart(2,'0');
  function todayISO(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function mins(hhmm){const [h,m]=hhmm.split(':').map(Number);return (h<8?h+12:h)*60+m;}   // the bell writes 1:15 for 13:15
  function dayInfo(d){return S&&S.days&&S.days[todayISO(d)]||null;}
  function periodAt(d){const di=dayInfo(d);if(!di||!di.periods)return null;const t=d.getHours()*60+d.getMinutes();
    for(const p of di.periods){if(t>=mins(p.start)-3&&t<=mins(p.end))return Object.assign({},p);}
    // between periods: the next one
    for(const p of di.periods){if(t<mins(p.start))return Object.assign({next:true},p);} return null;}
  function block(d,period){const di=dayInfo(d);if(!di||!di.periods)return null;return di.periods.find(p=>p.period===period)||null;}
  const course=U.course;
  function periodCourse(p){return S&&S.periods?S.periods[String(p)]:null;}
  // ---- state: the panel part of the room, in this browser -----------------------------------------
  let panel; try{panel=JSON.parse(localStorage.getItem(LS))||null;}catch(e){panel=null;}
  if(!panel||typeof panel!=='object')panel={at:new Date().toISOString(),periods:{},tallies:[],pacing:[]};
  panel.periods=panel.periods||{};panel.tallies=panel.tallies||[];panel.pacing=panel.pacing||[];
  function savePanel(){panel.at=new Date().toISOString();try{localStorage.setItem(LS,JSON.stringify(panel));}catch(e){}window.ROOM_PANEL={v:1,panel:panel};}
  let period=null; const hp=/#?period=(\d)/.exec(location.hash+location.search); if(hp)period=+hp[1];
  if(!period){try{const sp=JSON.parse(localStorage.getItem(LSP)||'null');if(sp&&sp.on===todayISO())period=sp.period;}catch(e){}}
  if(!period){const pa=periodAt(new Date());if(pa&&!pa.next)period=pa.period;}
  function setPeriod(p){period=p;try{localStorage.setItem(LSP,JSON.stringify({period:p,on:todayISO()}));}catch(e){}paintToday();paintBar();}
  // ---- the room (Windmill) -------------------------------------------------------------------------
  let room=null, roomErr='';
  function loadRoom(){let code='';try{code=localStorage.getItem(LSC)||'';}catch(e){}
    try{room=Room.load({win:window,code:code,list:window.BENCHMARKS,allowProblems:true});roomErr=room.problems.length?room.problems[0]:'';}
    catch(e){room=null;roomErr=e.message;}}
  function roomText(){if(!room)return 'room: '+(roomErr||'not read');const u=room.unit(course);const age=room.age('tally');
    if(u==null)return 'room: plan only (no word from Tally yet)';
    const src=room.source.tally==='code'?'by code':room.source.tally; return `Tally says Unit ${u} · ${age===Infinity?'':(age<1?'today':Math.round(age)+' d ago')} ${src}`.replace(/\s+/g,' ');}
  // ---- lessons, segments, slides -----------------------------------------------------------------
  let cur=0;
  function lessonOf(k){return U.lessons.find(L=>k>=L.first&&k<=L.last)||null;}
  function segOf(L,k){return L?L.segments.find(s=>k>=s.first&&k<=s.last)||null:null;}
  function lessonByCode(c){return U.lessons.find(L=>L.code===c)||null;}
  function show(n,opts){opts=opts||{};n=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,k)=>s.classList.toggle('on',k===n));cur=n;
    const L=lessonOf(n),seg=segOf(L,n);
    // stepped reveal: an answer slide shows its question first; Space / click lifts the veil
    const hasAns=slides[n].querySelector('.answer, .wa, ol.choices li.correct');
    slides[n].classList.toggle('veiled',!!hasAns&&!opts.unveiled&&!slides[n].classList.contains('shown'));
    // the URL is an input (#s=17, #L=3.06, #period=3 from Deckhand), never rewritten: a reload comes back to Today and Resume
    resetTimer();                                   // a board's clock belongs to that board: leaving the slide ends it
    paintBar();paintRail();paintRound();
    if(L&&period&&!opts.silent)bookmark(L,seg,n);}
  function veiled(){return slides[cur].classList.contains('veiled');}
  function unveil(){slides[cur].classList.add('shown');slides[cur].classList.remove('veiled');}
  function advance(){if(veiled()){unveil();return;}show(cur+1);}
  function bookmark(L,seg,n){const pc=periodCourse(period);if(pc&&pc!==course)return;      // never bookmark the wrong course's period
    panel.periods[String(period)]={course:course,lesson:L.code,stop:seg?seg.id:null,slide:n+1,at:new Date().toISOString()};savePanel();}
  // ---- pacing: planned minutes before this segment vs minutes since the bell --------------------
  let startedAt=null;   // when no bell matches (planning, after school), the clock starts at the first slide shown
  function elapsed(){const now=new Date();const b=period?block(now,period):null;
    if(b){const t=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;return t-mins(b.start);}
    if(!startedAt)startedAt=now;return (now-startedAt)/60000;}
  function paceFor(L,seg){if(!L||!seg)return null;let before=0;for(const s of L.segments){if(s===seg)break;before+=s.min;}
    const e=elapsed();if(e<-2||e>70)return null;const d=Math.round(before-e);return {before:before,elapsed:e,delta:d};}
  // ---- paint ---------------------------------------------------------------------------------------
  function paintBar(){const L=lessonOf(cur),seg=segOf(L,cur);const now=new Date();
    $('barCode').textContent=L?L.code:'';$('barTitle').textContent=L?L.title:U.title;
    $('segName').textContent=seg?(seg.short+(seg.kind==='wb'?'':'  ·  '+seg.min+' min')):'';
    const p=paceFor(L,seg),pe=$('pace');
    if(p&&seg&&seg.kind!=='title'){pe.textContent=p.delta>1?p.delta+' min ahead':p.delta<-1?(-p.delta)+' min behind':'on plan';pe.className='pace '+(p.delta>1?'ahead':p.delta<-1?'behind':'');pe.style.display='';}else{pe.style.display='none';}
    const b=period?block(now,period):null;
    $('periodNow').textContent=period?(['','1st','2nd','3rd','4th','5th','6th','7th'][period]+' period'):'';
    if(b){const left=mins(b.end)-(now.getHours()*60+now.getMinutes());$('bellLeft').textContent=left>=0&&left<=60?left+' min to the bell':'';}else $('bellLeft').textContent='';
    $('clock').textContent=now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
  function paintRail(){const L=lessonOf(cur);const sl=$('segList');sl.innerHTML='';
    if(!L){return;}
    L.segments.forEach(s=>{const li=document.createElement('li');li.innerHTML=`<span>${s.short}</span><span class="m">${s.kind==='title'?'':s.min+' min'}</span>`;
      if(cur>=s.first&&cur<=s.last)li.classList.add('on');else if(cur>s.last)li.classList.add('done');
      li.onclick=()=>{show(s.first);};sl.appendChild(li);});
    const ll=$('lessonList');ll.innerHTML='';U.lessons.forEach(x=>{const li=document.createElement('li');li.innerHTML=`<span><b>${x.code}</b><small>${x.title}</small></span>`;if(x===L)li.classList.add('on');li.onclick=()=>{ll.classList.add('hidden');show(x.first);};ll.appendChild(li);});
    $('roomLine').textContent=roomText();}
  // ---- the whiteboard round -------------------------------------------------------------------------
  let timer={len:45,left:45,run:null,endAt:0};
  function wbOf(k){const s=slides[k];return s&&s.dataset.wb?JSON.parse(s.dataset.wb):null;}
  function paintRound(){const wb=wbOf(cur),box=$('round');if(!wb){box.classList.add('hidden');return;}box.classList.remove('hidden');
    $('roundN').textContent=wb.i+' of 9'+(wb.reveal?' · answer':'');
    $('timerBox').classList.toggle('hidden',!!wb.reveal);
    const t=$('tally');t.innerHTML='';const note=$('tallyNote');note.textContent='';
    if(!wb.reveal){note.textContent=wb.kind==='mc'?'Start the clock; boards up on three; → shows the answer, then tap the letters you see.':'Start the clock; boards up on three; → shows the answer.';return;}
    const rec=tallyRec(wb);const letters=wb.kind==='mc'?wb.letters:['R','P','N'];const names=wb.kind==='mc'?{}:{R:'right',P:'partly',N:'not yet'};
    letters.forEach(Lt=>{const d=document.createElement('div');d.className='tile'+((wb.kind==='mc'?wb.key.indexOf(Lt)>=0:Lt==='R')?' key':'');
      d.innerHTML=`<span class="L">${names[Lt]||Lt}</span><span class="c">${rec.picked[Lt]||0}</span><small>${wb.kind==='mc'?(wb.errors&&wb.errors[Lt]?wb.errors[Lt].slice(0,40):(wb.key.indexOf(Lt)>=0?'keyed':'')):''}</small>`;
      let hold=null;
      d.onpointerdown=()=>{hold=setTimeout(()=>{rec.picked[Lt]=Math.max(0,(rec.picked[Lt]||0)-1);hold='held';saveTally();paintRound();},500);};
      d.onpointerup=d.onpointerleave=(e)=>{if(hold==='held'){hold=null;return;}if(hold){clearTimeout(hold);hold=null;if(e.type==='pointerup'){rec.picked[Lt]=(rec.picked[Lt]||0)+1;saveTally();paintRound();}}};
      t.appendChild(d);});
    const total=Object.values(rec.picked).reduce((a,b)=>a+b,0);
    note.textContent=total?`${total} boards counted · ${wb.kind==='mc'?'tap a letter for each board you see; hold to take one back':'right / partly / not yet; hold to take one back'}`:(wb.kind==='mc'?'Tap the letters you see on the boards. Hold a tile to take one back.':'Tap right / partly / not yet for each board.');}
  function tallyRec(wb){const on=todayISO();let r=panel.tallies.find(x=>x.on===on&&x.lesson===wb.lesson&&x.board===wb.i&&x.period===period);
    if(!r){r={on:on,period:period||0,lesson:wb.lesson,board:wb.i,benchmark:wb.benchmark,picked:{},key:wb.kind==='mc'?wb.key:'R'};if(wb.kind==='mc'&&wb.errors)r.misconceptions=wb.errors;panel.tallies.push(r);}
    return r;}
  function saveTally(){savePanel();}
  function setTimer(n){timer.len=n;timer.left=n;document.querySelectorAll('#timerBox .tbtns button[data-t]').forEach(b=>b.classList.toggle('sel',+b.dataset.t===n));paintTimer();}
  function paintTimer(){const r=$('timerRing');const p=100*(1-timer.left/timer.len);r.style.setProperty('--p',p+'%');r.classList.toggle('low',timer.left<=10&&timer.left>0);
    $('timerDigits').textContent=Math.floor(timer.left/60)+':'+pad(Math.max(0,Math.ceil(timer.left%60)));}
  function startTimer(){stopTimer();timer.endAt=Date.now()+timer.left*1000;timer.run=setInterval(()=>{timer.left=Math.max(0,(timer.endAt-Date.now())/1000);paintTimer();if(timer.left<=0){stopTimer();$('timerRing').classList.add('done');beep();}},200);}
  function stopTimer(){if(timer.run)clearInterval(timer.run);timer.run=null;}
  function resetTimer(){stopTimer();timer.left=timer.len;const r=$('timerRing');if(r){r.classList.remove('done');paintTimer();}}
  function beep(){try{const ac=new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=880;g.gain.value=.08;o.start();o.stop(ac.currentTime+.35);}catch(e){}}
  document.querySelectorAll('#timerBox .tbtns button[data-t]').forEach(b=>b.onclick=()=>setTimer(+b.dataset.t));
  $('tStart').onclick=()=>{if(timer.left<=0)timer.left=timer.len;$('timerRing').classList.remove('done');startTimer();};
  $('tStop').onclick=resetTimer;
  // ---- today ---------------------------------------------------------------------------------------
  function planLesson(){if(!room||!S)return null;const p=room.plan(S,todayISO(),course);return p;}
  function paintToday(){const now=new Date();$('tDate').textContent=now.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
    const di=dayInfo(now);const b=period?block(now,period):null;const pc=period?periodCourse(period):null;
    $('tPeriod').innerHTML=period?`<b>${['','1st','2nd','3rd','4th','5th','6th','7th'][period]} period</b>${b?` · ${b.start}–${b.end}`:''}${pc&&pc!==course?` · <span style="color:#ff8a7a">that period is ${pc==='on'?'on-level':'accelerated'} — this is the Unit ${U.unit} ${U.course==='on'?'on-level':'accelerated'} deck</span>`:''}`:(di?'No period right now — pick one below.':'Not a school day on the plan — pick a period if you are teaching anyway.');
    const p=planLesson();let planTxt='Plan: nothing for today';let planL=null;
    if(p){if(p.kind==='holiday')planTxt='Plan: '+p.title;else{planL=p.code?lessonByCode(p.code):null;planTxt=`Plan: <b>${p.code||p.kind}</b> ${p.title||''}${planL?'':(p.code?' — in another unit\'s deck':'')}`;}}
    $('tPlan').innerHTML=planTxt+(di?` · ${di.week}${di.wednesday?' · Wednesday (43 min)':''}`:'');
    $('tRoom').textContent=roomText()+(roomErr?' · '+roomErr:'');
    const bm=period&&panel.periods[String(period)];const bl=bm?lessonByCode(bm.lesson):null;
    const rb=$('tResume');if(bm&&bl){const seg=bl.segments.find(s=>s.id===bm.stop);rb.textContent=`Resume ${bm.lesson} at ${seg?seg.short:'slide '+bm.slide}`;rb.onclick=()=>{hideToday();show(Math.max(bl.first,Math.min(bl.last,(bm.slide||1)-1)),{silent:true});};}else rb.textContent='';
    const sb=$('tStart2');if(planL){sb.textContent=`Start ${planL.code} — ${planL.title}`;sb.onclick=()=>{hideToday();show(planL.first);};}else{const first=U.lessons[0];sb.textContent=`Open ${first.code} — ${first.title}`;sb.onclick=()=>{hideToday();show(first.first);};}
    const pl=$('tPickList');pl.innerHTML='';U.lessons.forEach(x=>{const btn=document.createElement('button');btn.innerHTML=`<b>${x.code}</b>${x.title}`;btn.onclick=()=>{hideToday();show(x.first);};pl.appendChild(btn);});
    const pb=$('tPerBtns');pb.innerHTML='';[1,2,3,4,5,6].forEach(n=>{const bt=document.createElement('button');bt.textContent=n;const c=periodCourse(n);bt.title=c?(c==='acc'?'accelerated':'on-level'):'planning';if(n===period)bt.classList.add('sel');bt.onclick=()=>setPeriod(n);pb.appendChild(bt);});}
  function showToday(){paintToday();$('today').classList.remove('hidden');}
  function hideToday(){$('today').classList.add('hidden');}
  $('tPick').onclick=()=>$('tPickList').classList.toggle('hidden');
  $('todayBtn').onclick=showToday;
  $('today').addEventListener('click',e=>{if(e.target===$('today'))hideToday();});
  // ---- room code box -------------------------------------------------------------------------------
  $('roomBtn').onclick=()=>{try{$('codeIn').value=localStorage.getItem(LSC)||'';}catch(e){}$('codeMsg').textContent='';$('codeBox').classList.remove('hidden');$('codeIn').focus();};
  $('codeClose').onclick=()=>$('codeBox').classList.add('hidden');
  $('codeSave').onclick=()=>{const v=$('codeIn').value.trim();try{if(v){Room.code.parse(v,window.BENCHMARKS);localStorage.setItem(LSC,v);}else localStorage.removeItem(LSC);$('codeBox').classList.add('hidden');loadRoom();paintRail();paintToday();}catch(e){$('codeMsg').textContent=e.message;}};
  // ---- keys and clicks -----------------------------------------------------------------------------
  $('railBtn').onclick=()=>{document.body.classList.toggle('norail');fit();};
  $('lessonsBtn').onclick=()=>$('lessonList').classList.toggle('hidden');
  addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const k=e.key;
    if(!$('codeBox').classList.contains('hidden')){if(k==='Escape')$('codeBox').classList.add('hidden');return;}
    if(!$('today').classList.contains('hidden')){if(k==='Escape')hideToday();return;}
    if(['ArrowRight','PageDown',' '].includes(k)){e.preventDefault();advance();}
    else if(['ArrowLeft','PageUp','Backspace'].includes(k)){e.preventDefault();show(cur-1);}
    else if(k==='Home')show(lessonOf(cur)?lessonOf(cur).first:0);
    else if(k==='Escape')showToday();
    else if(k==='l'||k==='L'){document.body.classList.toggle('norail');fit();}
    else if(k==='t'||k==='T'){if(timer.run)stopTimer();else $('tStart').onclick();}
    else if(k==='r'||k==='R'){unveil();}
    else if(k==='p'||k==='P'){print();}
    else if(/^[1-9]$/.test(k)){const L=lessonOf(cur);const b=L&&L.boards.find(x=>x.i===+k&&!x.reveal);if(b)show(b.slide);}},true);
  stage.addEventListener('click',e=>{if(e.target.closest('a'))return;if(e.clientX<innerWidth*0.3)show(cur-1);else advance();},true);
  document.querySelectorAll('a[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();show(+a.dataset.go);},true));
  // ---- boot ----------------------------------------------------------------------------------------
  loadRoom();fit();
  const hs=/[#&]s=(\d+)/.exec(location.hash);const hl=/[#&]L=([\d.T\-A-Z]+)/.exec(location.hash);
  if(hs)show(+hs[1]-1,{silent:true});else if(hl&&lessonByCode(hl[1]))show(lessonByCode(hl[1]).first,{silent:true});else{show(0,{silent:true});showToday();}
  setTimer(45);setInterval(paintBar,15000);
  window.Console={show:show,state:()=>({cur:cur,period:period,panel:panel}),setPeriod:setPeriod,unveil:unveil};
})();
"""
