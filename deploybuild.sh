rm -rf node_modules
rm -rf build
rm -rf docs/static
rm -rf docs/images
rm -rf docs/asset-manifest.json
rm -rf docs/favicon.ico
rm -rf docs/index.html
rm -rf docs/logo192.png
rm -rf docs/logo512.png
rm -rf docs/manifest.json
rm -rf docs/robots.txt


npm install --save --force
npm run build

cp -r ./build/* ./docs/
ls docs --all