export const ROAD_VERTEX_SHADER = `#version 300 es
in vec2 position;
in vec4 color;
out vec4 vColor;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    vColor = color;
}
`;

export const ROAD_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec4 vColor;
out vec4 fragColor;

uniform float ambientLight;
uniform vec3 sunColor;
uniform float sunIntensity;

void main() {
    // Simple ambient + directional sun lighting calculation
    vec3 litColor = vColor.rgb * (ambientLight + sunColor * sunIntensity);
    fragColor = vec4(litColor, vColor.a);
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
    
    // Transparent cutout alpha testing discard
    if (texColor.a < 0.02) {
        discard;
    }
    
    vec3 litColor = texColor.rgb * colorTint.rgb * ambientLight;
    fragColor = vec4(litColor, texColor.a * colorTint.a);
}
`;
