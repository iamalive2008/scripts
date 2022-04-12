#!sh
set -e
npm run-script build
git add .
git commit -m "WIP"
git push
