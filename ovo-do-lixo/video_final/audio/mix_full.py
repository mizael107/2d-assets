# Full soundtrack for "O Ovo do Lixo": narration + music + ambience per place + one sound for every action.
# Reads tripo/timeline.json (node -e "...build()") and writes audio/trilha_completa.wav
import json, subprocess, numpy as np, os
SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, '..', 'tripo', 'timeline.json')))
TOTAL = TL['total']
N = int(TOTAL * SR) + SR
mix = np.zeros((N, 2), np.float32)
voice = np.zeros((N, 2), np.float32)   # narration and Kaio's line: kept apart so the rest can duck under it
cache = {}
def load(name):
    if name not in cache:
        p = name if os.path.isabs(name) else os.path.join(HERE, name)
        if not os.path.exists(p):   # the repository keeps the sounds as .ogg (the .wav originals are on Google Drive)
            p = next((q for q in (os.path.splitext(p)[0] + e for e in ('.wav', '.ogg', '.mp3')) if os.path.exists(q)), p)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        cache[name] = np.frombuffer(raw, np.float32).reshape(-1, 2)
    return cache[name]
def put(name, t, vol=1.0, dur=None, offset=0.0, fade=0.0, loop=False, bus=None):
    a = load(name); i0 = int(offset * SR) % len(a)
    n = int(dur * SR) if dur else len(a) - i0
    if loop: idx = (np.arange(n) + i0) % len(a); seg = a[idx]
    else: seg = a[i0:i0 + n]
    seg = seg * vol
    if fade > 0:
        f = min(int(fade * SR), len(seg) // 2)
        if f > 0: ramp = np.linspace(0, 1, f, dtype=np.float32)[:, None]; seg = seg.copy(); seg[:f] *= ramp; seg[-f:] *= ramp[::-1]
    s = int(t * SR)
    if s < 0: seg = seg[-s:]; s = 0
    e = min(N, s + len(seg)); (mix if bus is None else bus)[s:e] += seg[:e - s]

S = lambda f: 'sfx/' + f + '.wav'
# ---- narration (one part per section)
for n, t in TL['narr']: put('narr_proc/' + n + '.wav', t + 0.05, 1.0, bus=voice)
starts = dict(TL['narr'])
# ---- music: light theme for the story, battle music for the final, piano for the ending
put(S('music_light'), 0, 0.13, dur=starts['n7'] + 0.8, fade=0.8)
put(S('music_battle'), starts['n7'] - 0.3, 0.15, dur=starts['n9'] - starts['n7'] + 0.6, fade=1.0)
put(S('music_piano'), starts['n9'] - 0.3, 0.2, dur=TOTAL - starts['n9'] + 0.3, fade=1.2)

# ---- ambience by place, per shot
SCENE = {'01b': 'Street', '01c': 'Street', '01d': 'Street', '02a': 'Street', '04b': 'Street', '06a': 'City',
         '03a': 'House', '03b': 'House', '03c': 'House', '05z': 'House', '05s': 'House', '05b': 'House',
         '05r': 'HouseChuva', '05a': 'HouseChuva', '05c': 'HouseNoite', '05e': 'HouseNoite', '09a': 'Bedroom', '09b': 'BedroomDia', '09c': 'BedroomDia', '09d': 'BedroomDia'}
AMB = {'Street': ('amb_street', 0.35), 'City': ('amb_street', 0.4), 'House': ('amb_birds', 0.5), 'HouseChuva': ('amb_rain', 0.45), 'HouseNoite': ('amb_night', 0.25),
       'Bedroom': ('amb_night', 0.18), 'BedroomDia': ('amb_birds', 0.3), 'Arena': ('crowd', 0.16)}
for it in TL['items']:
    if it['kind'] == 'black': continue
    sc = SCENE.get(it.get('id'), 'Arena')
    f, v = AMB[sc]
    if it['kind'] == 'fight' or it.get('id', '').startswith(('07', '08', '06d', '06b', '06c')): v = 0.2
    put(S(f), it['start'], v, dur=it['d'], offset=it['start'] * 1.7, fade=0.12, loop=True)

# ---- the fight: events in the fight's own time, mapped through each timeline item (slow motion stretches them)
FIGHT = {
 'A': [('run',1.30,.8),('punch',1.65,1.0),('squawk',1.72,.7),('whoosh',1.70,.5),('elec_charge',2.45,.8),('zap',3.50,1.0),('fire',4.90,.9),('whoosh',5.0,.6),('land',6.08,.8)],
 'B': [('ice_charge',0.0,.7),('ice_volley',0.8,.8),('freeze',1.2,.9),('shatter',3.67,1.0),('dizzy',3.8,.6)],
 'C': [('orb_charge',0.8,.8),('orb_launch',2.2,.8),('boom',2.55,1.0),('fence',3.89,1.0),('dizzy',4.2,.5),('laugh',5.2,.6),('heart',7.3,1.0),('elec_charge',8.0,.5),
       ('thunder',9.08,1.0),('dust',9.3,.8),('dust',10.6,.6),('aura',11.0,.35),('crow',12.2,1.0),('boom',12.3,.7),('cheer',12.4,.6),
       ('orb_charge',13.4,.7),('orb_launch',13.9,.7),('clash',14.15,.9),('zap',14.9,.7),('boom',15.1,1.0),('cheer',15.25,.8),('land',16.05,.9),('dizzy',16.3,.5),
       ('powerdown',17.35,.8),('land',18.95,.4),('angry',19.3,.8),('steps',20.85,.6),('snore',21.6,.4),('pickup',24.05,.7),('steps',24.7,.6),('snore',25.4,.5)],
 'S': [('snore',0.3,.6)],
 'K': [('angry',0.3,.7)],
}
for it in TL['items']:
    if it['kind'] != 'fight': continue
    a, b = it['times'][0], it['times'][0] + (it['times'][-1] - it['times'][0]) * it['n'] / max(1, it['n'] - 1)
    k = it['d'] / (b - a)
    for f, t, v in FIGHT[it['seg']]:
        if a - 0.05 <= t < b: put(S(f), it['start'] + (t - a) * k, v)
    if k > 1.6 and it['seg'] == 'C': put(S('stinger'), it['start'], 0.35)     # slow motion: a deep hit marks it
    if it['seg'] == 'K': put('narr_proc/kaio_fala.wav', it['start'] + 1.72, 0.9, bus=voice)   # Kaio's furious line

# ---- the other shots: (sound, time in the shot (s) or 'u0.4' = 40% of the shot, volume)
EV = {
 '01b': [('sparkle', 0.3, .5), ('sparkle', 2.0, .4)], '01c': [('stinger', 0.2, .4), ('sparkle', 2.5, .3)],
 '01d': [('whoosh', 'u0.38', .4), ('sparkle', 'u0.42', .6)], '01e': [('dizzy', 0.3, .4), ('pop', 'u0.2', .6), ('sad', 'u0.56', .9)],
 '02a': [('eggcrack', 'u0.35', .9), ('sparkle', 'u0.35', .6), ('peep', 'u0.75', .7)], '02b': [('bag', 0.29, .8), ('bag', 1.09, .8), ('bag', 1.89, .8)],
 '02c': [('fanfare', 0.0, .5), ('pop', 0.12, .6), ('coins', 0.3, .7), ('coins', 0.75, .6), ('pop', 'u0.45', .6)], '02d': [('trombone', 0.3, .7)],
 '02i': [('sparkle', 0.1, .4), ('sparkle', 'u0.25', .5), ('sparkle', 'u0.5', .6), ('elec_charge', 'u0.72', .5)],
 '03a': [('clock', 0.0, .7), ('pop', 'u0.86', .6)], '03b': [('eggcrack', 0.1, 1.0), ('peep', 0.7, .8), ('pop', 'u0.58', .6), ('sparkle', 'u0.66', .6)],
 '03c': [('pop', 0.05, .6), ('snore', 0.5, .6)], '03d1': [('pop', 0.0, .6), ('snore', 0.4, .5), ('squawk', 1.2, .4)],
 '03d2': [('pop', 0.0, .6), ('ice_charge', 0.3, .5), ('snore', 0.7, .5)], '03e': [('pop', 0.0, .6), ('worm', 0.2, .8), ('whoosh', 0.9, .4), ('land', 2.0, .5)],
 '03f': [('laugh', 0.1, .9), ('laugh', 1.9, .7)], '04a': [('stinger', 0.0, .6), ('pop', 'u0.25', .5)], '04s': [('orb_charge', 0.3, .5), ('pop', 'u0.45', .5)],
 '04c': [('orb_charge', 0.0, .7), ('zap', 1.6, .4)], '04b': [('pop', 'u0.3', .6), ('laugh', 'u0.4', .5)],
 '05z': [('whoosh', 0.0, .3)], '05r': [('treadmill', 0.0, .4), ('pop', 0.05, .5)], '05s': [('pop', 0.05, .5), ('clank', 0.6, .5)], '05c': [('pop', 0.05, .5), ('bag', 0.4, .5)],
 '05a': [('treadmill', 0.0, .7), ('snore', 1.0, .5)], '05b': [('clank', 0.98, .6), ('snore', 1.4, .5)],
 '05d': [('dizzy', 0.2, .4), ('counter', 0.3, .6), ('counter', 1.8, .6), ('sad', 3.6, .8)], '05e': [('snore', 0.3, .6)],
 '06a': [('airship', 0.0, .7), ('fanfare', 1.3, .6)], '06b': [('sparkle', 0.0, .6), ('elec_charge', 0.4, .5), ('pop', 'u0.1', .5)], '06c': [('pop', 0.0, .5)],
 '06d': [('stinger', 0.0, .8), ('pop', 0.12, .5)], '07a': [('cheer', 0.4, .5)],
 '07e': [('heart', 0.0, .8), ('aura', 0.5, .4), ('sparkle', 1.0, .5)], '07f': [('aura', 0.0, .5), ('sparkle', 0.3, .6)],
 '07g': [('crow', 0.0, 1.0), ('thunder', 'u0.3', 1.0), ('boom', 'u0.3', .8), ('cheer', 'u0.42', .7)],
 '08b': [('counter', 0.0, .5), ('fanfare', 'u0.35', .8), ('cheer', 'u0.35', .7)],
 '08c': [('confetti', 0.0, .6), ('confetti', 0.5, .6), ('confetti', 1.0, .6), ('cheer', 0.2, .6), ('snore', 1.6, .4)],
 '09a': [('snore', 0.4, .6)], '09b': [('crow_morning', 0.0, .6)], '09c': [('sparkle', 'u0.4', .6)], '09d': [('sparkle', 0.0, .5), ('stinger', 1.0, .45)],
}
for it in TL['items']:
    if it['kind'] != 'anim': continue
    for f, t, v in EV.get(it['id'], []):
        tt = float(t[1:]) * it['d'] if isinstance(t, str) else t
        put(S(f), it['start'] + tt, v)

# ---- master: the voice on top. Music, ambience and effects duck under the narration, the voice is brought up,
# then a gentle limiter so nothing clips
env = np.abs(voice).max(axis=1); w = int(0.25 * SR)
env = np.convolve(env, np.ones(w, np.float32) / w, mode='same'); env = np.minimum(1.0, env / 0.05)
mix = mix * (1.0 - 0.5 * env)[:, None] + voice
peak = np.abs(mix).max(); print('peak before', round(float(peak), 3))
mix = np.tanh(mix * 1.1) / np.tanh(1.1) if peak > 0.95 else mix
mix = mix[:int(TOTAL * SR)]
out = os.path.join(HERE, 'trilha_completa.wav')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-c:a', 'pcm_s16le', out], input=mix.astype(np.float32).tobytes(), check=True)
print('wrote', out, round(TOTAL, 2), 's')
