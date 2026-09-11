# Farkas Kristóf Péter — portfólió

Statikus, magyar nyelvű portfólió Three.js alapú 3D háttérrel. Közvetlenül kiszolgálható GitHub Pages-en; nincs buildlépés vagy backend.

## Helyi előnézet

Node.js mellett: `node preview.cjs`, majd http://127.0.0.1:4173.

## Felépítés

- `index.html`: az összes eredeti tartalom és link, szemantikus HTML-ben.
- `styles.css`: reszponzív elrendezés, statikus tartalék grafika és interakciók.
- `app.js`: navigáció, haladásjelző, effektek és hozzáférhetőségi beállítások.
- `scene.js`: procedurális krómszobor, részecskék, görgetést követő kamera és automatikus minőségcsökkentés.
- `vendor/`: Three.js **0.180.0**, helyben tárolt ES-modulok és MIT licenc.

Az effektek kikapcsolhatók; a választás helyben tárolódik. Csökkentett mozgást kérő rendszerbeállítással az oldal statikus nézetben indul. A tartalom JavaScript vagy WebGL nélkül is hozzáférhető. Az animáció háttérbe tett lapon szünetel.

## Ellenőrzés

`node --experimental-vm-modules --test tests/behavior.test.cjs`

A tesztek az effektek életciklusát, a tárolt preferenciát, a csökkentett mozgást, a háttérben szüneteltetést és a hibás 3D-betöltést vizsgálják. A böngészős vizuális ellenőrzést helyi előnézetben kell végezni.
