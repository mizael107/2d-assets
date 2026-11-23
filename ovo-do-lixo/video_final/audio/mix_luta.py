import subprocess
# (file, start seconds in teste_luta.mp4, volume)
EV = [
 ('run',1.30,.8),('punch',1.65,1.0),('squawk',1.72,.7),('whoosh',1.70,.5),
 ('elec_charge',2.45,.8),('zap',3.50,1.0),('fire',4.90,.9),('whoosh',5.0,.6),('land',6.08,.8),
 ('ice_charge',8.0,.7),('ice_volley',8.8,.8),('freeze',9.2,.9),('shatter',11.67,1.0),('dizzy',11.8,.6),
 ('orb_charge',13.4,.8),('orb_launch',14.8,.8),('boom',15.15,1.0),('fence',16.49,1.0),('dizzy',16.8,.5),
 ('laugh',17.8,.6),('heart',19.9,1.0),('elec_charge',20.6,.5),('thunder',21.68,1.0),('dust',21.9,.8),('dust',23.2,.6),
 ('aura',23.6,.35),('crow',24.8,1.0),('boom',24.9,.7),('cheer',25.0,.6),
 ('orb_charge',26.0,.7),('orb_launch',26.5,.7),('clash',26.75,.9),('zap',27.5,.7),('boom',27.7,1.0),('cheer',27.85,.8),
 ('land',28.65,.9),('dizzy',28.9,.5),('powerdown',29.95,.8),('land',31.55,.4),
 ('angry',31.9,.8),('steps',33.45,.6),('snore',34.2,.4),('pickup',36.65,.7),('steps',37.3,.6),('snore',38.0,.5),
]
inp = ['-i','sfx/crowd.wav','-i','sfx/music_battle.wav']
flt = ['[0]atrim=0:40.1,volume=0.22,afade=t=out:st=38.5:d=1.6[c0]',
       '[1]atrim=0:40.1,volume=0.16,volume=\'if(lt(t,29.5),1,max(0.35,1-(t-29.5)/3))\':eval=frame,afade=t=out:st=38.5:d=1.6[m0]']
labels = ['[c0]','[m0]']
for i,(f,t,v) in enumerate(EV):
    inp += ['-i', f'sfx/{f}.wav']; k = i+2; ms = int(t*1000)
    flt.append(f'[{k}]aformat=sample_rates=44100:channel_layouts=stereo,volume={v},adelay={ms}|{ms}[e{i}]'); labels.append(f'[e{i}]')
flt.append(''.join(labels)+f'amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:40.08,alimiter=limit=0.89[a]')
subprocess.run(['ffmpeg','-y','-v','error',*inp,'-filter_complex',';'.join(flt),'-map','[a]','-ar','44100','sfx_luta.wav'],check=True)
subprocess.run(['ffmpeg','-y','-v','error','-i','../tripo/teste_luta.mp4','-i','sfx_luta.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','../tripo/teste_luta_som.mp4'],check=True)
