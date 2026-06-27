export interface TrackSection {
  type: "straight" | "curve_left" | "curve_right" | "narrow_bridge" | "boost_zone" | "hazard_zone";
  yStart: number; // Start Y position (moving up is negative Y in Phaser)
  length: number; // Vertical length of section
  startCenterX: number;
  endCenterX: number;
  startWidth: number;
  endWidth: number;
}

export class TrackSectionGenerator {
  public static createSection(
    type: TrackSection["type"],
    yStart: number,
    length: number,
    startCenterX: number,
    startWidth = 300
  ): TrackSection {
    let endCenterX = startCenterX;
    let endWidth = startWidth;

    if (type === "curve_left") {
      endCenterX = startCenterX - 180;
    } else if (type === "curve_right") {
      endCenterX = startCenterX + 180;
    } else if (type === "narrow_bridge") {
      endWidth = 140;
    }

    return {
      type,
      yStart,
      length,
      startCenterX,
      endCenterX,
      startWidth,
      endWidth,
    };
  }

  /**
   * Helper to interpolate the road center X at any given world Y
   */
  public static getCenterX(section: TrackSection, y: number): number {
    const progress = Math.max(0, Math.min(1, (section.yStart - y) / section.length));
    
    if (section.type === "curve_left" || section.type === "curve_right") {
      // Smooth Hermite interpolation for beautiful road curves
      const t = progress * progress * (3 - 2 * progress);
      return section.startCenterX + (section.endCenterX - section.startCenterX) * t;
    }
    
    return section.startCenterX + (section.endCenterX - section.startCenterX) * progress;
  }

  /**
   * Helper to interpolate the road width at any given world Y
   */
  public static getWidth(section: TrackSection, y: number): number {
    const progress = Math.max(0, Math.min(1, (section.yStart - y) / section.length));
    
    if (section.type === "narrow_bridge") {
      // Smooth bridge narrowing and widening
      const t = Math.sin(progress * Math.PI);
      return section.startWidth - (section.startWidth - section.endWidth) * t;
    }
    
    return section.startWidth + (section.endWidth - section.startWidth) * progress;
  }
}
