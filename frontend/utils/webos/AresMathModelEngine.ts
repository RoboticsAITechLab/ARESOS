import { modelWeights, classes } from "./AresMathModel";

function relu(x: number[]): number[] {
  return x.map(v => Math.max(0, v));
}

function softmax(x: number[]): number[] {
  const max = Math.max(...x);
  const exps = x.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / (sum || 1));
}

/**
 * Predicts the classified math digit or symbol from a normalized 784-dimension stroke vector.
 */
export function predict(inputVector: number[]): { label: string; confidence: number } {
  // Layer 1 Forward Propagation (weights shape: 784 x 64)
  const z1 = new Array(64).fill(0);
  for (let h = 0; h < 64; h++) {
    let sum = modelWeights.b1[h];
    for (let i = 0; i < 784; i++) {
      sum += inputVector[i] * modelWeights.W1[i][h];
    }
    z1[h] = sum;
  }

  const a1 = relu(z1);

  // Layer 2 Forward Propagation (weights shape: 64 x 15)
  const numClasses = classes.length;
  const z2 = new Array(numClasses).fill(0);
  for (let o = 0; o < numClasses; o++) {
    let sum = modelWeights.b2[o];
    for (let h = 0; h < 64; h++) {
      sum += a1[h] * modelWeights.W2[h][o];
    }
    z2[o] = sum;
  }

  const probs = softmax(z2);

  // Determine class with highest probability (argmax)
  let maxIdx = 0;
  let maxVal = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > maxVal) {
      maxVal = probs[i];
      maxIdx = i;
    }
  }

  return {
    label: classes[maxIdx],
    confidence: maxVal,
  };
}

/**
 * Normalizes drawn canvas coordinates into a 784-element greyscale vector.
 */
export function rasterizeStrokesToGrid(strokes: { points: { x: number; y: number }[] }[], gridSize = 28): number[] {
  const grid = new Array(gridSize * gridSize).fill(0);
  const points = strokes.flatMap(s => s.points);
  if (points.length === 0) return grid;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  points.forEach(p => {
    const scaledX = Math.floor(((p.x - minX) / w) * (gridSize - 4)) + 2;
    const scaledY = Math.floor(((p.y - minY) / h) * (gridSize - 4)) + 2;

    const xClamped = Math.max(0, Math.min(gridSize - 1, scaledX));
    const yClamped = Math.max(0, Math.min(gridSize - 1, scaledY));

    grid[yClamped * gridSize + xClamped] = 1.0;

    // Line thickening dilate operations
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = xClamped + dx;
        const ny = yClamped + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
          const idx = ny * gridSize + nx;
          grid[idx] = Math.max(grid[idx], 0.7);
        }
      }
    }
  });

  return grid;
}
