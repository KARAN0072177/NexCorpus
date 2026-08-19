/**
 * Polyfills for Node.js / Serverless environments (Vercel, AWS Lambda)
 * required by pdfjs-dist when extracting text from PDF documents.
 */

if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;

    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;

    is2D = true;
    isIdentity = true;

    constructor(init?: string | number[]) {
      if (Array.isArray(init)) {
        if (init.length === 6) {
          this.a = this.m11 = init[0];
          this.b = this.m12 = init[1];
          this.c = this.m21 = init[2];
          this.d = this.m22 = init[3];
          this.e = this.m41 = init[4];
          this.f = this.m42 = init[5];
          this.is2D = true;
        } else if (init.length === 16) {
          this.m11 = this.a = init[0];
          this.m12 = this.b = init[1];
          this.m13 = init[2];
          this.m14 = init[3];
          this.m21 = this.c = init[4];
          this.m22 = this.d = init[5];
          this.m23 = init[6];
          this.m24 = init[7];
          this.m31 = init[8];
          this.m32 = init[9];
          this.m33 = init[10];
          this.m34 = init[11];
          this.m41 = this.e = init[12];
          this.m42 = this.f = init[13];
          this.m43 = init[14];
          this.m44 = init[15];
          this.is2D = false;
        }
      }
    }

    static fromMatrix(other?: any) {
      return new DOMMatrix(other);
    }

    static fromFloat32Array(array32: Float32Array) {
      return new DOMMatrix(Array.from(array32));
    }

    static fromFloat64Array(array64: Float64Array) {
      return new DOMMatrix(Array.from(array64));
    }

    multiply(other: any) {
      return this;
    }

    preMultiplySelf(other: any) {
      return this;
    }

    translate(x = 0, y = 0, z = 0) {
      return this;
    }

    scale(x = 1, y = x, z = 1) {
      return this;
    }

    rotate(angle = 0) {
      return this;
    }

    transformPoint(point?: any) {
      return point || { x: 0, y: 0, z: 0, w: 1 };
    }

    inverse() {
      return this;
    }
  }

  (globalThis as any).DOMMatrix = DOMMatrix;
  (globalThis as any).DOMMatrixReadOnly = DOMMatrix;
}

if (typeof globalThis.Path2D === "undefined") {
  class Path2D {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  }

  (globalThis as any).Path2D = Path2D;
}

if (typeof globalThis.ImageData === "undefined") {
  class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    colorSpace = "srgb";

    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  }

  (globalThis as any).ImageData = ImageData;
}

export {};
