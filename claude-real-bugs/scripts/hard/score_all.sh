#!/bin/bash
# score every run in results/, serially within a bug (shared parent worktree), bugs in parallel
cd /home/claude/b15/hard
for b in $(ls results | cut -d_ -f2 | sort -u); do
  ( for r in $(ls -d results/*_${b}_r*); do python3 hb_score.py score $r | tail -1; done ) > scores_$b.jsonl 2> err_$b.log &
done
wait
cat scores_[a-z]*[0-9t].jsonl > scores_all.tmp && mv scores_all.tmp scores_hard.jsonl; wc -l scores_hard.jsonl
