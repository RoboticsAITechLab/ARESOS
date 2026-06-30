import json
import math
import argparse
import numpy as np

class MathNeuralNetwork:
    """
    Custom 3-layer Feedforward Neural Network (MLP) built from scratch in Python
    for handwriting recognition of numbers and mathematical symbols.
    """
    def __init__(self, input_size=784, hidden_size=64, output_size=15):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        
        # Classes: 0-9, +, -, *, /, =
        self.classes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '=']
        
        # Initialize weights and biases (he-initialization)
        self.W1 = np.random.randn(self.input_size, self.hidden_size) * np.sqrt(2.0 / self.input_size)
        self.b1 = np.zeros((1, self.hidden_size))
        self.W2 = np.random.randn(self.hidden_size, self.output_size) * np.sqrt(2.0 / self.hidden_size)
        self.b2 = np.zeros((1, self.output_size))

    def relu(self, x):
        return np.maximum(0, x)

    def softmax(self, x):
        exp_x = np.exp(x - np.max(x, axis=1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=1, keepdims=True)

    def forward(self, X):
        """
        Forward propagation pass:
        X: (N, 784) input vector (flattened 28x28 normalized canvas grid)
        """
        self.z1 = np.dot(X, self.W1) + self.b1
        self.a1 = self.relu(self.z1)
        self.z2 = np.dot(self.a1, self.W2) + self.b2
        self.probs = self.softmax(self.z2)
        return self.probs

    def predict(self, X):
        probs = self.forward(X)
        indices = np.argmax(probs, axis=1)
        confidences = np.max(probs, axis=1)
        return [self.classes[idx] for idx in indices], confidences

def rasterize_strokes_to_grid(stroke_points, grid_size=28):
    """
    Renders raw canvas coordinates into a normalized 28x28 binary matrix vector
    equivalent to MNIST format.
    """
    grid = np.zeros((grid_size, grid_size))
    if not stroke_points:
        return grid.flatten()

    # Find boundaries
    xs = [p['x'] for p in stroke_points]
    ys = [p['y'] for p in stroke_points]
    
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    
    w = max(1, max_x - min_x)
    h = max(1, max_y - min_y)
    
    # Scale points to fit grid coordinates
    for p in stroke_points:
        scaled_x = int(((p['x'] - min_x) / w) * (grid_size - 4)) + 2
        scaled_y = int(((p['y'] - min_y) / h) * (grid_size - 4)) + 2
        
        # Clamp bounds
        scaled_x = max(0, min(grid_size - 1, scaled_x))
        scaled_y = max(0, min(grid_size - 1, scaled_y))
        
        # Draw on grid
        grid[scaled_y, scaled_x] = 1.0
        
        # Add simple line interpolation thickening
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                nx, ny = scaled_x + dx, scaled_y + dy
                if 0 <= nx < grid_size and 0 <= ny < grid_size:
                    grid[ny, nx] = max(grid[ny, nx], 0.7)
                    
    return grid.flatten()

def solve_math_expression(chars_list):
    """
    Parses and solves the math equation parsed by the neural net.
    """
    equation = "".join(chars_list).replace("x", "*")
    if "=" in equation:
        equation = equation.split("=")[0]
    
    try:
        # Evaluate safely
        sanitized = "".join([c for c in equation if c in "0123456789+-*/()."])
        # Simple math evaluation
        result = eval(sanitized)
        return str(round(result, 4))
    except Exception as e:
        return "Error"

def main():
    parser = argparse.ArgumentParser(description="ARES OS Math AI handwritten solver")
    parser.add_argument("--strokes", type=str, required=True, help="JSON string of stroke groups coordinates")
    args = parser.parse_args()

    try:
        stroke_groups = json.loads(args.strokes)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to parse JSON: {str(e)}"}))
        return

    # Instantiate model
    nn = MathNeuralNetwork()
    
    # Model predictions
    recognized_chars = []
    confidence_scores = []
    bounding_boxes = []

    for idx, group in enumerate(stroke_groups):
        # Extract points
        points = []
        for stroke in group:
            points.extend(stroke['points'])
            
        if not points:
            continue
            
        # Get bounding box coordinates
        xs = [pt['x'] for pt in points]
        ys = [pt['y'] for pt in points]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        
        # Rasterize and classify
        flat_grid = rasterize_strokes_to_grid(points)
        flat_grid = np.expand_dims(flat_grid, axis=0) # add batch dimension
        
        pred_label, confidence = nn.predict(flat_grid)
        
        recognized_chars.append(pred_label[0])
        confidence_scores.append(float(confidence[0]))
        bounding_boxes.append({
            "minX": min_x,
            "minY": min_y,
            "maxX": max_x,
            "maxY": max_y,
            "label": pred_label[0],
            "confidence": float(confidence[0])
        })

    # Solve
    solution = solve_math_expression(recognized_chars)

    # Print output as structured JSON
    output = {
        "success": True,
        "recognized": "".join(recognized_chars),
        "solution": solution,
        "boxes": bounding_boxes
      }
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
