document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const mapSize = 150;
  const tileSize = 64;
  const borderWidth = 1;

  let player = {
    x: mapSize / 2,
    y: mapSize / 2,
    speed: 0.02,
    angle: 0,
    width: 64,
    height: 64
  };

  let mouseX = 0, mouseY = 0;

  const blockIIDs = ['STONE_1', 'STONE_2', 'STONE_3', 'STONE_4', 'STONE_5', 'TREE_1', 'TREE_2', 'BLOCK_1'];
  const objectImages = [
    { type: 'stone', main: 'day-stone0.png' },
    { type: 'stone', main: 'day-stone1.png' },
    { type: 'stone', main: 'day-stone2.png' },
    { type: 'stone', main: 'day-stone3.png' },
    { type: 'stone', main: 'day-stone4.png' },
    { type: 'tree', main: 'day-tree0.png', leaf: 'day-treeleaf0.png' },
    { type: 'tree', main: 'day-tree1.png', leaf: 'day-treeleaf1.png' },
    { type: 'block', main: 'day-steel-wall0.png' }
  ].map(obj => ({
    type: obj.type,
    main: Object.assign(new Image(), { src: `img/${obj.main}` }),
    leaf: obj.leaf ? Object.assign(new Image(), { src: `img/${obj.leaf}` }) : null
  }));

  const playerImages = {
    body: Object.assign(new Image(), { src: "img/day-skin0.png" }),
    leftArm: Object.assign(new Image(), { src: "img/day-left-arm0.png" }),
    rightArm: Object.assign(new Image(), { src: "img/day-right-arm0.png" })
  };

  const objectSizes = [];
  let imagesLoaded = 0;
  const totalImages = Object.values(playerImages).length + objectImages.reduce((sum, obj) => sum + 1 + (obj.leaf ? 1 : 0), 0);

  function onImageLoad(img, index) {
    if (index >= 0) {
      objectSizes[index] = { width: (img.naturalWidth / 3) || 64, height: (img.naturalHeight / 3) || 64 };
    }
    if (++imagesLoaded >= totalImages) startGame();
  }

  function onImageError(src) {
    console.error(`Не удалось загрузить ${src}`);
    if (++imagesLoaded >= totalImages) startGame();
  }

  Object.values(playerImages).forEach(img => {
    img.onload = () => onImageLoad(img, -1);
    img.onerror = () => onImageError(img.src);
  });
  objectImages.forEach((obj, index) => {
    obj.main.onload = () => onImageLoad(obj.main, index);
    obj.main.onerror = () => onImageError(obj.main.src);
    if (obj.leaf) {
      obj.leaf.onload = () => onImageLoad(obj.leaf, -1);
      obj.leaf.onerror = () => onImageError(obj.leaf.src);
    }
  });

  const objects = [];
  const keys = {};

  document.addEventListener('keydown', e => { keys[e.keyCode] = true; });
  document.addEventListener('keyup', e => { keys[e.keyCode] = false; });

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function checkCollision(newX, newY, ignoreBorder = false) {
    if (!newX || !newY || isNaN(newX) || isNaN(newY)) return { hasCollision: false };

    const playerRadius = player.width / (2 * tileSize);
    if (!ignoreBorder && (newX - playerRadius < 0 || newX + playerRadius > mapSize ||
                          newY - playerRadius < 0 || newY + playerRadius > mapSize)) {
      return { hasCollision: true, isBorder: true };
    }

    const px = newX * tileSize, py = newY * tileSize;
    const pr = player.width / 2;

    for (const obj of objects) {
      const size = objectSizes[obj.type] || { width: 64, height: 64 };
      if (!size.width || !size.height) continue;

      const ox = obj.x * tileSize, oy = obj.y * tileSize;

      if (obj.iid.startsWith('BLOCK')) {
        const scale = 0.9;
        const pw = player.width / 2, ph = player.height / 2;
        const ow = (size.width * scale) / 2, oh = (size.height * scale) / 2;
        if (px + pw > ox - ow && px - pw < ox + ow &&
            py + ph > oy - oh && py - ph < oy + oh) {
          return { hasCollision: true, isSlide: false, stoneX: obj.x, stoneY: obj.y };
        }
      } else {
        const or = Math.min(size.width, size.height) / (obj.iid.startsWith('STONE') ? 3 : 4);
        if (Math.hypot(px - ox, py - oy) < pr + or) {
          return {
            hasCollision: true,
            isSlide: true,
            stoneX: obj.x,
            stoneY: obj.y
          };
        }
      }
    }
    return { hasCollision: false };
  }

  function update() {
    if (isNaN(player.x) || isNaN(player.y)) {
      player.x = player.y = mapSize / 2;
    }

    const moveX = (keys[68] || keys[39] ? 1 : 0) - (keys[65] || keys[37] ? 1 : 0);
    const moveY = (keys[83] || keys[40] ? 1 : 0) - (keys[87] || keys[38] ? 1 : 0);
    const speed = keys[16] ? 0.04 : player.speed;

    if (moveX || moveY) {
      const len = Math.hypot(moveX, moveY);
      const normalizedX = len > 0 ? moveX / len : 0;
      const normalizedY = len > 0 ? moveY / len : 0;

      let newX = player.x + normalizedX * speed;
      let newY = player.y + normalizedY * speed;

      const collision = checkCollision(newX, newY);
      if (!collision.hasCollision) {
        player.x = newX;
        player.y = newY;
      } else if (collision.isSlide) {
        const dx = player.x - collision.stoneX;
        const dy = player.y - collision.stoneY;
        let slideX = 0, slideY = 0;

        if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
          slideY = dy > 0 ? speed : -speed;
        } else {
          slideX = dx > 0 ? speed : -speed;
        }

        const slidePosX = player.x + slideX;
        const slidePosY = player.y + slideY;
        if (!checkCollision(slidePosX, slidePosY).hasCollision) {
          player.x = slidePosX;
          player.y = slidePosY;
        }
      } else if (collision.isBorder) {
        const r = player.width / (2 * tileSize);
        player.x = Math.max(r, Math.min(mapSize - r, newX));
        player.y = Math.max(r, Math.min(mapSize - r, newY));
      } else if (!collision.isSlide) { // Обработка коллизии с блоком
        // Проверяем движение только по X
        if (moveX) {
          const xOnly = checkCollision(newX, player.y);
          if (!xOnly.hasCollision || xOnly.isSlide) {
            player.x = newX;
          }
        }
        // Проверяем движение только по Y
        if (moveY) {
          const yOnly = checkCollision(player.x, newY);
          if (!yOnly.hasCollision || yOnly.isSlide) {
            player.y = newY;
          }
        }
      }
    }
  }
  function drawPlayer() {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    player.angle = Math.atan2(mouseY - cy, mouseX - cx);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.angle);
    ctx.drawImage(playerImages.leftArm, -3, -40, 45 / 1.5, 30 / 1.5);
    ctx.drawImage(playerImages.rightArm, -3, 20, 45 / 1.5, 30 / 1.5);
    ctx.drawImage(playerImages.body, -32, -32, 64, 64);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = "#354739";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetX = Math.max(-(canvas.width / 2), Math.min(mapSize * tileSize - canvas.width / 2, player.x * tileSize - canvas.width / 2));
    const offsetY = Math.max(-(canvas.height / 2), Math.min(mapSize * tileSize - canvas.height / 2, player.y * tileSize - canvas.height / 2));

    ctx.fillStyle = "#3f5844";
    ctx.fillRect(-offsetX, -offsetY, mapSize * tileSize, mapSize * tileSize);

    objects.forEach(obj => {
      const size = objectSizes[obj.type] || { width: 64, height: 64 };
      const x = obj.x * tileSize - offsetX - size.width / 2;
      const y = obj.y * tileSize - offsetY - size.height / 2;
      ctx.drawImage(objectImages[obj.type].main, x, y, size.width, size.height);
      if (objectImages[obj.type].leaf) {
        ctx.drawImage(objectImages[obj.type].leaf, x, y, size.width, size.height);
      }
    });

    // Рендеринг коллизий
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    objects.forEach(obj => {
      const size = objectSizes[obj.type] || { width: 64, height: 64 };
      const ox = obj.x * tileSize - offsetX;
      const oy = obj.y * tileSize - offsetY;

      if (obj.iid.startsWith('BLOCK')) {
        const scale = 0.9;
        const w = size.width * scale;
        const h = size.height * scale;
        ctx.fillRect(ox - w / 2, oy - h / 2, w, h);
      } else {
        const r = Math.min(size.width, size.height) / (obj.iid.startsWith('STONE') ? 3 : 4);
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Коллизия игрока
    const pr = player.width / 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, pr, 0, Math.PI * 2);
    ctx.fill();

    drawPlayer();

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`x: ${player.x.toFixed(2)}, y: ${player.y.toFixed(2)}`, 10, 20);
    ctx.fillText(`offsetX: ${offsetX.toFixed(2)}, offsetY: ${offsetY.toFixed(2)}`, 10, 40);
  }

  canvas.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function startGame() {
    for (let x = borderWidth; x < mapSize - borderWidth; x++) {
      for (let y = borderWidth; y < mapSize - borderWidth; y++) {
        if (Math.hypot(x - 15, y - 12.5) < 5 || Math.hypot(x - 135, y - 142.5) < 5) continue;
        if (Math.random() < 0.02) {
          const type = Math.floor(Math.random() * blockIIDs.length);
          const size = objectSizes[type] || { width: 64, height: 64 };
          if (objects.every(obj => {
            const os = objectSizes[obj.type] || { width: 64, height: 64 };
            return Math.hypot(x - obj.x, y - obj.y) >= Math.max((os.width + size.width) / tileSize / 2, (os.height + size.height) / tileSize / 2);
          })) {
            objects.push({ x, y, type, iid: blockIIDs[type] });
          }
        }
      }
    }

    function gameLoop() {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    }
    gameLoop();
  }
});