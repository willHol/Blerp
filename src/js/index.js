const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')
const imageData = ctx.createImageData(canvas.width, canvas.height)

const grid = [
  [0xff0000, 0xff3300, 0xff0000],
  [0x0000ff, 0xffffff, 0x0000ff]
]

const widthPerSquare = canvas.width / (grid[0].length - 1)
const heightPerSquare = canvas.height / (grid.length -  1)

const examplePoint = { x: 0.5, y: 0.5, color: 0xff0000 }
const exampleUnit = {
  '00': 0xff0000,
  '01': 0x00ff00,
  '10': 0x000000,
  '11': 0xffffff,
}

// R = 0, G = 1, B = 2, A = 3
const getPixel = (imageData) =>
  (x, y) => {
    const index = y * (imageData.width * 4) + (x * 4)
    
    return {
     r: imageData.data[index],
     g: imageData.data[index + 1],
     b: imageData.data[index + 2],
     a: imageData.data[index + 3],
    }
  }

const getPixelWithImage = getPixel(imageData)

const setPixel = (imageData) =>
  (x, y, { r = 0, g = 0, b = 0, a = 255 } = {}) => {
    const index = y * (imageData.width * 4) + (x * 4)

    imageData.data[index] = r
    imageData.data[index + 1] = g
    imageData.data[index + 2] = b
    imageData.data[index + 3] = a
  }

const setPixelWithImage = setPixel(imageData)

// Only works for unit square
const bilinearInterpolateUnit = (point, unit) => {
  const { r: r1, g: g1, b: b1 } = hexTo255RGB(unit['00'])
  const { r: r2, g: g2, b: b2 } = hexTo255RGB(unit['10'])
  const { r: r3, g: g3, b: b3 } = hexTo255RGB(unit['01'])
  const { r: r4, g: g4, b: b4 } = hexTo255RGB(unit['11'])

  const c1 = (1 - point.x) * (1 - point.y)
  const c2 = point.x * (1 - point.y)
  const c3 = (1 - point.x) * point.y
  const c4 = point.x * point.y

  r = r1 * c1 + r2 * c2 + r3 * c3 + r4 * c4
  g = g1 * c1 + g2 * c2 + g3 * c3 + g4 * c4
  b = b1 * c1 + b2 * c2 + b3 * c3 + b4 * c4

  return { r, g, b }
}

const gridIterator = ((grid) => {
  // Represents the bottom left corner
  let x = 0
  let y = 1
  let done = false

  const reset = () => (x = 0, y = 1, done = false)

  return {
    [Symbol.iterator]() { return reset(), this; },
    next() {
      if (!done) {
        const square = {
          '00': grid[y][x],
          '01': grid[y - 1][x],
          '10': grid[y][x + 1],
          '11': grid[y - 1][x + 1],
          trueX: x,
          trueY: y,
        }
        // Check for final square
        if (x >= grid[0].length - 2 && y >= grid.length - 1) {
          done = true
        }

        // Translate the grid origins
        if (x < grid[0].length - 2) {
          x += 1
        } else {
          x = 0
          y += 1
        }

        return { value: square, done: false }
      }
      
      return { value: undefined, done: true }
    }
  }
})(grid);

const getQuadrant = (x, y) => {
  for (item of gridIterator) {
    if (x >= item.trueX * widthPerSquare &&
        x <= (item.trueX + 1) * widthPerSquare &&
        y >= (item.trueY - 1) * heightPerSquare &&
        y <= item.trueY * heightPerSquare
    ) {
      return item;
    }
  }
}

const zeroPad = (padTo) =>
  (str) => '0'.repeat(Math.max(0, padTo - str.length)) + str

const hexPad = zeroPad(6)

const hexTo255RGB = (hex) => {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  }
}

const interpolate = () => {
  for (let x = 0; x < canvas.height; x++) {
    for (let y = 0; y < canvas.width; y++) {
      const quadrant = getQuadrant(x, y)
      const xRelativeToQuadrant = (x - (quadrant.trueX * widthPerSquare)) / (widthPerSquare - 1)
      const yRelativeToQuadrant = 1 - (y - ((quadrant.trueY - 1) * heightPerSquare)) / (heightPerSquare - 1)
      
      const { r, g, b } = bilinearInterpolateUnit({ x: xRelativeToQuadrant, y: yRelativeToQuadrant }, quadrant)
      setPixelWithImage(x, y, {r, g, b})
    }
  }
}

const animate = () => {
  requestAnimationFrame(animate)

  interpolate()

  ctx.putImageData(imageData, 0, 0);
}

animate()
