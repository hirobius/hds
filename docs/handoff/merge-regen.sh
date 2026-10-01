#!/bin/bash
# merge-regen.sh <worktree> <issue>: merge origin/main; status.json -> unified (keeps `consistency`); generated files -> main's copy then regenerated; commit
wt=$1; issue=$2; TRAILER=${MERGE_REGEN_TRAILER:?set MERGE_REGEN_TRAILER to the commit trailer lines (Co-Authored-By + Claude-Session)}; X="2026-09-30T10:00:00.000Z"
cd "$wt" || exit 2
git fetch -q origin main
if git merge --no-edit origin/main >/dev/null 2>&1; then echo "$wt: clean merge"; else
  conf=$(git diff --name-only --diff-filter=U)
  for f in $conf; do
    case "$f" in
      status.json|llms.txt|public/llms.txt|public/llms-full.txt|public/llms/*|public/hds-manifest.json|src/app/data/*.json|docs/sync-map.json|DESIGN.md|skills/hds-consumer/SKILL.md) git checkout --theirs -- "$f" ;;
      *) echo "$wt: UNRESOLVED conflict in $f"; git merge --abort; exit 1 ;;
    esac
  done
  echo "$wt: conflicts taken from main then regenerated: $(echo $conf | tr '\n' ' ')"
fi
git show origin/main:status.json > status.json
pnpm exec prettier --write status.json >/dev/null
node scripts/generate-manifest.mjs >/dev/null 2>&1 && node scripts/generate-component-api.mjs >/dev/null 2>&1 && node scripts/enrich-manifest.mjs >/dev/null 2>&1 && node scripts/generate-llms-txt.mjs >/dev/null 2>&1 && node scripts/build-readme-counts.mjs >/dev/null 2>&1 && node scripts/check-sync-map.mjs --write >/dev/null 2>&1 || { echo "$wt: REGEN FAILED"; exit 1; }
[ -f scripts/generate-consumer-skill.mjs ] && { node scripts/generate-consumer-skill.mjs >/dev/null 2>&1 || { echo "$wt: SKILL REGEN FAILED"; exit 1; }; }
if grep -l "^<<<<<<<\|^>>>>>>>" llms.txt public/llms.txt public/hds-manifest.json status.json >/dev/null 2>&1; then echo "$wt: conflict markers remain"; exit 1; fi
node scripts/check-manifest-drift.mjs >/dev/null 2>&1 || { echo "$wt: manifest drift after regen"; exit 1; }
node scripts/check-record-freshness.mjs --range origin/main..HEAD >/dev/null 2>&1 || { python3 -c "import json,datetime;p='status.json';d=json.load(open(p));d['updatedAt']=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z');json.dump(d,open(p,'w'),indent=2,ensure_ascii=False);open(p,'a').write('\n')"; pnpm exec prettier --write status.json >/dev/null; echo "$wt: status.json updatedAt bumped (freshness)"; }
git add -A
if git diff --cached --quiet; then echo "$wt: nothing to commit"; else
  if [ -f .git/MERGE_HEAD ] || git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then git commit -q --no-edit >/dev/null 2>&1 || { echo "$wt: commit failed"; exit 1; }
  else git commit -q -m "chore(status): unify status.json and regenerate docs after the main merge (#$issue)

$TRAILER" >/dev/null 2>&1 || { echo "$wt: commit failed"; exit 1; }; fi
fi
echo "$wt: HEAD $(git rev-parse --short HEAD), conflicts vs main now: $(cd /home/user/hds && git merge-tree --write-tree --name-only origin/main $(git -C $wt rev-parse HEAD) 2>&1 | grep -c CONFLICT)"
