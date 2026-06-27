import { AssetRegistry } from "./AssetRegistry";

export class TextureRegistry {
  public static generateAll(scene: Phaser.Scene): void {
    // 1. Generate new assets with recoloring
    this.generateRecoloredPlayer(scene);
    this.generateRecoloredEnemy(scene);
    this.generateRecoloredEffects(scene);

    // 2. Generate legacy procedural fallbacks
    this.generateGrass(scene);
    this.generateTree(scene);
    this.generateRock(scene);
    this.generatePlayer(scene); // Legacy player fallback
    this.generateSlime(scene);
    this.generateWolf(scene);
    this.generateGoblin(scene);
    this.generateCoin(scene);
    this.generateHealthOrb(scene);
    this.generateAttackSweep(scene);
    this.generateNPC(scene);
    this.generateItemBag(scene);
  }

  /**
   * Helper to perform pixel recoloring on an existing frame/texture
   */
  private static recolorTexture(
    scene: Phaser.Scene,
    sourceKey: string,
    frameName: string | null,
    destKey: string,
    colorSwapFn: (r: number, g: number, b: number, a: number) => { r: number; g: number; b: number; a: number }
  ): boolean {
    if (scene.textures.exists(destKey)) return true;

    if (!scene.textures.exists(sourceKey)) {
      return false;
    }

    try {
      let width = 0;
      let height = 0;
      let imgElement: any = null;
      let frame: Phaser.Textures.Frame | null = null;

      if (frameName) {
        frame = scene.textures.getFrame(sourceKey, frameName);
        if (!frame) return false;
        width = frame.width;
        height = frame.height;
        imgElement = frame.source.image;
      } else {
        const texture = scene.textures.get(sourceKey);
        frame = texture.get();
        width = frame.width;
        height = frame.height;
        imgElement = frame.source.image;
      }

      if (!imgElement || width === 0 || height === 0) return false;

      const canvasTexture = scene.textures.createCanvas(destKey, width, height);
      if (!canvasTexture) return false;
      const ctx = canvasTexture.getContext();
      ctx.clearRect(0, 0, width, height);

      // Draw source texture onto canvas
      if (frameName && frame) {
        ctx.drawImage(
          imgElement,
          frame.cutX,
          frame.cutY,
          frame.width,
          frame.height,
          0,
          0,
          frame.width,
          frame.height
        );
      } else {
        ctx.drawImage(imgElement, 0, 0, width, height);
      }

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 0) {
          const swapped = colorSwapFn(r, g, b, a);
          data[i] = swapped.r;
          data[i + 1] = swapped.g;
          data[i + 2] = swapped.b;
          data[i + 3] = swapped.a;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      canvasTexture.refresh();
      return true;
    } catch (err) {
      console.warn(`Failed to recolor texture ${destKey}:`, err);
      return false;
    }
  }

  private static generateRecoloredPlayer(scene: Phaser.Scene): void {
    // Swap Yellow panels to sleeker Cyan, keep grays/blacks
    const swapFn = (r: number, g: number, b: number, a: number) => {
      const isYellow = r > 140 && g > 120 && b < 100;
      if (isYellow) {
        // Vibrant Cyan / Purple tint
        return { r: 0, g: 210, b: 255, a };
      }
      return { r, g, b, a };
    };

    // Recolor Stand frame
    const standSuccess = this.recolorTexture(
      scene,
      "characters",
      "robot1_stand.png",
      AssetRegistry.Player.WALKER_STAND,
      swapFn
    );

    // Recolor Hold frame
    const holdSuccess = this.recolorTexture(
      scene,
      "characters",
      "robot1_hold.png",
      AssetRegistry.Player.WALKER_HOLD,
      swapFn
    );

    // Fallbacks if characters atlas is missing
    if (!standSuccess) {
      this.generateProceduralFallback(scene, AssetRegistry.Player.WALKER_STAND, "#a855f7"); // purple
    }
    if (!holdSuccess) {
      this.generateProceduralFallback(scene, AssetRegistry.Player.WALKER_HOLD, "#6366f1"); // indigo
    }
  }

  private static generateRecoloredEnemy(scene: Phaser.Scene): void {
    // Zombie: Green skin -> Dark gray, other details/clothing highlights -> Neon Green
    const swapFn = (r: number, g: number, b: number, a: number) => {
      const isGreenSkin = g > r && g > b && g > 60 && r < 160 && b < 160;
      if (isGreenSkin) {
        // Dark gray body
        return { r: 50, g: 50, b: 50, a };
      }
      // Clothing/highlights -> Neon Green
      const isNeutral = Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
      if (!isNeutral && a > 120) {
        return { r: 0, g: 255, b: 80, a };
      }
      return { r, g, b, a };
    };

    const standSuccess = this.recolorTexture(
      scene,
      "characters",
      "zoimbie1_stand.png",
      AssetRegistry.Enemy.CRAWLER_STAND,
      swapFn
    );

    const holdSuccess = this.recolorTexture(
      scene,
      "characters",
      "zoimbie1_hold.png",
      AssetRegistry.Enemy.CRAWLER_HOLD,
      swapFn
    );

    if (!standSuccess) {
      this.generateProceduralFallback(scene, AssetRegistry.Enemy.CRAWLER_STAND, "#15803d");
    }
    if (!holdSuccess) {
      this.generateProceduralFallback(scene, AssetRegistry.Enemy.CRAWLER_HOLD, "#166534");
    }
  }

  private static generateRecoloredEffects(scene: Phaser.Scene): void {
    const swapCyan = (r: number, g: number, b: number, a: number) => {
      const isRed = r > 100 && g < 80 && b < 80;
      if (isRed) return { r: 0, g: 210, b: 255, a };
      return { r, g, b, a };
    };

    const swapGreen = (r: number, g: number, b: number, a: number) => {
      const isRed = r > 100 && g < 80 && b < 80;
      if (isRed) return { r: 0, g: 255, b: 80, a };
      return { r, g, b, a };
    };

    const cyanSuccess = this.recolorTexture(scene, "tile_197", null, AssetRegistry.Effects.CYAN_SPLATTER, swapCyan);
    const greenSuccess = this.recolorTexture(scene, "tile_197", null, AssetRegistry.Effects.GREEN_SPLATTER, swapGreen);

    if (!cyanSuccess) {
      this.generateProceduralSplatter(scene, AssetRegistry.Effects.CYAN_SPLATTER, "#00ffff");
    }
    if (!greenSuccess) {
      this.generateProceduralSplatter(scene, AssetRegistry.Effects.GREEN_SPLATTER, "#00ff50");
    }
  }

  private static generateProceduralFallback(scene: Phaser.Scene, destKey: string, color: string): void {
    if (scene.textures.exists(destKey)) return;
    const size = 32;
    const canvasTexture = scene.textures.createCanvas(destKey, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(10, 12, 3, 3);
    ctx.fillRect(19, 12, 3, 3);

    canvasTexture.refresh();
  }

  private static generateProceduralSplatter(scene: Phaser.Scene, destKey: string, color: string): void {
    if (scene.textures.exists(destKey)) return;
    const size = 24;
    const canvasTexture = scene.textures.createCanvas(destKey, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(12, 12, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(12, 2, 2, 20);
    ctx.fillRect(2, 12, 20, 2);

    canvasTexture.refresh();
  }

  // --- EXISTING/LEGACY PROCEDURAL GENERATORS (Preserved for backwards compatibility & fallbacks) ---

  private static generateGrass(scene: Phaser.Scene): void {
    const key = AssetRegistry.GRASS;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.fillStyle = "#2c5e3b";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#244d30";
    ctx.fillRect(4, 8, 2, 2);
    ctx.fillRect(16, 20, 2, 2);
    ctx.fillRect(24, 4, 2, 2);
    ctx.fillRect(10, 26, 2, 2);

    ctx.fillStyle = "#346e45";
    ctx.fillRect(8, 14, 2, 2);
    ctx.fillRect(20, 10, 2, 2);
    ctx.fillRect(12, 4, 2, 2);
    ctx.fillRect(22, 24, 2, 2);

    canvasTexture.refresh();
  }

  private static generateTree(scene: Phaser.Scene): void {
    const key = AssetRegistry.TREE;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#70483c";
    ctx.fillRect(13, 20, 6, 12);

    ctx.fillStyle = "#1e4024";
    ctx.beginPath();
    ctx.arc(16, 13, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#275932";
    ctx.beginPath();
    ctx.arc(16, 11, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3c8049";
    ctx.beginPath();
    ctx.arc(13, 8, 6, 0, Math.PI * 2);
    ctx.fill();

    canvasTexture.refresh();
  }

  private static generateRock(scene: Phaser.Scene): void {
    const key = AssetRegistry.ROCK;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#4a4f54";
    ctx.beginPath();
    ctx.moveTo(8, 24);
    ctx.lineTo(4, 16);
    ctx.lineTo(10, 6);
    ctx.lineTo(22, 4);
    ctx.lineTo(28, 14);
    ctx.lineTo(26, 26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#313538";
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(22, 4);
    ctx.lineTo(28, 14);
    ctx.lineTo(26, 26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#656c73";
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(10, 6);
    ctx.lineTo(22, 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#1d1f21";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, 10);
    ctx.lineTo(16, 16);
    ctx.lineTo(12, 22);
    ctx.stroke();

    canvasTexture.refresh();
  }

  private static generatePlayer(scene: Phaser.Scene): void {
    const key = AssetRegistry.PLAYER;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(16, 28, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, 8, 0, 26);
    gradient.addColorStop(0, "#a855f7");
    gradient.addColorStop(1, "#6366f1");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(16, 18, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4338ca";
    ctx.beginPath();
    ctx.moveTo(7, 12);
    ctx.lineTo(16, 1);
    ctx.lineTo(25, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#312e81";
    ctx.fillRect(5, 11, 22, 2);

    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(11, 16, 3, 2);
    ctx.fillRect(18, 16, 3, 2);

    canvasTexture.refresh();
  }

  private static generateNPC(scene: Phaser.Scene): void {
    const key = AssetRegistry.NPC;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#14b8a6";
    ctx.beginPath();
    ctx.arc(16, 18, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f766e";
    ctx.beginPath();
    ctx.moveTo(8, 12);
    ctx.lineTo(16, 2);
    ctx.lineTo(24, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(12, 16, 2, 2);
    ctx.fillRect(18, 16, 2, 2);

    canvasTexture.refresh();
  }

  private static generateSlime(scene: Phaser.Scene): void {
    const key = AssetRegistry.SLIME;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(16, 27, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(16, 20, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.ellipse(13, 17, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e3a1e";
    ctx.fillRect(12, 19, 2, 2);
    ctx.fillRect(18, 19, 2, 2);

    canvasTexture.refresh();
  }

  private static generateWolf(scene: Phaser.Scene): void {
    const key = AssetRegistry.WOLF;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(16, 27, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4b5563";
    ctx.beginPath();
    ctx.moveTo(8, 24);
    ctx.lineTo(6, 12);
    ctx.lineTo(11, 6);
    ctx.lineTo(21, 6);
    ctx.lineTo(26, 12);
    ctx.lineTo(24, 24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(12, 16, 8, 8);

    ctx.fillStyle = "#ea580c";
    ctx.fillRect(10, 12, 3, 2);
    ctx.fillRect(19, 12, 3, 2);

    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(4, 2);
    ctx.lineTo(11, 8);
    ctx.moveTo(26, 12);
    ctx.lineTo(28, 2);
    ctx.lineTo(21, 8);
    ctx.fill();

    canvasTexture.refresh();
  }

  private static generateGoblin(scene: Phaser.Scene): void {
    const key = AssetRegistry.GOBLIN;
    if (scene.textures.exists(key)) return;

    const size = 32;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(16, 27, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(16, 18, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.moveTo(10, 15);
    ctx.lineTo(2, 10);
    ctx.lineTo(9, 18);
    ctx.moveTo(22, 15);
    ctx.lineTo(30, 10);
    ctx.lineTo(23, 18);
    ctx.fill();

    ctx.fillStyle = "#78350f";
    ctx.fillRect(11, 22, 10, 6);

    ctx.fillStyle = "#eab308";
    ctx.fillRect(12, 15, 2, 2);
    ctx.fillRect(18, 15, 2, 2);

    canvasTexture.refresh();
  }

  private static generateCoin(scene: Phaser.Scene): void {
    const key = AssetRegistry.COIN;
    if (scene.textures.exists(key)) return;

    const size = 16;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ca8a04";
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(8, 8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(6, 6, 2, 2);

    canvasTexture.refresh();
  }

  private static generateHealthOrb(scene: Phaser.Scene): void {
    const key = AssetRegistry.HEALTH_ORB;
    if (scene.textures.exists(key)) return;

    const size = 16;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(8, 8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f87171";
    ctx.beginPath();
    ctx.arc(8, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    canvasTexture.refresh();
  }

  private static generateAttackSweep(scene: Phaser.Scene): void {
    const key = AssetRegistry.ATTACK_SWEEP;
    if (scene.textures.exists(key)) return;

    const size = 64;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    const gradient = ctx.createRadialGradient(32, 32, 10, 32, 32, 28);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    gradient.addColorStop(0.5, "rgba(129, 140, 248, 0.6)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0)");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(32, 32, 20, -Math.PI / 4, (3 * Math.PI) / 4);
    ctx.stroke();

    canvasTexture.refresh();
  }

  private static generateItemBag(scene: Phaser.Scene): void {
    const key = AssetRegistry.ITEM_BAG;
    if (scene.textures.exists(key)) return;

    const size = 16;
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) return;
    const ctx = canvasTexture.getContext();

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#a16207";
    ctx.beginPath();
    ctx.arc(8, 10, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#854d0e";
    ctx.beginPath();
    ctx.moveTo(5, 5);
    ctx.lineTo(11, 5);
    ctx.lineTo(9, 8);
    ctx.lineTo(7, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#eab308";
    ctx.fillRect(5, 6, 6, 1.5);

    canvasTexture.refresh();
  }
}
