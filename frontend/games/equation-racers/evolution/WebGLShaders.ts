export const ROAD_VERTEX_SHADER = `#version 300 es
in vec2 position;
in vec4 color;
in float depth;
in vec2 uv;
out vec4 vColor;
out float vDepth;
out vec2 vUv;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    vColor = color;
    vDepth = depth;
    vUv = uv;
}
`;

export const ROAD_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec4 vColor;
in float vDepth;
in vec2 vUv;
out vec4 fragColor;

uniform float ambientLight;
uniform vec3 sunColor;
uniform float sunIntensity;
uniform vec3 fogColor;
uniform float time;
uniform float speed;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

void main() {
    // 1. Procedural Asphalt Details
    vec2 asphaltUv = vUv * vec2(15.0, 120.0);
    float n = noise(asphaltUv) * 0.12;
    vec3 baseColor = vColor.rgb + vec3(n - 0.06);
    
    // 2. Procedural Road Lane Markings
    float edgeWidth = 0.015;
    float leftShoulder = smoothstep(edgeWidth, 0.0, vUv.x);
    float rightShoulder = smoothstep(1.0 - edgeWidth, 1.0, vUv.x);
    
    float lane1 = smoothstep(0.007, 0.0, abs(vUv.x - 0.333));
    float lane2 = smoothstep(0.007, 0.0, abs(vUv.x - 0.667));
    
    // Animate dashed lines forward based on speed scrolling
    float dash = step(0.4, fract(vUv.y * 10.0 - time * (speed * 0.001)));
    float dividers = (lane1 + lane2) * dash;
    
    vec3 lineColor = vec3(0.95, 0.80, 0.30); // Yellow lane dividers
    vec3 shoulderColor = vec3(0.95, 0.95, 0.95); // White shoulder lines
    
    baseColor = mix(baseColor, shoulderColor, leftShoulder + rightShoulder);
    baseColor = mix(baseColor, lineColor, dividers);
    
    // 3. Headlight effect
    float headlightIntensity = 0.0;
    vec2 headlightPos = vec2(0.5, -0.05);
    vec2 toLight = vUv - headlightPos;
    if (toLight.y > 0.0) {
        float angle = abs(toLight.x / toLight.y);
        float dist = length(toLight * vec2(2.5, 1.0));
        float cone = smoothstep(0.38, 0.08, angle);
        float falloff = smoothstep(0.90, 0.0, dist);
        headlightIntensity = cone * falloff * 2.2;
    }
    
    vec3 litColor = baseColor * (ambientLight + sunColor * sunIntensity + vec3(0.9, 0.95, 1.0) * headlightIntensity);
    
    // 4. Fog/Atmosphere blend
    float fogFactor = clamp((vDepth - 250.0) / 950.0, 0.0, 1.0);
    vec3 finalColor = mix(litColor, fogColor, fogFactor);
    
    fragColor = vec4(finalColor, vColor.a);
}
`;

export const SPRITE_VERTEX_SHADER = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    vUv = uv;
}
`;

export const SPRITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D spriteTexture;
uniform vec4 colorTint;
uniform float ambientLight;

void main() {
    vec4 texColor = texture(spriteTexture, vUv);
    if (texColor.a < 0.02) {
        discard;
    }
    vec3 litColor = texColor.rgb * colorTint.rgb * ambientLight;
    fragColor = vec4(litColor, texColor.a * colorTint.a);
}
`;

export const POST_VERTEX_SHADER = `#version 300 es
in vec2 position;
out vec2 vUv;

void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const POST_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D sceneTexture;
uniform float time;
uniform float speedBoost;
uniform float hitFeedback;
uniform int zone;

void main() {
    // 1. Chromatic Aberration
    float shift = 0.0006 + speedBoost * 0.007 + hitFeedback * 0.018;
    vec2 uvR = vUv + vec2(shift, 0.0);
    vec2 uvG = vUv;
    vec2 uvB = vUv - vec2(shift, 0.0);
    
    float r = texture(sceneTexture, uvR).r;
    float g = texture(sceneTexture, uvG).g;
    float b = texture(sceneTexture, uvB).b;
    float alpha = texture(sceneTexture, uvG).a;
    
    vec3 color = vec3(r, g, b);
    
    // 2. High-performance Bloom (Neon Glow pass)
    vec3 bloom = vec3(0.0);
    float weight = 0.0;
    for (float x = -2.0; x <= 2.0; x += 1.0) {
        for (float y = -2.0; y <= 2.0; y += 1.0) {
            vec2 offset = vec2(x, y) * 0.0025;
            vec3 c = texture(sceneTexture, vUv + offset).rgb;
            float luminance = dot(c, vec3(0.2126, 0.7152, 0.0722));
            if (luminance > 0.60) {
                bloom += c * (luminance - 0.60) * 1.5;
                weight += 1.0;
            }
        }
    }
    if (weight > 0.0) {
        color += (bloom / weight) * 0.7;
    }
    
    // 3. Zone Cinematic Color Grading
    if (zone == 1) { // city (cyberpunk violet)
        color = mix(color, vec3(color.r * 1.12, color.g * 0.88, color.b * 1.30), 0.40);
    } else if (zone == 2) { // mountain (moody blue-grey)
        color = mix(color, vec3(color.r * 0.90, color.g * 1.04, color.b * 1.15), 0.35);
    } else if (zone == 3) { // bridge (aquatic cyan)
        color = mix(color, vec3(color.r * 0.82, color.g * 1.08, color.b * 1.20), 0.30);
    } else if (zone == 4) { // tunnel (dark high contrast orange glow)
        color = color * 1.12;
    } else { // highway (warm sunset)
        color = mix(color, vec3(color.r * 1.12, color.g * 1.04, color.b * 0.92), 0.20);
    }
    
    // 4. Vignetting
    vec2 d = abs(vUv - 0.5) * 1.85;
    float vignette = clamp(1.0 - dot(d, d) * 0.30, 0.0, 1.0);
    color *= vignette;
    
    // 5. Film Grain/Noise
    float noiseVal = fract(sin(dot(vUv * time, vec2(12.9898, 78.233))) * 43758.5453);
    color += vec3(noiseVal) * 0.022;
    
    // 6. Hit feedback flash
    if (hitFeedback > 0.0) {
        color = mix(color, vec3(1.0, 0.2, 0.2), hitFeedback * 0.4);
    }
    
    fragColor = vec4(color, alpha);
}
`;
