#!/bin/bash
# build.sh <bug> <dir> : build what the hidden cases import
b=$1; d=$2
case $b in
 y*) (cd $d && node support/build-dist.mjs >/dev/null 2>&1) ;;
 d*) (cd $d && rm -rf libesm && node node_modules/typescript/bin/tsc --module nodenext --outDir libesm --target es6 >/dev/null 2>&1; node -e "require('fs').writeFileSync('libesm/package.json', JSON.stringify({type:'module',sideEffects:false}))") ;;
esac
