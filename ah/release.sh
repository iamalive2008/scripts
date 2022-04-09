#!sh
set -e
gulp scripts
git add .
git commit -m "WIP"
git push
