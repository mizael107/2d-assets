# One-word yellow captions synced to the narration.
# Word times: speech regions come from the narration's own pauses (silencedetect); inside the speech, every word gets
# time in proportion to its length (vowel groups), and sentences are pinned to the pauses when the counts match.
import json, re, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, '..', 'tripo', 'timeline.json')))
TEXT = {
 'n1': 'Nessa cidade, galinha não é bicho de estimação. É lutadora. Todo mundo tem um ovo dourado, roxo, brilhante... O meu eu achei no lixo: pequeno, rachado e sem cor nenhuma. Ninguém quis. Eu quis. Dele nasceu a minha galinha: 347 lutas... 347 derrotas.',
 'n2': 'As regras são simples: o ovo choca, a galinha treina e entra na arena. Ganhou, leva troféu e dinheiro. Perdeu, volta pra casa de bico baixo. E quanto mais brilha o ovo, mais forte é o poder: raio, fogo, gelo, energia roxa.',
 'n3': 'O ovo demorou um mês pra chocar. Saiu uma galinha do tamanho de um limão. Dei o nome de Penosa. Poder: dormir. Na primeira luta, ela dormiu. Na segunda, também. Na terceira, perdeu pra uma minhoca. A cidade inteira riu. Principalmente o Kaio.',
 'n4': 'O Kaio é o campeão da arena. A galinha dele, a Sombra, nunca perdeu uma luta. Preta e dourada, solta energia roxa pelos olhos. Ele me deu um apelido: "o menino do lixo".',
 'n5': 'Mas eu não desisti. Treinei a Penosa na chuva, no sol, de madrugada. Ela correu na esteira... dormindo. Levantou peso... dormindo. 100 derrotas. 200. 347. E a Penosa? Dormindo.',
 'n6': 'Até que apareceu no céu: "Torneio Lendário: o vencedor ganha o Ovo do Trovão." E a final seria... eu contra o Kaio.',
 'n7': 'A arena lotou. Todo mundo veio ver a Penosa apanhar. A Sombra atacou: uma bola de energia roxa direto nela. A Penosa voou longe... e bateu na grade. E pela primeira vez em 347 lutas... ela abriu os olhos. A casca rachada que ela tinha na barriga começou a brilhar. O cinza caiu como poeira. E por baixo... ela era dourada, com olhos de fogo. Ela soltou um cocoricó... e um trovão rasgou a arena.',
 'n8a': 'A Sombra tentou de novo. Raio contra energia roxa. E dessa vez... a Sombra caiu. E não levantou mais. A Penosa gastou tudo o que tinha... e dormiu ali mesmo, no meio da arena. O Kaio gritava.',
 'n8b': 'Eu só fui buscar a minha galinha. 348 lutas. A primeira vitória. O Ovo do Trovão era meu.',
 'n9': 'Naquela noite, a Penosa dormiu em cima do troféu. E de manhã... ela botou um ovo. Pequeno. Rachado. E cinza. Dessa vez... ninguém riu.',
}
SPOKEN = {'347': 'trezentas e quarenta e sete', '348': 'trezentas e quarenta e oito', '100': 'cem', '200': 'duzentas'}
def weight(w):
    s = SPOKEN.get(re.sub(r'\W', '', w), w); return max(1, len(re.findall(r'[aeiouáéíóúâêôãõà]+', s.lower())))
def speech(path):
    out = subprocess.run(['ffmpeg', '-i', path, '-af', 'silencedetect=noise=-35dB:d=0.18', '-f', 'null', '-'], capture_output=True, text=True).stderr
    dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()[2]) + 60 * int(re.search(r'Duration: (\d+):(\d+)', out).groups()[1])
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    regs, cur = [], 0.0
    for a, b in zip(st, en):
        if a - cur > 0.05: regs.append((cur, a))
        cur = b
    if dur - cur > 0.05: regs.append((cur, dur))
    return regs
def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h}:{m:02d}:{s:05.2f}'
events = []
for n, t0 in TL['narr']:
    regs = speech(os.path.join(HERE, 'narr', n + '.mp3'))
    # phrases split at punctuation that the narrator pauses on
    phrases = [p.strip() for p in re.split(r'(?<=[.,:?!…])\s+', TEXT[n]) if p.strip()]
    words_by_phrase = [p.split() for p in phrases]
    if len(phrases) == len(regs): blocks = list(zip(regs, words_by_phrase))
    else:   # spread every word over the speech regions in proportion to their length
        allw = [w for ws in words_by_phrase for w in ws]; tot = sum(weight(w) for w in allw); spT = sum(b - a for a, b in regs)
        blocks, i, acc = [], 0, 0.0
        for a, b in regs:
            share = (b - a) / spT * tot; ws = []
            while i < len(allw) and (acc + weight(allw[i]) <= share + 0.5 or not ws): ws.append(allw[i]); acc += weight(allw[i]); i += 1
            acc -= share; blocks.append(((a, b), ws))
        if i < len(allw): blocks[-1][1].extend(allw[i:])
    for (a, b), ws in blocks:
        if not ws: continue
        tot = sum(weight(w) for w in ws); t = a
        for w in ws:
            d = (b - a) * weight(w) / tot; events.append((t0 + 0.05 + t, t0 + 0.05 + t + d, w)); t += d
K = [i for i in TL['items'] if i.get('seg') == 'K'][0]
kw = 'Eu não acredito que eu perdi pra esse moleque pobre!'.split(); kt = K['start'] + 1.72 + 0.1; ktot = sum(weight(w) for w in kw)
for w in kw:
    d = 2.6 * weight(w) / ktot; events.append((kt, kt + d, '{\\c&H003030FF&}' + w)); kt += d
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: W,DejaVu Sans,88,&H0000E1FF,&H0000E1FF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,7,4,2,40,40,300,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
lines = []
for a, b, w in events:
    tag = w[:w.index('}') + 1] if w.startswith('{') else ''; txt = tag + w[len(tag):].upper().strip('"')
    lines.append(f'Dialogue: 0,{ts(a)},{ts(max(b, a + 0.12))},W,,0,0,0,,{{\\fscx115\\fscy115\\t(0,90,\\fscx100\\fscy100)}}{txt}')
open(os.path.join(HERE, 'legendas.ass'), 'w').write(head + '\n'.join(lines) + '\n')
print(len(events), 'words')
