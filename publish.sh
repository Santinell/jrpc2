find src/ -name "*.coffee" -exec coffee -o lib/ -c {} \;
npm publish
