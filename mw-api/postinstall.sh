mw_from_src() {
    mkdir -p /tmp/pnpm && cd /tmp/pnpm && npm i pnpm && cd -
    cd /tmp && /tmp/pnpm/node_modules/.bin/pnpm i @movie-web/providers@github:movie-web/providers && cd -
    rm -rf node_modules/@movie-web/providers
    mv $(readlink -f /tmp/node_modules/@movie-web/providers) node_modules/@movie-web
    rm -rf node_modules/@movie-web/providers/node_modules
}
( HOME=/tmp mw_from_src )

sed -i 's|SKIP_VALIDATION_CHECK_IDS = \[|SKIP_VALIDATION_CHECK_IDS = \["vidplay",|g' node_modules/@movie-web/providers/lib/index.js

sed -i 's|altApi = false|altApi = true|g' node_modules/@movie-web/providers/lib/index.js
sed -i 's|uid: ""|uid: "20003828"|g' node_modules/@movie-web/providers/lib/index.js

perl -i -0777 -pe 's/\
  name: "Showbox",\
  rank: 150,\
  disabled: true,\
/\
  name: "Showbox",\
  rank: 150,\
  disabled: false,\
/g' node_modules/@movie-web/providers/lib/index.js
