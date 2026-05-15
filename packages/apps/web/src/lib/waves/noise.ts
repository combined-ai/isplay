class Grad {
  constructor(
    private x: number,
    private y: number,
    private z: number,
  ) {}

  dot2(x: number, y: number) {
    return this.x * x + this.y * y;
  }
}

export class Noise {
  private grad3 = [
    new Grad(1, 1, 0),
    new Grad(-1, 1, 0),
    new Grad(1, -1, 0),
    new Grad(-1, -1, 0),
    new Grad(1, 0, 1),
    new Grad(-1, 0, 1),
    new Grad(1, 0, -1),
    new Grad(-1, 0, -1),
    new Grad(0, 1, 1),
    new Grad(0, -1, 1),
    new Grad(0, 1, -1),
    new Grad(0, -1, -1),
  ];

  private p = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8,
    99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117,
    35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41,
    55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89,
    18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226,
    250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182,
    189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43,
    172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97,
    228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138,
    236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];

  private perm = new Array<number>(512);
  private gradP = new Array<Grad>(512);

  constructor(seed = 0) {
    this.seed(seed);
  }

  private seed(seed: number) {
    let value = seed;
    if (value > 0 && value < 1) value *= 65536;
    value = Math.floor(value);
    if (value < 256) value |= value << 8;

    for (let i = 0; i < 256; i++) {
      const v = i & 1 ? this.p[i] ^ (value & 255) : this.p[i] ^ ((value >> 8) & 255);
      this.perm[i] = this.perm[i + 256] = v;
      this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
    }
  }

  private fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number) {
    return (1 - t) * a + t * b;
  }

  perlin2(x: number, y: number) {
    let X = Math.floor(x);
    let Y = Math.floor(y);
    const localX = x - X;
    const localY = y - Y;
    X &= 255;
    Y &= 255;

    const n00 = this.gradP[X + this.perm[Y]].dot2(localX, localY);
    const n01 = this.gradP[X + this.perm[Y + 1]].dot2(localX, localY - 1);
    const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(localX - 1, localY);
    const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(localX - 1, localY - 1);
    const u = this.fade(localX);

    return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(localY));
  }
}
