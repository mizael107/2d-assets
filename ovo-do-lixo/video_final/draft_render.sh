#!/bin/bash
# low-res draft of the whole video: 360x640, every 2nd frame
cd "$(dirname "$0")"; export W=360 H=640 STEP=2
for k in 0 1 2; do OUT=animd node anim_video.cjs $((9830+k)) $(cat tripo/grp$k.txt) > tripo/draft_a$k.log 2>&1 & done
( for s in A B S C; do OUT=tld TIMES=tripo/times_$s.json node fight_video.cjs $s 0 0 $((9840)) ; done ) > tripo/draft_f.log 2>&1 &
wait
node assemble.cjs tripo/animd tripo/tld tripo/previa_ovo.mp4 360 640
