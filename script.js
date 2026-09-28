const game = document.getElementById("game");
const gameViewport = document.getElementById("gameViewport");

const discus = document.getElementById("discus");
const rock = document.getElementById("rock");
const net = document.getElementById("net");
const plant = document.getElementById("plant");
const food = document.getElementById("food");

const startScreen = document.getElementById("startScreen");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");

const scoreDisplay = document.getElementById("score");
const gameOverScore = document.getElementById("gameOverScore");
const gameOverTitle =
  document.getElementById("gameOverTitle");


/* ==========================
   NASTAVENÍ HRY
   ========================== */

const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;

const groundHeight = 95;

const jumpHeight = 110;
const ascentTime = 310;
const descentTime = 280;

let speed = 350;
const startSpeed = 350;
const maxSpeed = 600;
const acceleration = 0.2;

const startMinSpawn = 850;
const startMaxSpawn = 1500;

const foodValue = 3;
const minFoodCount = 1;
const maxFoodCount = 5;


/* ==========================
   STAV HRY
   ========================== */

let started = false;
let gameOverState = false;
let paused = false;

let score = 0;
let scoreStartTime = 0;
let bonusScore = 0;


/* ==========================
   STAV SKOKU
   ========================== */

let jumping = false;
let holding = false;
let ascending = false;

let y = groundHeight;

let jumpStartTime = 0;
let descentStartTime = 0;


/* ==========================
   OBJEKTY
   ========================== */

let obstacles = [];
let foods = [];

let nextSpawn = 0;
let lastTime = 0;

let groundX = 0;

let nextFoodSpawn = 0;
let lastFoodTime = 0;


/* ==========================
   SKRYTÍ ŠABLON
   ========================== */

rock.style.left = "-1000px";
net.style.left = "-1000px";
plant.style.left = "-1000px";

discus.style.bottom = `${y}px`;


/* ==========================
   NÁHODNÝ TYP PŘEKÁŽKY
   ========================== */

function randomType() {
  const types = ["rock", "net", "plant"];

  return types[Math.floor(Math.random() * types.length)];
}


/* ==========================
   VYTVOŘENÍ PŘEKÁŽKY
   ========================== */

function spawn() {
  const type = randomType();

  /*
     Síť může překrývat food,
     ostatní překážky ne.
  */

  if (type !== "net") {
    const template = {
      rock,
      plant
    }[type];

    const obstacleWidth = template.offsetWidth;
    const obstacleHeight = template.offsetHeight;

    const obstacleBottom =
      parseFloat(getComputedStyle(template).bottom);

    const obstacleTop =
      obstacleBottom + obstacleHeight;

    const margin = 80;

    const obstacleLeft = 850;
    const obstacleRight =
      obstacleLeft + obstacleWidth;

    /*
       Kontrola existujícího foodu
    */

    for (const f of foods) {
      const foodLeft = f.position;
      const foodRight = foodLeft + 40;

      const foodBottom =
        parseFloat(getComputedStyle(f.element).bottom);

      const foodTop =
        foodBottom + 40;

      const overlap =
        obstacleLeft < foodRight + margin &&
        obstacleRight > foodLeft - margin &&
        obstacleBottom < foodTop + margin &&
        obstacleTop > foodBottom - margin;

      if (overlap) {
        return false;
      }
    }
  }


  /* ==========================
     VYTVOŘENÍ
     ========================== */

  const template = {
    rock,
    net,
    plant
  }[type];

  const element = template.cloneNode(true);

  element.removeAttribute("id");
  element.classList.add(type);

  element.style.left = "850px";
  element.style.transform = "translateX(0px)";

  game.appendChild(element);

  obstacles.push({
    element,
    position: 850
  });

  return true;
}


/* ==========================
   VYTVOŘENÍ KRMENÍ
   ========================== */

function spawnFood() {
  const count =
    Math.floor(
      Math.random() *
      (maxFoodCount - minFoodCount + 1)
    ) + minFoodCount;

  const foodSpacing = 50;

  let startPosition = 850;
  let bottom = Math.random() < 0.5 ? 220 : 100;

  let safe = false;
  let attempts = 0;

  while (!safe && attempts < 30) {
    safe = true;

    startPosition =
      850 + Math.random() * 150;

    bottom =
      Math.random() < 0.5 ? 220 : 100;

    for (let i = 0; i < count; i++) {
      const foodLeft =
        startPosition + i * foodSpacing;

      const foodRight =
        foodLeft + 40;

      const foodBottom = bottom;
      const foodTop = bottom + 40;

      for (const obstacle of obstacles) {

        /* Síť může food překrývat */
        if (obstacle.element.classList.contains("net")) {
          continue;
        }

        const obstacleLeft = obstacle.position;

        const obstacleRight =
          obstacle.position +
          obstacle.element.offsetWidth;

        const obstacleBottom =
          parseFloat(
            getComputedStyle(
              obstacle.element
            ).bottom
          );

        const obstacleTop =
          obstacleBottom +
          obstacle.element.offsetHeight;

        const margin = 80;

        const overlap =
          foodLeft < obstacleRight + margin &&
          foodRight > obstacleLeft - margin &&
          foodBottom < obstacleTop + margin &&
          foodTop > obstacleBottom - margin;

        if (overlap) {
          safe = false;
          break;
        }
      }

      if (!safe) {
        break;
      }
    }

    attempts++;
  }


  /* ==========================
     VYTVOŘENÍ FOOD
     ========================== */

  for (let i = 0; i < count; i++) {
    const element = food.cloneNode(true);

    element.removeAttribute("id");
    element.classList.add("food");

    const position =
      startPosition + i * foodSpacing;

    element.style.left = "0px";
    element.style.transform =
      `translateX(${position}px)`;

    element.style.bottom =
      `${bottom}px`;

    game.appendChild(element);

    foods.push({
      element,
      position
    });
  }
}


/* ==========================
   ZAČÁTEK SKOKU
   ========================== */

function startJump() {
  if (
    !started ||
    gameOverState ||
    paused ||
    jumping
  ) {
    return;
  }

  jumping = true;
  holding = true;
  ascending = true;

  jumpStartTime = performance.now();
  descentStartTime = 0;
}


/* ==========================
   KONEC DRŽENÍ
   ========================== */

function stopJump() {
  holding = false;
}


/* ==========================
   POHYB TERČOVCE
   ========================== */

function updateDiscus(time) {

  /* Skóre */

  if (
    started &&
    !paused &&
    !gameOverState
  ) {
    score =
      Math.floor(
        (time - scoreStartTime) / 1000
      ) + bonusScore;

    scoreDisplay.textContent = score;
  }


  /* Skok */

  if (!paused && jumping) {
    const elapsed =
      time - jumpStartTime;


    /* Stoupání */

    if (ascending) {
      const progress =
        Math.min(
          elapsed / ascentTime,
          1
        );

      y =
        groundHeight +
        jumpHeight *
        Math.sin(
          progress * Math.PI / 2
        );

      if (progress >= 1) {
        ascending = false;
      }
    }


    /* Držení nahoře */

    else if (holding) {
      y =
        groundHeight +
        jumpHeight;
    }


    /* Klesání */

    else {
      if (!descentStartTime) {
        descentStartTime = time;
      }

      const progress =
        Math.min(
          (time - descentStartTime) /
          descentTime,
          1
        );

      y =
        groundHeight +
        jumpHeight *
        Math.cos(
          progress * Math.PI / 2
        );

      if (progress >= 1) {
        y = groundHeight;

        jumping = false;
        ascending = false;

        descentStartTime = 0;
      }
    }

    discus.style.bottom = `${y}px`;
  }

  requestAnimationFrame(updateDiscus);
}

requestAnimationFrame(updateDiscus);


/* ==========================
   POHYB PŘEKÁŽEK
   ========================== */

function moveObstacles() {

  if (
    !started ||
    paused ||
    gameOverState
  ) {
    requestAnimationFrame(moveObstacles);
    return;
  }

  const now = performance.now();

  if (!lastTime) {
    lastTime = now;
  }

  const dt =
    (now - lastTime) / 1000;

  lastTime = now;


  /* Nová překážka */

if (now >= nextSpawn) {
    const spawned = spawn();

    if (spawned) {

        const speedRatio =
            speed / startSpeed;

        const currentMinSpawn =
            Math.max(
                500,
                startMinSpawn / speedRatio
            );

        const currentMaxSpawn =
            Math.max(
                850,
                startMaxSpawn / speedRatio
            );

        nextSpawn =
            now +
            currentMinSpawn +
            Math.random() *
            (currentMaxSpawn - currentMinSpawn);
    }
}


/* Postupné zrychlování */

speed = Math.min(
    speed + acceleration * dt * 60,
    maxSpeed
);


  /* Pohyb */

  obstacles.forEach(o => {
    o.position -= speed * dt;

    o.element.style.transform =
      `translateX(${o.position - 850}px)`;
  });
  
  /* Pohyb dna */

groundX -= speed * dt;

if (groundX <= -512) {
  groundX += 512;
}

ground.style.backgroundPosition =
  `${Math.round(groundX)}px bottom`;


  /* Odstranění starých */

  obstacles =
    obstacles.filter(o => {
      if (o.position < -400) {
        o.element.remove();
        return false;
      }

      return true;
    });

  requestAnimationFrame(moveObstacles);
}

moveObstacles();


/* ==========================
   POHYB KRMENÍ
   ========================== */

function moveFood() {

  if (
    !started ||
    paused ||
    gameOverState
  ) {
    requestAnimationFrame(moveFood);
    return;
  }

  const now = performance.now();

  if (!lastFoodTime) {
    lastFoodTime = now;
  }

  const dt =
    (now - lastFoodTime) / 1000;

  lastFoodTime = now;


  /* Nová skupinka */

  if (now >= nextFoodSpawn) {
    spawnFood();

    nextFoodSpawn =
      now +
      900 +
      Math.random() * 1100;
  }


  /* Pohyb */

  foods.forEach(f => {
    f.position -= speed * dt;

    f.element.style.transform =
      `translateX(${f.position}px)`;
  });


  /* Odstranění starých */

  foods =
    foods.filter(f => {
      if (f.position < -100) {
        f.element.remove();
        return false;
      }

      return true;
    });

  requestAnimationFrame(moveFood);
}

moveFood();


/* ==========================
   SBÍRÁNÍ KRMENÍ
   ========================== */

function checkFoodCollision() {

  if (
    started &&
    !paused &&
    !gameOverState
  ) {
    const d =
      discus.getBoundingClientRect();

    for (const f of foods) {
      const r =
        f.element.getBoundingClientRect();

      const overlapX =
        Math.min(d.right, r.right) -
        Math.max(d.left, r.left);

      const overlapY =
        Math.min(d.bottom, r.bottom) -
        Math.max(d.top, r.top);

      if (
        overlapX >= 3 &&
        overlapY >= 3
      ) {
        f.element.remove();

        foods =
          foods.filter(
            item => item !== f
          );

        bonusScore += foodValue;

        break;
      }
    }
  }

  requestAnimationFrame(checkFoodCollision);
}

requestAnimationFrame(checkFoodCollision);


// ==========================
// KOLIZE
// ==========================

function checkCollision() {

  if (
    started &&
    !paused &&
    !gameOverState
  ) {

    const d =
      discus.getBoundingClientRect();

    for (const o of obstacles) {

      const r =
        o.element.getBoundingClientRect();


      // ==========================
      // ROSTLINA
      // ==========================

      if (
        o.element.classList.contains("plant")
      ) {

        /*
          Rostlina má nepravidelný tvar.
          Proto nepoužíváme celý obdélník
          70 × 110 px.

          Body jsou uvnitř skutečného
          tvaru rostliny.

          Okolo obrázku je přibližně
          5 px bezpečnostní mezera.
        */

        const plantPolygon = [

          { x: 0.45, y: 1.00 },
          { x: 0.30, y: 0.88 },
          { x: 0.34, y: 0.72 },
          { x: 0.25, y: 0.60 },

          { x: 0.38, y: 0.50 },
          { x: 0.30, y: 0.34 },

          { x: 0.46, y: 0.42 },
          { x: 0.48, y: 0.20 },

          { x: 0.55, y: 0.38 },
          { x: 0.65, y: 0.10 },

          { x: 0.68, y: 0.34 },
          { x: 0.80, y: 0.20 },

          { x: 0.73, y: 0.44 },
          { x: 0.88, y: 0.36 },

          { x: 0.77, y: 0.58 },
          { x: 0.84, y: 0.73 },

          { x: 0.70, y: 0.78 },
          { x: 0.64, y: 1.00 }
        ];


        // ==========================
        // PŘEVOD BODŮ NA OBRAZOVKU
        // ==========================

        const polygon = plantPolygon.map(p => ({
          x: r.left + p.x * r.width,
          y: r.top + p.y * r.height
        }));


        // ==========================
        // TEST BODU V POLYGONU
        // ==========================

        function pointInPolygon(x, y, polygon) {

          let inside = false;

          for (
            let i = 0, j = polygon.length - 1;
            i < polygon.length;
            j = i++
          ) {

            const xi = polygon[i].x;
            const yi = polygon[i].y;

            const xj = polygon[j].x;
            const yj = polygon[j].y;


            const intersect =
              ((yi > y) !== (yj > y)) &&
              (
                x <
                (xj - xi) *
                (y - yi) /
                (yj - yi) +
                xi
              );

            if (intersect) {

              inside = !inside;
            }
          }

          return inside;
        }


        // ==========================
        // BODY TERČOVCE
        // ==========================

        const discusPoints = [

          { x: d.left + 5, y: d.top + 5 },

          {
            x: d.right - 5,
            y: d.top + 5
          },

          {
            x: d.left + 5,
            y: d.bottom - 5
          },

          {
            x: d.right - 5,
            y: d.bottom - 5
          },

          {
            x: (d.left + d.right) / 2,
            y: (d.top + d.bottom) / 2
          }
        ];


        // ==========================
        // KOLIZE S ROSTLINOU
        // ==========================

        let plantCollision = false;

        for (const point of discusPoints) {

          if (
            pointInPolygon(
              point.x,
              point.y,
              polygon
            )
          ) {

            plantCollision = true;
            break;
          }
        }


        if (plantCollision) {

          endGame(
            "Terčovec se schoval mezi rostliny a odmítá vyplout!"
          );

          break;
        }


        // Rostlina je vyřešena,
        // nepoužívat na ni obdélníkovou kolizi.

        continue;
      }


      // ==========================
      // OSTATNÍ PŘEKÁŽKY
      // ==========================

      const overlapX =
        Math.min(d.right, r.right) -
        Math.max(d.left, r.left);

      const overlapY =
        Math.min(d.bottom, r.bottom) -
        Math.max(d.top, r.top);


      const collision =
        overlapX >= 25 &&
        overlapY >= 25;


      if (collision) {

        if (
          o.element.classList.contains("rock")
        ) {

          endGame(
            "Au! Terčovec narazil do kamene!"
          );
        }

        else if (
          o.element.classList.contains("net")
        ) {

          endGame(
            "Terčovec byl chycen do síťky a míří k pokladně!"
          );
        }

        break;
      }
    }
  }

  requestAnimationFrame(
    checkCollision
  );
}

requestAnimationFrame(
  checkCollision
);

/* ==========================
   RESET HRY
   ========================== */

function reset() {
  score = 0;
  bonusScore = 0;

  /* Překážky */

  obstacles.forEach(o => o.element.remove());
  obstacles = [];

  /* Food */

  foods.forEach(f => f.element.remove());
  foods = [];

  nextFoodSpawn =
    performance.now() + 900;

  /* Šablony */

  rock.style.left = "-1000px";
  net.style.left = "-1000px";
  plant.style.left = "-1000px";

  /* Terčovec */

  y = groundHeight;
  discus.style.bottom = `${y}px`;

  /* Skok */

  jumping = false;
  holding = false;
  ascending = false;

  jumpStartTime = 0;
  descentStartTime = 0;

  /* První překážka */

  nextSpawn =
    performance.now() + 1000;

  /* Časovače */

  speed = startSpeed;
  lastTime = performance.now();
  lastFoodTime = performance.now();
}


/* ==========================
   GAME OVER
   ========================== */

function endGame(message) {

  if (gameOverState) {
    return;
  }

  gameOverState = true;

  jumping = false;
  holding = false;

  const finalScore = score;


  /* Odstranění objektů */

  obstacles.forEach(o => o.element.remove());
  obstacles = [];

  foods.forEach(f => f.element.remove());
  foods = [];


  /* Game over obrazovka */

  scoreDisplay.style.display = "none";
  
  startScreen.classList.add("gameOverMode");
  startScreen.style.display = "flex";

/* GAME OVER titul */

gameTitle.style.display = "none";

gameOverTitle.style.display = "block";

gameOverScore.textContent =
  "SKÓRE: " + finalScore;

gameOverScore.style.display = "block";

  alert(message);

  playButton.textContent = "PLAY AGAIN";

  started = false;
}


/* ==========================
   PAUZA
   ========================== */

function togglePause() {

  if (
    !started ||
    gameOverState
  ) {
    return;
  }

  paused = !paused;

  if (paused) {
    pauseButton.innerHTML =
      '<span class="playIcon"></span>';

    pauseButton.setAttribute(
      "aria-label",
      "Pokračovat"
    );
  }

  else {
    lastTime = performance.now();
    lastFoodTime = performance.now();

    pauseButton.innerHTML =
      '<span class="pauseIcon"></span>';

    pauseButton.setAttribute(
      "aria-label",
      "Pauza"
    );
  }
}


/* ==========================
   KLÁVESNICE
   ========================== */

document.addEventListener(
  "keydown",
  event => {

    if (event.code === "Space") {

      if (!event.repeat) {
        startJump();
      }

      event.preventDefault();
    }

    if (event.code === "KeyP") {
      togglePause();
    }
  }
);


document.addEventListener(
  "keyup",
  event => {

    if (event.code === "Space") {
      stopJump();
    }
  }
);


/* ==========================
   MOBIL
   ========================== */

document.addEventListener(
  "touchstart",
  event => {

     if (
  event.target.closest("#playButton") ||
  event.target.closest("#pauseButton")
) {
  return;
}

    if (
      !started ||
      gameOverState ||
      paused
    ) {
      return;
    }

    startJump();

    event.preventDefault();
  },
  {
    passive: false
  }
);


document.addEventListener(
  "touchend",
  event => {

    if (
      event.target.closest("#playButton") ||
      event.target.closest("#pauseButton") ||
      event.target.closest("#fullscreenButton")
    ) {
      return;
    }

    stopJump();

    event.preventDefault();
  },
  {
    passive: false
  }
);


/* ==========================
   PAUZA TLAČÍTKEM
   ========================== */

pauseButton.addEventListener(
  "click",
  togglePause
);

/* ==========================
   PLAY
   ========================== */

playButton.addEventListener(
  "click",
  event => {

    event.preventDefault();
    event.stopPropagation();

    started = true;
    gameOverState = false;
    paused = false;

    startScreen.classList.remove("gameOverMode");

    /* ==========================
       OBNOVENÍ START OBRAZOVKY
       ========================== */

    gameTitle.style.display = "block";

    gameOverTitle.style.display = "none";

    gameOverScore.textContent = "";
    gameOverScore.style.display = "none";

    playButton.textContent = "PLAY";


    /* Reset */

    reset();

    scoreStartTime =
      performance.now();

    scoreDisplay.textContent = "0";
    scoreDisplay.style.display = "block";


    /* Pauza */

    pauseButton.innerHTML =
      '<span class="pauseIcon"></span>';

    pauseButton.setAttribute(
      "aria-label",
      "Pauza"
    );


    /* Skrytí start obrazovky */

    startScreen.style.display = "none";
  }
);

/* ==========================
   RESPONSIVNÍ MĚŘÍTKO HRY
   ========================== */

function fitGame() {

  const viewportWidth =
    gameViewport.clientWidth;

  const viewportHeight =
    gameViewport.clientHeight;


  const scaleX =
    viewportWidth / GAME_WIDTH;

  const scaleY =
    viewportHeight / GAME_HEIGHT;


  const scale =
    Math.min(scaleX, scaleY);


  game.style.transform =
    `scale(${scale})`;

}

/* ==========================
   PŘI NAČTENÍ
   ========================== */

fitGame();


/* ==========================
   ZMĚNA VELIKOSTI OKNA
   ========================== */

window.addEventListener(
  "resize",
  fitGame
);


/* ==========================
   iOS / iPadOS
   ========================== */

if (window.visualViewport) {

  window.visualViewport.addEventListener(
    "resize",
    fitGame
  );

}