#!/bin/zsh
# D-071 Lighthouse recording: before/after builds x 3 profiles x 3 runs, alternating.
# Usage: run.sh <outdir>, then: python3 summarize.py <outdir>
# Needs two production builds served at the same time:
#   before (e.g. main):  npx vite build --outDir <dir-before> && npx vite preview --outDir <dir-before> --port 4174
#   after (this branch): npx vite build --outDir <dir-after>  && npx vite preview --outDir <dir-after> --port 4175
# Uses Lighthouse 12.8.2 through npx and the local Chrome, headless.
OUT=$1; mkdir -p $OUT
CH='--chrome-flags=--headless=new --no-first-run'
typeset -A PROF
PROF[mobile-4g]="--form-factor=mobile --screenEmulation.mobile --throttling-method=devtools --throttling.requestLatencyMs=165 --throttling.downloadThroughputKbps=8100 --throttling.uploadThroughputKbps=1350 --throttling.cpuSlowdownMultiplier=4"
PROF[mobile-slow4g]="--form-factor=mobile --screenEmulation.mobile --throttling-method=devtools --throttling.requestLatencyMs=562.5 --throttling.downloadThroughputKbps=1474.56 --throttling.uploadThroughputKbps=675 --throttling.cpuSlowdownMultiplier=4"
PROF[desktop]="--preset=desktop --throttling-method=devtools --throttling.requestLatencyMs=40 --throttling.downloadThroughputKbps=10240 --throttling.uploadThroughputKbps=10240 --throttling.cpuSlowdownMultiplier=1"
for run in 1 2 3; do
 for p in mobile-4g mobile-slow4g desktop; do
  for b in before:4174 after:4175; do
   name=${b%%:*}; port=${b##*:}
   npx -y lighthouse@12.8.2 http://localhost:$port/v2/home ${=PROF[$p]} --only-categories=performance --output=json --output-path=$OUT/$name-$p-$run.json --quiet "$CH" || echo "FAIL $name $p $run"
   sleep 2
  done
 done
done
echo DONE
