"""Extract literal room exits and skill names from the pinned source (never eval LPC)."""
import json, re, posixpath
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'research/sources/xkx100'
OUT=ROOT/'jianghu-web/dist'

def uncomment(s):
    # Preserve strings and LPC multiline descriptions; comments never create roads.
    return re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*',lambda m:'' if m[0].startswith(('/',)) else m[0],s)

def strings(expr, directory):
    expr=expr.strip().replace('__DIR__',json.dumps(directory+'/'))
    if not re.fullmatch(r'(?:\s*"(?:\\.|[^"\\])*"\s*\+?\s*)+',expr):return None
    return ''.join(json.loads(x) for x in re.findall(r'"(?:\\.|[^"\\])*"',expr))

regions=dict(re.findall(r'"([a-z0-9]+)"\s*:\s*"([^"\n]+)"',(SRC/'adm/daemons/mapd.lpc').read_text().split('// 标识对应的地图帮助')[0]))
regions.update(yixing='宜兴',wuxi='无锡',kunlun='昆仑派',wuguan='扬州武馆',nanshaolin='南少林',jiangling='江陵',yueyang='岳阳',wuyi='武夷山',hanzhong='汉中',heizhao='黑沼',huijiang='回疆',mobei='漠北',huangshan='黄山',qilian='祁连山',yanping='延平',yongdeng='永登',jueqinggu='绝情谷',gaibang='丐帮')
regions.update(**{'5lt':'武林试炼','baihuagu':'百花谷','beihai':'北海','binghuo':'冰火岛','changcheng':'长城','death':'地府','hasake':'哈萨克草原','huanggong':'皇宫','jianzhong':'剑冢','jinshe':'金蛇秘境','npc':'江湖隐地','shiliang':'石梁','shouxihu':'瘦西湖','taiwan':'台湾','taohuacun':'桃花村','wizard':'仙境','wuliang':'无量山','yubifeng':'玉笔峰'})
rooms={}
sources={}
for file in sorted((SRC/'d').rglob('*.lpc')):
    raw=file.read_text();s=uncomment(raw)
    short=re.search(r'set\(\s*"short"\s*,([^;]+)\);',s)
    if not short:continue
    key='/'+file.relative_to(SRC).with_suffix('').as_posix()
    name=''.join(x for x in re.findall(r'"([^"\n]*)"',short[1]) if not x.startswith('\\'))
    if not name:continue
    directory=posixpath.dirname(key)
    exits={}
    block=re.search(r'set\(\s*"exits"\s*,\s*\(\[([\s\S]*?)\]\)\s*\)',s)
    if block:
        for direction,expr in re.findall(r'"([a-z]+)"\s*:\s*([^,\n]+)',block[1]):
            target=strings(expr,directory)
            if target:
                target=posixpath.normpath(target if target.startswith('/') else directory+'/'+target)
                exits[direction]=re.sub(r'\.(?:lpc|c)$','',target)
    coords=[re.search(r'set\("coor/'+axis+r'",\s*(-?\d+)\)',s) for axis in ['x','y']]
    rooms[key]={'name':name,'region':regions.get(key.split('/')[2],key.split('/')[2]),'area':key.split('/')[2], 'exits':exits}
    if all(coords):rooms[key]['xy']=[int(m[1]) for m in coords]
    sources[key]=s
# Remove broken links and files which are not rooms.
for room in rooms.values():room['exits']={d:t for d,t in room['exits'].items() if t in rooms}

# Deliberately aim at public entrances or a named teacher's room, not invented coordinates.
catalog=[
('少林派','shaolin','shanmen','少林山门'),('武当派','wudang','sanqingdian','会客与入门师父'),
('峨嵋派','emei','hcaguangchang','华藏庵广场'),('华山派','huashan','qunxianguan','岳不群所在'),
('丐帮','gaibang','pomiao','鲁有脚、彭有敬所在'),('桃花岛','taohua','dating','桃花岛大厅'),
('星宿派','xingxiu','xxh','摘星子所在'),('逍遥派','xiaoyao','qingcaop','苏星河所在'),
('灵鹫宫','lingjiu','shanjiao','缥缈峰入口，后续需过险关'),('古墓派','gumu','mumen','古墓入口'),
('全真教','quanzhen','damen','敲门后可进入重阳宫'),('昆仑派','kunlun','shanmen','昆仑山门'),
('明教','mingjiao','square','明教广场'),('嵩山派','songshan','junjigate','峻极禅院入口'),
('衡山派','henshan','zhurongdian','祝融殿'),('恒山派','hengshan','square','见性峰广场'),
('泰山派','taishan','kaishan','泰山师承'),('青城派','qingcheng','songfengguan','上清殿，余沧海一系'),
('南少林派','nanshaolin','shanmen','南少林山门'),('神龙教','shenlong','dating','神龙岛'),
('五毒教','wudujiao','jiang1','桃花江西岸入口，过江需乘船'),('铁掌帮','tiezhang','shanmen','铁掌山'),
('凌霄城','lingxiao','cityout','凌霄城外，入城需过关'),('白驼山派','baituo','dating','白驼山'),
('大理段家','dali','wangfugate','大理王府'),('姑苏慕容','yanziwu','neitang','燕子坞'),
('黑木崖','heimuya','dating1','日月神教'),('雪山寺','xueshan','shanmen','雪山寺师承'),
('红花会','huijiang','zongduo','红花会'),('云龙门','beijing','chaguan','关夫子所在，天地会相关师承'),
('新手武馆','wuguan','wg_dating','基础学艺与新手练习')]
# Missing filenames must be reviewed; never silently invent locations.
factions=[]
missing=[]
for name,area,leaf,note in catalog:
    key=f'/d/{area}/{leaf}'
    if key not in rooms:missing.append((name,area,leaf));continue
    faction={'name':name,'room':key,'note':note}
    approach={'桃花岛':'/d/jiaxing/jiaxinggang','神龙教':'/d/beijing/haigang','姑苏慕容':'/d/yanziwu/hupan'}.get(name)
    if approach and approach in rooms:faction['approach']=approach
    factions.append(faction)

skill_names={}
for file in (SRC/'kungfu/skill').glob('*.lpc'):
    s=file.read_text()
    # Prefer the skill's help heading, followed by its own source heading.
    m=re.search(r'write\([^;]*?"(?:\\n)*([\u3400-\u9fff][\u3400-\u9fff·（）() ]{1,24})[：:]?',s[s.find('int help('):]) if 'int help(' in s else None
    if m:skill_names[file.stem]=m[1].strip();continue
    for line in s.splitlines()[:8]:
        if line.strip().startswith('//'):
            m=re.search(r'[\u3400-\u9fff][\u3400-\u9fff·]{1,15}',line)
            if m and not any(x in m[0] for x in ['修改','文件','更新','作者']):skill_names[file.stem]=m[0];break
skill_names.update(leg='基本腿法',hook='基本钩法',spear='基本枪法',**{'kunlun-shenfa':'昆仑身法','xuantian-wuji':'玄天无极功','kunlun-strike':'昆仑掌'})

# Source-backed transport edges and touch actions. Commands still run in the MUD.
verbs={'knock':'敲门','open':'打开','push':'推动','pull':'拉动','press':'按动','turn':'转动','enter':'进入','climb':'攀爬','jump':'跳跃','cross':'渡过','yell':'呼唤','ring':'摇铃','lift':'抬起','move':'挪动','dig':'挖掘','zuan':'钻入','walk':'行走','swim':'游泳','tie':'系住','untie':'解开','tang':'躺下','ride':'骑乘'}
for key,src in sources.items():
    actions=[]
    if re.search(r'inherit\s+RIVER\s*;',src):
        m=re.search(r'set\(\s*"to"\s*,\s*([^;]+)\);',src)
        to=strings(m[1],posixpath.dirname(key)) if m else None
        if to in rooms:
            rooms[key]['transitions']=[{'kind':'river','from':key,'to':to,'label':'乘渡船'}]
            actions.append({'label':'呼叫渡船','command':'yell boat'})
    for func,verb in re.findall(r'add_action\(\s*"([a-zA-Z_]+)"\s*,\s*"([a-z]+)"\s*\)',src):
        if verb not in verbs:continue
        m=re.search(r'\b(?:int|void)\s+'+re.escape(func)+r'\s*\([^)]*\)\s*\{',src)
        if not m:continue
        start=m.end();depth=1;i=start
        while i<len(src) and depth:
            depth+= (src[i]=='{')-(src[i]=='}');i+=1
        body=src[start:i-1]
        args=list(dict.fromkeys(re.findall(r'\b(?:arg|str)\s*(?:==|!=)\s*"([\w \-\u3400-\u9fff]{1,35})"',body)))
        names={'gate':'大门','door':'门','stone':'石块','button':'机关','wall':'墙壁','rope':'绳索','e':'向东','w':'向西','n':'向北','s':'向南'}
        for arg in args[:12]:actions.append({'label':verbs[verb]+' · '+names.get(arg,arg),'command':verb+' '+arg})
        if not args and not re.search(r'if\s*\(\s*!\s*(?:arg|str)',body):actions.append({'label':verbs[verb],'command':verb})
    if actions:rooms[key]['actions']=list({a['command']:a for a in actions}.values())
# The gate only opens; its original guard continues to enforce admission.
rooms['/d/quanzhen/damen']['transitions']=[{'kind':'gate','from':'/d/quanzhen/damen','to':'/d/quanzhen/datang1','direction':'east','command':'knock gate','label':'敲门进入重阳宫'}]
performs={}
for folder in (SRC/'kungfu/skill').iterdir():
    if not folder.is_dir():continue
    moves=[]
    for file in folder.glob('*.lpc'):
        raw=file.read_text();m=re.search(r'(?:name\s*\(\s*\)|name)\s*(?:\{\s*return|=)\s*(?:[A-Z]+\s*)*"([^"\n]+)"',raw)
        if not m:m=re.search(r'//[^\n]*?([\u3400-\u9fff]{2,12})',raw[:400])
        moves.append({'action':file.stem,'name':m[1] if m else file.stem})
    if moves:performs[folder.name]=moves
world={'rooms':rooms,'factions':factions,'regions':regions,'skillNames':skill_names,'performs':performs}
OUT.mkdir(exist_ok=True)
(OUT/'world-map.js').write_text('globalThis.PocketWorld='+json.dumps(world,ensure_ascii=False,separators=(',',':'))+';\n')
print('World:',len(rooms),'rooms,',sum(len(x['exits']) for x in rooms.values()),'exits,',len(skill_names),'skill names')
if missing:print('REVIEW targets:',missing)
if __name__=='__main__':
    from collections import deque
    seen={'/d/wuguan/wg_dating'};q=deque(seen)
    while q:
        for t in rooms.get(q.popleft(),{}).get('exits',{}).values():
            if t not in seen:seen.add(t);q.append(t)
    print('Reachable from wuguan:',len(seen),'factions:',[(f['name'],f['room'] in seen) for f in factions])
