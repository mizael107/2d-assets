#!/bin/bash
# final render: 720x1280, every frame, 4 workers (each: its animated shots, then its fight shots)
cd "$(dirname "$0")"; export W=720 H=1280 STEP=1
for k in 0 1 2 3; do (
  OUT=animf node anim_video.cjs $((9700+k)) $(cat tripo/fin_a$k.txt)
  for f in tripo/fin_f${k}_*.json; do s=$(basename $f .json); s=${s##*_}; OUT=tlf TIMES=$f node fight_video.cjs $s 0 0 $((9710+k)); done
) > tripo/fin_$k.log 2>&1 & done
wait
