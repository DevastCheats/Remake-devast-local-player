document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const mapSize = 150;
  const tileSize = 64;
  const borderWidth = 1;
  const randomSpawnChance = 0.02;

  // Определение типов объектов и их характеристик
  const entityTypes = {
    STONE: {
      variations: [
        { id: 'STONE_1', image: 'day-stone0.png', collision: { type: 'slide', radiusScale: 1 / 3 } },
        { id: 'STONE_2', image: 'day-stone1.png', collision: { type: 'slide', radiusScale: 1 / 3 } },
        { id: 'STONE_3', image: 'day-stone2.png', collision: { type: 'slide', radiusScale: 1 / 3 } },
        { id: 'STONE_4', image: 'day-stone3.png', collision: { type: 'slide', radiusScale: 1 / 3 } },
        { id: 'STONE_5', image: 'day-stone4.png', collision: { type: 'slide', radiusScale: 1 / 3 } }
      ]
    },
    TREE: {
      variations: [
        { id: 'TREE_1', image: 'day-tree0.png', leafImage: 'day-treeleaf0.png', collision: { type: 'slide', radiusScale: 1 / 4 } },
        { id: 'TREE_2', image: 'day-tree1.png', leafImage: 'day-treeleaf1.png', collision: { type: 'slide', radiusScale: 1 / 4 } }
      ]
    },
    BLOCK: {
      variations: [
        {
          id: 'BLOCK_1',
          images: Array.from({ length: 22 }, (_, i) => `day-steel-wall${i}.png`),
          inv: 'inv-steel-wall-in.png',
          blueprint: 'day-clear-blue-stone-wall.png',
          redprint: 'day-redprint-stone-wall.png',
          collision: { type: 'block', scale: 0.8 }
        }
      ]
    },
    SULFUR: {
      variations: [
        { id: 'SULFUR_0', image: 'day-sulfur0.png', collision: { type: 'slide', radiusScale: 1 / 4 } },
        { id: 'SULFUR_1', image: 'day-sulfur1.png', collision: { type: 'slide', radiusScale: 1 / 4 } },
        { id: 'SULFUR_2', image: 'day-sulfur2.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } }
      ]
    },
    URAN: {
      variations: [
        { id: 'URAN_0', image: 'day-uranium0.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } },
        { id: 'URAN_1', image: 'day-uranium1.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } },
        { id: 'URAN_2', image: 'day-uranium2.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } }
      ]
    },
    IRON: {
      variations: [
        { id: 'IRON_0', image: 'day-steel0.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } },
        { id: 'IRON_1', image: 'day-steel1.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } },
        { id: 'IRON_2', image: 'day-steel2.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } },
        { id: 'IRON_3', image: 'day-steel3.png', collision: { type: 'slide', radiusScale: 1.5 / 4 } }
      ]
    }
  };

  const allEntities = Object.values(entityTypes)
    .flatMap(type => type.variations.map(v => v.id));

  let player = {
    x: mapSize / 2,
    y: mapSize / 2,
    speed: 0.06,
    angle: 0,
    width: 48,
    height: 48
  };

  let mouseX = 0, mouseY = 0;
  let showCollisions = false;
  let isBuilding = false;
  let selectedSlot = null;

  // Инвентарь
  const inventory = [
    { type: 'BLOCK', variationId: 'BLOCK_1' },
    null, null, null, null, null, null, null, null
  ];
  const slotSize = 96;
  const slotSpacing = 12;
  const slotImage = Object.assign(new Image(), { src: 'img/inv-empty.png' });

  // Изображения для строительства
  const craftImages = {
    leftHand: Object.assign(new Image(), { src: 'img/day-hand-craft.png' }),
    rightHand: Object.assign(new Image(), { src: 'img/day-hand-craftpencil.png' }),
    grid: Object.assign(new Image(), { src: 'img/craft-grid.png' })
  };

  const objectImages = [];
  const objectSizes = [];
  let imagesLoaded = 0;
  let totalImages = 0;

  // Загрузка изображений
  Object.values(entityTypes).forEach((type, typeIndex) => {
    type.variations.forEach((variation, varIndex) => {
      const images = [];
      if (variation.images) {
        variation.images.forEach(imgSrc => {
          const img = Object.assign(new Image(), { src: `img/${imgSrc}` });
          images.push(img);
          totalImages++;
        });
      } else {
        const img = Object.assign(new Image(), { src: `img/${variation.image}` });
        images.push(img);
        totalImages++;
      }
      objectImages[typeIndex] = objectImages[typeIndex] || [];
      objectImages[typeIndex][varIndex] = {
        main: images.length > 1 ? images : images[0],
        leaf: variation.leafImage ? Object.assign(new Image(), { src: `img/${variation.leafImage}` }) : null,
        inv: variation.inv ? Object.assign(new Image(), { src: `img/${variation.inv}` }) : null,
        blueprint: variation.blueprint ? Object.assign(new Image(), { src: `img/${variation.blueprint}` }) : null,
        redprint: variation.redprint ? Object.assign(new Image(), { src: `img/${variation.redprint}` }) : null
      };
      if (variation.leafImage) totalImages++;
      if (variation.inv) totalImages++;
      if (variation.blueprint) totalImages++;
      if (variation.redprint) totalImages++;
    });
  });

  const playerImages = {
    body: Object.assign(new Image(), { src: "img/day-skin0.png" }),
    leftArm: Object.assign(new Image(), { src: "img/day-left-arm0.png" }),
    rightArm: Object.assign(new Image(), { src: "img/day-right-arm0.png" })
  };

  totalImages += Object.values(playerImages).length + 1 + Object.values(craftImages).length;

  function onImageLoad(img, typeIndex, varIndex) {
    if (typeIndex >= 0 && varIndex >= 0) {
      objectSizes[typeIndex] = objectSizes[typeIndex] || [];
      objectSizes[typeIndex][varIndex] = {
        width: (img.naturalWidth / 3) || 64,
        height: (img.naturalHeight / 3) || 64
      };
    }
    if (++imagesLoaded >= totalImages) startGame();
  }

  function onImageError(src) {
    console.error(`Не удалось загрузить ${src}`);
    if (++imagesLoaded >= totalImages) startGame();
  }

  slotImage.onload = () => onImageLoad(slotImage, -1, -1);
  slotImage.onerror = () => onImageError(slotImage.src);

  Object.values(playerImages).forEach(img => {
    img.onload = () => onImageLoad(img, -1, -1);
    img.onerror = () => onImageError(img.src);
  });

  Object.values(craftImages).forEach(img => {
    img.onload = () => onImageLoad(img, -1, -1);
    img.onerror = () => onImageError(img.src);
  });

  objectImages.forEach((typeImages, typeIndex) => {
    typeImages.forEach((obj, varIndex) => {
      if (Array.isArray(obj.main)) {
        obj.main.forEach(img => {
          img.onload = () => onImageLoad(img, typeIndex, varIndex);
          img.onerror = () => onImageError(img.src);
        });
      } else {
        obj.main.onload = () => onImageLoad(obj.main, typeIndex, varIndex);
        obj.main.onerror = () => onImageError(obj.main.src);
      }
      if (obj.leaf) {
        obj.leaf.onload = () => onImageLoad(obj.leaf, -1, -1);
        obj.leaf.onerror = () => onImageError(obj.leaf.src);
      }
      if (obj.inv) {
        obj.inv.onload = () => onImageLoad(obj.inv, -1, -1);
        obj.inv.onerror = () => onImageError(obj.inv.src);
      }
      if (obj.blueprint) {
        obj.blueprint.onload = () => onImageLoad(obj.blueprint, -1, -1);
        obj.blueprint.onerror = () => onImageError(obj.blueprint.src);
      }
      if (obj.redprint) {
        obj.redprint.onload = () => onImageLoad(obj.redprint, -1, -1);
        obj.redprint.onerror = () => onImageError(obj.redprint.src);
      }
    });
  });

  const objects = [];
  const keys = {};

  // Управление анимацией сетки
  let gridAnimations = [];
  let lastGridBlock = { x: Math.floor(player.x), y: Math.floor(player.y) };

  document.addEventListener('keydown', e => {
    keys[e.keyCode] = true;
    if (e.keyCode === 71) showCollisions = !showCollisions;
  });
  document.addEventListener('keyup', e => { keys[e.keyCode] = false; });

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function checkCollision(newX, newY, ignoreBorder = false, allowCurrentCollisions = false) {
    if (!newX || !newY || isNaN(newX) || isNaN(newY)) return { hasCollision: false };

    const playerRadius = player.width / (2 * tileSize);
    if (!ignoreBorder && (newX - playerRadius < 0 || newX + playerRadius > mapSize ||
                          newY - playerRadius < 0 || newY + playerRadius > mapSize)) {
      return { hasCollision: true, isBorder: true };
    }

    const px = newX * tileSize, py = newY * tileSize;
    const pr = player.width / 2;

    // Проверяем текущие коллизии игрока
    const currentCollisions = new Set();
    if (allowCurrentCollisions) {
      const currentCheck = checkCollision(player.x, player.y, ignoreBorder, false);
      if (currentCheck.hasCollision && !currentCheck.isBorder) {
        for (const obj of objects) {
          const typeIndex = obj.typeIndex;
          const varIndex = obj.varIndex;
          const size = objectSizes[typeIndex][varIndex] || { width: 64, height: 64 };
          const variation = Object.values(entityTypes)[typeIndex].variations[varIndex];
          const collision = variation.collision;
          const ox = obj.x * tileSize, oy = obj.y * tileSize;

          if (collision.type === 'block') {
            const scale = collision.scale || 0.8;
            const pw = player.width / 2, ph = player.height / 2;
            const ow = (size.width * scale) / 2, oh = (size.height * scale) / 2;
            if (player.x * tileSize + pw > ox - ow && player.x * tileSize - pw < ox + ow &&
                player.y * tileSize + ph > oy - oh && player.y * tileSize - ph < oy + oh) {
              currentCollisions.add(`${obj.x},${obj.y}`);
            }
          } else if (collision.type === 'slide') {
            const radiusScale = collision.radiusScale || 1 / 4;
            const or = Math.min(size.width, size.height) * radiusScale;
            if (Math.hypot(player.x * tileSize - ox, player.y * tileSize - oy) < pr + or) {
              currentCollisions.add(`${obj.x},${obj.y}`);
            }
          }
        }
      }
    }

    // Проверяем новые коллизии
    for (const obj of objects) {
      const typeIndex = obj.typeIndex;
      const varIndex = obj.varIndex;
      const size = objectSizes[typeIndex][varIndex] || { width: 64, height: 64 };
      if (!size.width || !size.height) continue;

      const variation = Object.values(entityTypes)[typeIndex].variations[varIndex];
      const collision = variation.collision;
      const ox = obj.x * tileSize, oy = obj.y * tileSize;

      // Пропускаем объекты, с которыми уже есть коллизия
      if (allowCurrentCollisions && currentCollisions.has(`${obj.x},${obj.y}`)) {
        continue;
      }

      if (collision.type === 'block') {
        const scale = collision.scale || 0.8;
        const pw = player.width / 2, ph = player.height / 2;
        const ow = (size.width * scale) / 2, oh = (size.height * scale) / 2;
        if (px + pw > ox - ow && px - pw < ox + ow &&
            py + ph > oy - oh && py - ph < oy + oh) {
          return { hasCollision: true, isSlide: false, stoneX: obj.x, stoneY: obj.y };
        }
      } else if (collision.type === 'slide') {
        const radiusScale = collision.radiusScale || 1 / 4;
        const or = Math.min(size.width, size.height) * radiusScale;
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

  function getBlockTextureIndex(obj, objects) {
    const variation = Object.values(entityTypes)[obj.typeIndex].variations[obj.varIndex];
    if (variation.collision.type !== 'block') return 0;
    const x = obj.x, y = obj.y;
    const right = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x + 1 && o.y === y);
    const left = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x - 1 && o.y === y);
    const down = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x && o.y === y + 1);
    const up = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x && o.y === y - 1);
    const rightDown = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x + 1 && o.y === y + 1);
    const leftDown = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x - 1 && o.y === y + 1);
    const leftUp = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x - 1 && o.y === y - 1);
    const rightUp = objects.some(o => Object.values(entityTypes)[o.typeIndex].variations[o.varIndex].id === variation.id && o.x === x + 1 && o.y === y - 1);

    if (right && left && down && up) return 7;
    if (right && left && down) return 8;
    if (right && left && up) return 9;
    if (down && left && up) return 10;
    if (down && up && right) return 11;
    if (right && down && rightDown && !left && !up) return 12;
    if (left && down && leftDown && !right && !up) return 13;
    if (left && up && leftUp && !right && !down) return 14;
    if (right && up && rightUp && !left && !down) return 15;
    if (right && up && !left && !down) return 16;
    if (left && up && !right && !down) return 17;
    if (down && left && !right && !up) return 18;
    if (down && right && !left && !up) return 19;
    if (down && right && up && rightDown && !left) return 20;
    if (down && right && left && up && rightDown && !leftUp && !rightUp) return 21;
    if (down && up && !left && !right) return 6;
    if (right && left && !up && !down) return 5;
    if (right && !left && !up && !down) return 4;
    if (left && !right && !up && !down) return 3;
    if (up && !left && !right && !down) return 2;
    if (down && !left && !right && !up) return 1;
    return 0;
  }

  function update() {
    if (isNaN(player.x) || isNaN(player.y)) {
      player.x = player.y = mapSize / 2;
    }

    const moveX = (keys[68] || keys[39] ? 1 : 0) - (keys[65] || keys[37] ? 1 : 0);
    const moveY = (keys[83] || keys[40] ? 1 : 0) - (keys[87] || keys[38] ? 1 : 0);
    const speed = keys[16] ? 0.08 : player.speed;

    if (moveX || moveY) {
      const len = Math.hypot(moveX, moveY);
      const normalizedX = len > 0 ? moveX / len : 0;
      const normalizedY = len > 0 ? moveY / len : 0;

      let newX = player.x + normalizedX * speed;
      let newY = player.y + normalizedY * speed;

      const collision = checkCollision(newX, newY, false, true);
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
        if (!checkCollision(slidePosX, slidePosY, false, true).hasCollision) {
          player.x = slidePosX;
          player.y = slidePosY;
        }
      } else if (collision.isBorder) {
        const r = player.width / (2 * tileSize);
        player.x = Math.max(r, Math.min(mapSize - r, newX));
        player.y = Math.max(r, Math.min(mapSize - r, newY));
      } else if (!collision.isSlide) {
        if (moveX) {
          const xOnly = checkCollision(newX, player.y, false, true);
          if (!xOnly.hasCollision || xOnly.isSlide) {
            player.x = newX;
          }
        }
        if (moveY) {
          const yOnly = checkCollision(player.x, newY, false, true);
          if (!yOnly.hasCollision || yOnly.isSlide) {
            player.y = newY;
          }
        }
      }
    }

    // Обновление анимации сетки
    const currentBlock = { x: Math.round(player.x), y: Math.round(player.y) };
    if (currentBlock.x !== lastGridBlock.x || currentBlock.y !== lastGridBlock.y) {
      // Игрок переместился на новый блок
      const now = performance.now();
      // Ускоряем исчезновение всех предыдущих сеток до 0.5s
      gridAnimations.forEach(anim => {
        if (anim.state === 'fadingOut') {
          anim.duration = 500;
          anim.startTime = now - (1 - anim.opacity) * 500;
        } else if (anim.state === 'fadingIn') {
          anim.state = 'fadingOut';
          anim.duration = 500;
          anim.startTime = now;
          anim.startOpacity = anim.opacity;
        }
      });
      // Добавляем новую сетку на текущем блоке
      gridAnimations.push({
        x: currentBlock.x,
        y: currentBlock.y,
        state: 'fadingIn',
        startTime: now,
        duration: 1000,
        startOpacity: 0,
        opacity: 0
      });
      lastGridBlock = currentBlock;
    }

    // Обновляем прозрачность анимаций
    const now = performance.now();
    gridAnimations = gridAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      let t = elapsed / anim.duration;
      if (t > 1) t = 1;

      if (anim.state === 'fadingIn') {
        anim.opacity = anim.startOpacity + t * (1 - anim.startOpacity);
      } else if (anim.state === 'fadingOut') {
        anim.opacity = anim.startOpacity * (1 - t);
      }

      return anim.opacity > 0.01 || anim.state === 'fadingIn';
    });
  }

  function getBuildPosition() {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const angle = Math.atan2(mouseY - cy, mouseX - cx);
    const distance = 1;
    const buildX = Math.round(player.x + Math.cos(angle) * distance);
    const buildY = Math.round(player.y + Math.sin(angle) * distance);
    return { x: buildX, y: buildY };
  }

  function drawPlayer() {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    player.angle = Math.atan2(mouseY - cy, mouseX - cx);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.angle);
    ctx.drawImage(playerImages.leftArm, -3, -40, 45 / 1.5, 30 / 1.5);
    ctx.drawImage(playerImages.rightArm, -3, 20, 45 / 1.5, 30 / 1.5);
    if (isBuilding) {
      ctx.drawImage(craftImages.leftHand, -3, -40, 45 / 1.5, 30 / 1.5);
      ctx.drawImage(craftImages.rightHand, -3, 20, 45 / 1.5, 30 / 1.5);
    }
    ctx.drawImage(playerImages.body, -32, -32, 64, 64);
    ctx.restore();
  }

  function drawInventory() {
    const totalWidth = 9 * slotSize + 8 * slotSpacing;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height - slotSize - 20;

    for (let i = 0; i < 9; i++) {
      const x = startX + i * (slotSize + slotSpacing);
      if (inventory[i]) {
        const typeIndex = Object.keys(entityTypes).indexOf(inventory[i].type);
        const varIndex = entityTypes[inventory[i].type].variations.findIndex(v => v.id === inventory[i].variationId);
        if (objectImages[typeIndex][varIndex].inv) {
          ctx.drawImage(objectImages[typeIndex][varIndex].inv, x, startY, slotSize, slotSize);
        }
      } else {
        ctx.drawImage(slotImage, x, startY, slotSize, slotSize);
      }
    }
  }

  function drawBuildPreview() {
    if (!isBuilding || selectedSlot === null) return;

    const typeIndex = Object.keys(entityTypes).indexOf(inventory[selectedSlot].type);
    const varIndex = entityTypes[inventory[selectedSlot].type].variations.findIndex(v => v.id === inventory[selectedSlot].variationId);
    const size = objectSizes[typeIndex][varIndex] || { width: 64, height: 64 };
    const { x, y } = getBuildPosition();
    const offsetX = Math.max(-(canvas.width / 2), Math.min(mapSize * tileSize - canvas.width / 2, player.x * tileSize - canvas.width / 2));
    const offsetY = Math.max(-(canvas.height / 2), Math.min(mapSize * tileSize - canvas.height / 2, player.y * tileSize - canvas.height / 2));

    // Проверка, можно ли установить блок
    const canPlace = !checkCollision(x, y, true).hasCollision && x >= borderWidth && x < mapSize - borderWidth && y >= borderWidth && y < mapSize - borderWidth;

    // Отрисовка blueprint или redprint
    const px = x * tileSize - offsetX - size.width / 2;
    const py = y * tileSize - offsetY - size.height / 2;
    const image = canPlace && objectImages[typeIndex][varIndex].blueprint
      ? objectImages[typeIndex][varIndex].blueprint
      : objectImages[typeIndex][varIndex].redprint;
    if (image) {
      ctx.drawImage(image, px, py, size.width, size.height);
    }
  }

function draw() {
  ctx.fillStyle = "#354739";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const offsetX = Math.max(-(canvas.width / 2), Math.min(mapSize * tileSize - canvas.width / 2, player.x * tileSize - canvas.width / 2));
  const offsetY = Math.max(-(canvas.height / 2), Math.min(mapSize * tileSize - canvas.height / 2, player.y * tileSize - canvas.height / 2));

  ctx.fillStyle = "#3f5844";
  ctx.fillRect(-offsetX, -offsetY, mapSize * tileSize, mapSize * tileSize);

  const now = performance.now();
  const currentBlock = { x: Math.round(player.x), y: Math.round(player.y) };
  const gridSize = tileSize * 4;

  // Отрисовка анимированных сеток
  if (isBuilding) {
    // Добавляем новую анимацию только если текущий блок не имеет активной сетки
    if (!gridAnimations.some(anim => anim.x === currentBlock.x && anim.y === currentBlock.y)) {
      gridAnimations.push({
        x: currentBlock.x,
        y: currentBlock.y,
        state: 'fadingIn',
        startTime: now,
        duration: 1000,
        opacity: 0
      });
    }

    // Обновляем и рисуем анимации
    gridAnimations.forEach((anim, index) => {
      const elapsed = now - anim.startTime;
      if (anim.state === 'fadingIn') {
        anim.opacity = Math.min(elapsed / anim.duration, 1);
        if (anim.opacity >= 1) {
          anim.state = 'visible';
          anim.startTime = now; // Сбрасываем время для точного отсчёта
        }
        // Если игрок покинул блок во время fadingIn, завершаем появление и начинаем исчезновение
        if (anim.x !== currentBlock.x || anim.y !== currentBlock.y) {
          anim.opacity = 1;
          anim.state = 'fadingOut';
          anim.startTime = now;
          anim.duration = 500;
        }
      } else if (anim.state === 'visible') {
        // Если игрок покинул блок в состоянии visible, начинаем исчезновение
        if (anim.x !== currentBlock.x || anim.y !== currentBlock.y) {
          anim.state = 'fadingOut';
          anim.startTime = now;
          anim.duration = 500;
          anim.opacity = 1;
        }
      } else if (anim.state === 'fadingOut') {
        anim.opacity = Math.max(1 - elapsed / anim.duration, 0);
        if (anim.opacity <= 0) {
          gridAnimations.splice(index, 1);
          return;
        }
      }

      // Отрисовываем только видимые сетки
      if (anim.opacity > 0) {
        const pxGrid = anim.x * tileSize - offsetX - gridSize / 2;
        const pyGrid = anim.y * tileSize - offsetY - gridSize / 2;
        ctx.globalAlpha = anim.opacity;
        ctx.drawImage(craftImages.grid, pxGrid, pyGrid, gridSize, gridSize);
      }
    });
  } else {
    // Обработка анимаций при isBuilding = false
    gridAnimations.forEach((anim, index) => {
      const elapsed = now - anim.startTime;
      if (anim.state !== 'fadingOut') {
        // Начинаем исчезновение для всех сеток, если оно ещё не началось
        anim.state = 'fadingOut';
        anim.startTime = now;
        anim.duration = 200;
        anim.opacity = anim.state === 'fadingIn' ? 1 : anim.opacity; // Завершаем fadingIn
      } else {
        // Продолжаем анимацию исчезновения
        anim.opacity = Math.max(1 - elapsed / anim.duration, 0);
        if (anim.opacity <= 0) {
          gridAnimations.splice(index, 1);
          return;
        }
      }

      // Отрисовываем только сетки в процессе исчезновения
      if (anim.opacity > 0) {
        const pxGrid = anim.x * tileSize - offsetX - gridSize / 2;
        const pyGrid = anim.y * tileSize - offsetY - gridSize / 2;
        ctx.globalAlpha = anim.opacity;
        ctx.drawImage(craftImages.grid, pxGrid, pyGrid, gridSize, gridSize);
      }
    });
  }
  ctx.globalAlpha = 1.0;

  objects.forEach(obj => {
    const size = objectSizes[obj.typeIndex][obj.varIndex] || { width: 64, height: 64 };
    const x = obj.x * tileSize - offsetX - size.width / 2;
    const y = obj.y * tileSize - offsetY - size.height / 2;
    const images = objectImages[obj.typeIndex][obj.varIndex];
    if (Object.values(entityTypes)[obj.typeIndex].variations[obj.varIndex].collision.type === 'block') {
      const textureIndex = getBlockTextureIndex(obj, objects);
      const blockImage = images.main[textureIndex] || fallbackBlockImage;
      if (blockImage && blockImage.complete && blockImage.naturalWidth) {
        ctx.drawImage(blockImage, x, y, size.width, size.height);
      } else {
        ctx.fillStyle = '#555';
        ctx.fillRect(x, y, size.width, size.height);
      }
    } else {
      if (images.main && images.main.complete && images.main.naturalWidth) {
        ctx.drawImage(images.main, x, y, size.width, size.height);
      } else {
        ctx.fillStyle = '#555';
        ctx.fillRect(x, y, size.width, size.height);
      }
      if (images.leaf && images.leaf.complete && images.leaf.naturalWidth) {
        ctx.drawImage(images.leaf, x, y, size.width, size.height);
      }
    }
  });

  if (showCollisions) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    objects.forEach(obj => {
      const size = objectSizes[obj.typeIndex][obj.varIndex] || { width: 64, height: 64 };
      const ox = obj.x * tileSize - offsetX;
      const oy = obj.y * tileSize - offsetY;
      const variation = Object.values(entityTypes)[obj.typeIndex].variations[obj.varIndex];

      if (variation.collision.type === 'block') {
        const scale = variation.collision.scale || 0.9;
        const w = size.width * scale;
        const h = size.height * scale;
        ctx.fillRect(ox - w / 2, oy - h / 2, w, h);
      } else if (variation.collision.type === 'slide') {
        const radiusScale = variation.radiusScale || 1 / 4;
        const r = Math.min(size.width, size.height) * radiusScale;
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const pr = player.width / 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlayer();
  drawInventory();
  drawBuildPreview();

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText(`x: ${player.x.toFixed(2)}, y: ${player.y.toFixed(2)}`, 10, 20);
  ctx.fillText(`offsetX: ${offsetX.toFixed(2)}, offsetY: ${offsetY.toFixed(2)}`, 10, 40);
}
  canvas.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  canvas.addEventListener('click', e => {
    const totalWidth = 9 * slotSize + 8 * slotSpacing;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height - slotSize - 20;

    // Проверка клика по слотам
    for (let i = 0; i < 9; i++) {
      const x = startX + i * (slotSize + slotSpacing);
      if (e.clientX >= x && e.clientX < x + slotSize && e.clientY >= startY && e.clientY < startY + slotSize) {
        if (inventory[i] && inventory[i].type === 'BLOCK') {
          if (isBuilding && selectedSlot === i) {
            isBuilding = false;
            selectedSlot = null;
          } else {
            isBuilding = true;
            selectedSlot = i;
          }
        }
        return;
      }
    }

    // Установка блока в режиме строительства
    if (isBuilding && selectedSlot !== null) {
      const { x, y } = getBuildPosition();
      const typeIndex = Object.keys(entityTypes).indexOf(inventory[selectedSlot].type);
      const varIndex = entityTypes[inventory[selectedSlot].type].variations.findIndex(v => v.id === inventory[selectedSlot].variationId);

      // Проверка, свободно ли место
      if (!checkCollision(x, y, true).hasCollision && x >= borderWidth && x < mapSize - borderWidth && y >= borderWidth && y < mapSize - borderWidth) {
        objects.push({
          x,
          y,
          typeIndex,
          varIndex,
          iid: inventory[selectedSlot].variationId
        });
        inventory[selectedSlot] = null;
        isBuilding = false;
        selectedSlot = null;
      }
    }
  });

  function startGame() {
    // Генерация объектов
    for (let x = borderWidth; x < mapSize - borderWidth; x++) {
      for (let y = borderWidth; y < mapSize - borderWidth; y++) {
        if (Math.hypot(x - 15, y - 12.5) < 5 || Math.hypot(x - 135, y - 12.5) < 5) continue;
        if (Math.random() < randomSpawnChance) {
          const typeIndex = Math.floor(Math.random() * Object.keys(entityTypes).length);
          const variations = Object.values(entityTypes)[typeIndex].variations;
          const varIndex = Math.floor(Math.random() * variations.length);
          const size = objectSizes[typeIndex][varIndex] || { width: 64, height: 64 };
          if (objects.every(obj => {
            const os = objectSizes[obj.typeIndex][obj.varIndex] || { width: 64, height: 64 };
            return Math.hypot(x - obj.x, y - obj.y) >= Math.max((os.width + size.width) / tileSize / 2, (os.height + size.height) / tileSize / 2);
          })) {
            objects.push({ x, y, typeIndex, varIndex, iid: variations[varIndex].id });
          }
        }
      }
    }

    // Демонстрация блоков около спавна
    const spawnX = Math.floor(mapSize / 2);
    const spawnY = Math.floor(mapSize / 2);
    const blockTypeIndex = Object.keys(entityTypes).indexOf('BLOCK');
    const blockVarIndex = entityTypes.BLOCK.variations.findIndex(v => v.id === 'BLOCK_1');

    objects.push({ x: spawnX + 2, y: spawnY, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });
    objects.push({ x: spawnX + 3, y: spawnY, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });

    objects.push({ x: spawnX + 2, y: spawnY + 3, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });
    objects.push({ x: spawnX + 3, y: spawnY + 3, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });
    objects.push({ x: spawnX + 2, y: spawnY + 4, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });
    objects.push({ x: spawnX + 3, y: spawnY + 4, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });

    objects.push({ x: spawnX + 2, y: spawnY + 6, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });
    objects.push({ x: spawnX + 3, y: spawnY + 6, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });
    objects.push({ x: spawnX + 2, y: spawnY + 7, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });
    objects.push({ x: spawnX + 3, y: spawnY + 7, typeIndex: blockTypeIndex, varIndex: blockVarIndex, iid: 'BLOCK_1' });

    // Инициализация начальной сетки
    gridAnimations.push({
      x: Math.floor(player.x),
      y: Math.floor(player.y),
      state: 'fadingIn',
      startTime: performance.now(),
      duration: 1000,
      startOpacity: 0,
      opacity: 0
    });

    function gameLoop() {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    }
    gameLoop();
  }
});