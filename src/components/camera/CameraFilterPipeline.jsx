import { useEffect, useRef, useState } from 'react';

// WebGL shader-based filters for real-time video processing
const FILTER_SHADERS = {
  vivid: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec3 c = color.rgb;
      
      // Boost saturation and contrast
      vec3 gray = vec3(dot(c, vec3(0.299, 0.587, 0.114)));
      c = mix(gray, c, 1.5 * uIntensity);
      c = mix(vec3(0.5), c, 1.2 * uIntensity);
      
      gl_FragColor = vec4(c, color.a);
    }
  `,
  warm: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec3 c = color.rgb;
      c.r += 0.15 * uIntensity;
      c.g += 0.05 * uIntensity;
      gl_FragColor = vec4(c, color.a);
    }
  `,
  cool: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec3 c = color.rgb;
      c.b += 0.15 * uIntensity;
      c.r -= 0.05 * uIntensity;
      gl_FragColor = vec4(c, color.a);
    }
  `,
  bw: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 c = mix(color.rgb, vec3(gray), uIntensity);
      gl_FragColor = vec4(c, color.a);
    }
  `,
  filmGrain: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    uniform float uTime;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      float noise = rand(vUv + uTime) * 0.2 - 0.1;
      vec3 c = color.rgb + noise * uIntensity;
      gl_FragColor = vec4(c, color.a);
    }
  `,
  vintage: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec3 c = color.rgb;
      c = mix(c, vec3(1.0 - (1.0 - c.r) * (1.0 - 0.2), 1.0 - (1.0 - c.g) * (1.0 - 0.1), 1.0 - (1.0 - c.b) * (1.0 - 0.3)), uIntensity);
      gl_FragColor = vec4(c, color.a);
    }
  `,
  neon: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec3 c = color.rgb;
      vec3 edge = abs(sin(c * 3.14159 * 2.0)) * 2.0;
      c = mix(c, edge, 0.5 * uIntensity);
      gl_FragColor = vec4(c, color.a);
    }
  `,
  softGlow: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec3 c = color.rgb;
      c = mix(c, vec3(1.0), 0.3 * uIntensity);
      c = pow(c, vec3(0.95));
      gl_FragColor = vec4(c, color.a);
    }
  `,
  sharpen: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec4 n = texture2D(uTexture, vUv + vec2(0.01, 0.0));
      vec4 s = texture2D(uTexture, vUv - vec2(0.01, 0.0));
      vec4 e = texture2D(uTexture, vUv + vec2(0.0, 0.01));
      vec4 w = texture2D(uTexture, vUv - vec2(0.0, 0.01));
      
      vec4 c = color * 1.2 - (n + s + e + w) * 0.05;
      c = mix(color, c, uIntensity);
      gl_FragColor = c;
    }
  `,
  matte: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uIntensity;
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      vec3 c = color.rgb;
      c = pow(c, vec3(1.1));
      c = mix(color.rgb, c, uIntensity);
      gl_FragColor = vec4(c, color.a);
    }
  `,
};

const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export function CameraFilterPipeline(videoElement, canvasElement) {
  let gl = null;
  let program = null;
  let currentFilter = 'none';
  let filterIntensity = 1.0;
  let animationFrameId = null;
  let startTime = Date.now();

  const initWebGL = () => {
    gl = canvasElement.getContext('webgl', { antialias: true });
    if (!gl) return false;

    gl.viewport(0, 0, canvasElement.width, canvasElement.height);
    return true;
  };

  const compileShader = (source, type) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };

  const createProgram = (fragmentShader) => {
    const vs = compileShader(VERTEX_SHADER, gl.VERTEX_SHADER);
    const fs = compileShader(fragmentShader, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  };

  const setupQuad = (prog) => {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  };

  const renderFrame = () => {
    if (!gl || !videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      animationFrameId = requestAnimationFrame(renderFrame);
      return;
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);

    if (program) {
      gl.useProgram(program);
      const texLoc = gl.getUniformLocation(program, 'uTexture');
      gl.uniform1i(texLoc, 0);

      const intensityLoc = gl.getUniformLocation(program, 'uIntensity');
      if (intensityLoc) gl.uniform1f(intensityLoc, filterIntensity);

      const timeLoc = gl.getUniformLocation(program, 'uTime');
      if (timeLoc) gl.uniform1f(timeLoc, (Date.now() - startTime) * 0.001);

      setupQuad(program);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else {
      // No filter: simple copy
      const ctx = canvasElement.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    }

    gl.deleteTexture(texture);
    animationFrameId = requestAnimationFrame(renderFrame);
  };

  return {
    initialize() {
      if (!initWebGL()) {
        console.warn('WebGL not available, falling back to canvas 2D');
        return false;
      }
      renderFrame();
      return true;
    },

    setFilter(filterName, intensity = 1.0) {
      currentFilter = filterName;
      filterIntensity = intensity;

      if (filterName === 'none') {
        program = null;
        return;
      }

      const shader = FILTER_SHADERS[filterName];
      if (!shader) {
        console.warn(`Filter ${filterName} not found`);
        program = null;
        return;
      }

      program = createProgram(shader);
    },

    setIntensity(intensity) {
      filterIntensity = Math.max(0, Math.min(1, intensity));
    },

    captureFrame() {
      // Capture from canvas
      return canvasElement.toDataURL('image/jpeg', 0.92);
    },

    cleanup() {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (gl) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    },
  };
}

export default CameraFilterPipeline;