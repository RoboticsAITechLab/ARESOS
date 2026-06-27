import {
  ROAD_VERTEX_SHADER,
  ROAD_FRAGMENT_SHADER,
  SPRITE_VERTEX_SHADER,
  SPRITE_FRAGMENT_SHADER,
} from "./WebGLShaders";

export class WebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private roadProgram: WebGLProgram | null = null;
  private spriteProgram: WebGLProgram | null = null;

  // GPU Buffers
  private roadVAO: WebGLVertexArrayObject | null = null;
  private roadVBO: WebGLBuffer | null = null;
  private spriteVAO: WebGLVertexArrayObject | null = null;
  private spriteVBO: WebGLBuffer | null = null;

  // Textures
  private atlasTexture: WebGLTexture | null = null;
  private carTexture: WebGLTexture | null = null;

  // Canvas context sizes
  private width = 800;
  private height = 600;

  // Quality settings
  public quality: "low" | "medium" | "high" = "high";

  // Sprite Atlas UV mapping configuration
  private atlasAssetMap: Record<string, { uMin: number; vMin: number; uMax: number; vMax: number }> = {};

  // Vertex staging lists
  private roadBufferData = new Float32Array(30000); // 30k elements max per frame
  private roadBufferIndex = 0;

  private spriteBufferData = new Float32Array(20000); // 20k elements
  private spriteBufferIndex = 0;

  constructor(canvas: HTMLCanvasElement) {
    try {
      this.gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: true,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });

      if (this.gl) {
        this.initWebGL();
        this.buildSpriteAtlas();
      }
    } catch (e) {
      console.error("Failed to initialize WebGL2 context", e);
      this.gl = null;
    }
  }

  public isSupported(): boolean {
    return this.gl !== null;
  }

  private initWebGL(): void {
    const gl = this.gl!;

    // Compile shaders
    this.roadProgram = this.createProgram(gl, ROAD_VERTEX_SHADER, ROAD_FRAGMENT_SHADER);
    this.spriteProgram = this.createProgram(gl, SPRITE_VERTEX_SHADER, SPRITE_FRAGMENT_SHADER);

    // Setup Road VBO / VAO
    this.roadVAO = gl.createVertexArray();
    this.roadVBO = gl.createBuffer();
    gl.bindVertexArray(this.roadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.roadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.roadBufferData.byteLength, gl.DYNAMIC_DRAW);

    // Layout: position (vec2) + color (vec4) = 6 floats per vertex
    const posLoc = gl.getAttribLocation(this.roadProgram!, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 6 * 4, 0);

    const colLoc = gl.getAttribLocation(this.roadProgram!, "color");
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 6 * 4, 2 * 4);

    // Setup Sprite VBO / VAO
    this.spriteVAO = gl.createVertexArray();
    this.spriteVBO = gl.createBuffer();
    gl.bindVertexArray(this.spriteVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteBufferData.byteLength, gl.DYNAMIC_DRAW);

    // Layout: position (vec2) + uv (vec2) = 4 floats per vertex
    const sPosLoc = gl.getAttribLocation(this.spriteProgram!, "position");
    gl.enableVertexAttribArray(sPosLoc);
    gl.vertexAttribPointer(sPosLoc, 2, gl.FLOAT, false, 4 * 4, 0);

    const uvLoc = gl.getAttribLocation(this.spriteProgram!, "uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

    // Enable basic blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(null);

    // Initialize car texture
    this.carTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.carTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * Generates a 2D Canvas in memory containing the high-res emojis, uploads to GPU as a Sprite Atlas
   */
  private buildSpriteAtlas(): void {
    const gl = this.gl!;
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = 512;
    atlasCanvas.height = 512;
    const ctx = atlasCanvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas transparent
    ctx.clearRect(0, 0, 512, 512);

    // List of environment emoji textures we will bake into the atlas
    const assets = [
      { name: "tree", emoji: "🌳", col: 0, row: 0 },
      { name: "pine", emoji: "🌲", col: 1, row: 0 },
      { name: "rock", emoji: "🪨", col: 2, row: 0 },
      { name: "sign", emoji: "🛑", col: 3, row: 0 },
      { name: "light", emoji: "💡", col: 4, row: 0 },
      { name: "barrier", emoji: "🚧", col: 5, row: 0 },
      { name: "coin", emoji: "🪙", col: 6, row: 0 },
      { name: "billboard", emoji: "🖼️", col: 7, row: 0 },
      { name: "skyscraper", emoji: "🏢", col: 0, row: 1 },
      { name: "mountain_cliff", emoji: "🏔️", col: 1, row: 1 },
      { name: "cactus", emoji: "🌵", col: 2, row: 1 },
      { name: "bush", emoji: "🌿", col: 3, row: 1 },
      { name: "civilian_sedan", emoji: "🚘", col: 4, row: 1 },
      { name: "civilian_truck", emoji: "🚚", col: 5, row: 1 },
      { name: "civilian_moto", emoji: "🏍️", col: 6, row: 1 },
      { name: "water_waves", emoji: "🌊", col: 7, row: 1 },
    ];

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "46px sans-serif";

    assets.forEach((a) => {
      const x = a.col * 64 + 32;
      const y = a.row * 64 + 32;
      ctx.fillText(a.emoji, x, y);

      // Store UV ratios (0.0 to 1.0)
      this.atlasAssetMap[a.name] = {
        uMin: (a.col * 64) / 512,
        vMin: (a.row * 64) / 512,
        uMax: ((a.col + 1) * 64) / 512,
        vMax: ((a.row + 1) * 64) / 512,
      };
    });

    // Upload to WebGL GPU texture
    this.atlasTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * Helper to compile and link shader programs
   */
  private createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const compile = (src: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(vsSrc, gl.VERTEX_SHADER);
    const fs = compile(fsSrc, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link failed:", gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  /**
   * Resize viewport size context
   */
  public resize(width: number, height: number): void {
    if (!this.gl) return;
    this.width = width;
    this.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Clear screen at start of frame
   */
  public clear(colorHex: string): void {
    if (!this.gl) return;
    const gl = this.gl;

    // Convert hex color to rgb
    const r = parseInt(colorHex.substring(1, 3), 16) / 255;
    const g = parseInt(colorHex.substring(3, 5), 16) / 255;
    const b = parseInt(colorHex.substring(5, 7), 16) / 255;

    gl.clearColor(r, g, b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Reset buffer indexes
    this.roadBufferIndex = 0;
    this.spriteBufferIndex = 0;
  }

  /**
   * Convert pixel coordinates (0 to W, 0 to H) to WebGL NDC space (-1.0 to 1.0)
   */
  private ndcX(x: number): number {
    return (x / this.width) * 2 - 1.0;
  }

  private ndcY(y: number): number {
    return -((y / this.height) * 2 - 1.0);
  }

  /**
   * Queue a single road segment quad into vertex buffer
   */
  public drawRoadQuad(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    x4: number, y4: number,
    colorHex: string,
    opacity = 1.0
  ): void {
    if (!this.gl) return;

    // Simple culling: if quad is completely offscreen vertically
    if (Math.min(y1, y2, y3, y4) < 0 && Math.max(y1, y2, y3, y4) < 0) return;
    if (Math.min(y1, y2, y3, y4) > this.height && Math.max(y1, y2, y3, y4) > this.height) return;

    const r = parseInt(colorHex.substring(1, 3), 16) / 255;
    const g = parseInt(colorHex.substring(3, 5), 16) / 255;
    const b = parseInt(colorHex.substring(5, 7), 16) / 255;

    const idx = this.roadBufferIndex;
    // Check buffer overflow limits
    if (idx + 36 >= this.roadBufferData.length) {
      this.flushRoad();
    }

    const data = this.roadBufferData;
    let offset = this.roadBufferIndex;

    const addVertex = (vx: number, vy: number) => {
      data[offset++] = this.ndcX(vx);
      data[offset++] = this.ndcY(vy);
      data[offset++] = r;
      data[offset++] = g;
      data[offset++] = b;
      data[offset++] = opacity;
    };

    // Triangle 1: (v1 -> v2 -> v3)
    addVertex(x1, y1);
    addVertex(x2, y2);
    addVertex(x3, y3);

    // Triangle 2: (v1 -> v3 -> v4)
    addVertex(x1, y1);
    addVertex(x3, y3);
    addVertex(x4, y4);

    this.roadBufferIndex = offset;
  }

  /**
   * Draw a textured quad utilizing uv atlas segments
   */
  public drawAtlasSprite(
    assetName: string,
    sx: number, sy: number,
    scale: number,
    baseWidth = 64, baseHeight = 64,
    tint = [1.0, 1.0, 1.0, 1.0]
  ): void {
    if (!this.gl) return;

    // Retrieve asset UV configuration
    const uv = this.atlasAssetMap[assetName] || { uMin: 0, vMin: 0, uMax: 0.125, vMax: 0.125 };

    // Basic Frustum Culling
    const w = baseWidth * scale;
    const h = baseHeight * scale;
    if (sx + w / 2 < -50 || sx - w / 2 > this.width + 50 || sy + h / 2 < -50 || sy - h / 2 > this.height + 50) {
      return;
    }

    this.drawTexturedQuad(
      sx - w / 2, sy - h / 2,
      sx + w / 2, sy - h / 2,
      sx + w / 2, sy + h / 2,
      sx - w / 2, sy + h / 2,
      uv.uMin, uv.vMin, uv.uMax, uv.vMax,
      tint,
      this.atlasTexture!
    );
  }

  /**
   * Dynamic player car texture upload draw utility
   */
  public drawPlayerCarTexture(
    carCanvas: HTMLCanvasElement,
    sx: number, sy: number,
    scale: number,
    baseWidth = 85, baseHeight = 85
  ): void {
    if (!this.gl) return;

    const gl = this.gl;
    // Bind and upload dynamic player vehicle frame
    gl.bindTexture(gl.TEXTURE_2D, this.carTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, carCanvas);

    const w = baseWidth * scale;
    const h = baseHeight * scale;

    this.drawTexturedQuad(
      sx - w / 2, sy - h / 2,
      sx + w / 2, sy - h / 2,
      sx + w / 2, sy + h / 2,
      sx - w / 2, sy + h / 2,
      0.0, 0.0, 1.0, 1.0,
      [1.0, 1.0, 1.0, 1.0],
      this.carTexture!
    );
  }

  private drawTexturedQuad(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    x4: number, y4: number,
    uMin: number, vMin: number,
    uMax: number, vMax: number,
    tint: number[],
    tex: WebGLTexture
  ): void {
    const idx = this.spriteBufferIndex;
    if (idx + 24 >= this.spriteBufferData.length) {
      this.flushSprites(tex);
    }

    const data = this.spriteBufferData;
    let offset = this.spriteBufferIndex;

    const addVertex = (vx: number, vy: number, u: number, v: number) => {
      data[offset++] = this.ndcX(vx);
      data[offset++] = this.ndcY(vy);
      data[offset++] = u;
      data[offset++] = v;
    };

    // Triangle 1
    addVertex(x1, y1, uMin, vMax);
    addVertex(x2, y2, uMax, vMax);
    addVertex(x3, y3, uMax, vMin);

    // Triangle 2
    addVertex(x1, y1, uMin, vMax);
    addVertex(x3, y3, uMax, vMin);
    addVertex(x4, y4, uMin, vMin);

    this.spriteBufferIndex = offset;

    // Immediately flush sprites on single dynamic texture updates (e.g. player car)
    if (tex === this.carTexture) {
      this.flushSprites(tex, tint);
    }
  }

  /**
   * Flush all buffered road segments to GPU and trigger draw call
   */
  public flushRoad(activeZone = "highway"): void {
    if (!this.gl || this.roadBufferIndex === 0) return;
    const gl = this.gl;

    gl.useProgram(this.roadProgram!);

    // Configure basic ambient and sun lighting values based on zone
    let ambient = 0.85;
    let sunColor = [1.0, 1.0, 1.0];
    let sunIntensity = 0.15;

    if (activeZone === "tunnel") {
      ambient = 0.28; // Tunnels are dim
      sunIntensity = 0.0;
    } else if (activeZone === "city") {
      ambient = 0.50; // Night city lights
      sunColor = [0.75, 0.70, 0.95];
      sunIntensity = 0.10;
    }

    gl.uniform1f(gl.getUniformLocation(this.roadProgram!, "ambientLight"), ambient);
    gl.uniform3fv(gl.getUniformLocation(this.roadProgram!, "sunColor"), sunColor);
    gl.uniform1f(gl.getUniformLocation(this.roadProgram!, "sunIntensity"), sunIntensity);

    gl.bindVertexArray(this.roadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.roadVBO);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.roadBufferData.subarray(0, this.roadBufferIndex));

    gl.drawArrays(gl.TRIANGLES, 0, this.roadBufferIndex / 6);

    gl.bindVertexArray(null);
    this.roadBufferIndex = 0;
  }

  /**
   * Flush all buffered sprite billboards
   */
  public flushSprites(tex: WebGLTexture, tint = [1.0, 1.0, 1.0, 1.0], activeZone = "highway"): void {
    if (!this.gl || this.spriteBufferIndex === 0) return;
    const gl = this.gl;

    gl.useProgram(this.spriteProgram!);

    let ambient = 1.0;
    if (activeZone === "tunnel") {
      ambient = 0.65; // lights illuminate billboards
    }

    gl.uniform1f(gl.getUniformLocation(this.spriteProgram!, "ambientLight"), ambient);
    gl.uniform4fv(gl.getUniformLocation(this.spriteProgram!, "colorTint"), tint);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(this.spriteProgram!, "spriteTexture"), 0);

    gl.bindVertexArray(this.spriteVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteVBO);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.spriteBufferData.subarray(0, this.spriteBufferIndex));

    gl.drawArrays(gl.TRIANGLES, 0, this.spriteBufferIndex / 4);

    gl.bindVertexArray(null);
    this.spriteBufferIndex = 0;
  }
}
