#!/bin/bash
# score every ds29 run with the unchanged ds25 scorers
S=/home/claude/token-cost-by-language/claude-real-bugs/scripts
R=/home/claude/ds29/pack/runs
O=/home/claude/ds29/score
export HB=/home/claude/b15hb
HARD="z6495 mit mdit1201 ct435 mk4059 pm1643 z6496 pp653 jy791 mk4051"
for b in $HARD; do
  ( for r in $(ls -d $R/*_${b}_r*); do python3 $S/hard/hb_score.py score $r 2>>$O/err_$b.log | tail -1; done ) > $O/hard_$b.jsonl &
done
( ls -d $R/* | grep -vE "_($(echo $HARD | tr ' ' '|'))_r" | xargs -P 4 -I{} sh -c "cd $S/easy && python3 score_run.py {} 2>>$O/err_easy.log | tail -1" ) > $O/easy.jsonl &
wait
cat $O/easy.jsonl $O/hard_*.jsonl > $O/scores_all.jsonl
echo DONE $(wc -l < $O/scores_all.jsonl)
