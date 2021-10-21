import React, { Component } from "react";
import Triangle from "../../Assets/Textured_Cube.obj";
import Texture from "../../Assets/T2.png";
import objFile2Object from "./ObjFileMapper";
import { VectorMaths, MatrixMaths, MatrixVectorMaths } from "./RenderMaths";

class Render3D extends Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
  }

  CanvasData = class {
    constructor(canvas, width, height) {
      this.ctx = canvas.getContext("2d");
      canvas.width = width;
      this.width = width;
      canvas.height = height;
      this.height = height;
    }
  };
  canvasData = null;

  RenderData = class {
    constructor(vCamera, vLookDir) {
      const vm = new VectorMaths();
      this.vCamera = vCamera;
      this.vLookDir = vLookDir;
      this.vUp = vm.Vector3D(0, 1, 0);
      this.fYaw = 0;
    }

    vTarget = () => {
      const vm = new VectorMaths();
      const mm = new MatrixMaths();
      const mvm = new MatrixVectorMaths();

      const target = vm.Vector3D(0, 0, 1);
      const rotation = mm.RotationY(this.fYaw);
      this.vLookDir = mvm.Multiply(rotation, target);
      return vm.Add(this.vCamera, this.vLookDir);
    };
  };
  renderData = null;

  textureData = null;

  componentDidMount() {
    this.canvasData = new this.CanvasData(
      this.canvasRef.current,
      window.innerWidth - 10,
      window.innerHeight - 10
    );
    this.renderData = new this.RenderData(
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: 0, z: 1, w: 1 }
    );
    this.doShit();
  }

  doShit = async () => {
    const model = await objFile2Object(Triangle);
    this.textureData = await this.getImgData(Texture);
    this.rotateModelAnim(model, 0);
  };

  getImgData = async (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imgData);
      };
      img.onerror = reject;
    });
  };

  rotateModelAnim = (model, fTheta) => {
    const vm = new VectorMaths();
    const mm = new MatrixMaths();
    const mvm = new MatrixVectorMaths();
    const rd = this.renderData;
    const cd = this.canvasData;

    cd.ctx.clearRect(0, 0, cd.width, cd.height);

    // Matrixes
    const cameraMatrix = mvm.Matrix_PointAt(rd.vCamera, rd.vTarget(), rd.vUp);
    const viewMatrix = mm.QuickInverse(cameraMatrix);

    const projMatrix = mm.Projection(75, cd.height / cd.width, 1, 1000000);
    const xRotMatrix = mm.RotationX(fTheta);
    const zRotMatrix = mm.RotationZ(fTheta * 0.5);
    const yRotMatrix = mm.RotationY(180 * 0.0174533);
    const transMatrix = mm.Translate(0, 0, 5);
    let worldMatrix = mm.Multiply(zRotMatrix, xRotMatrix);
    worldMatrix = mm.Multiply(yRotMatrix, worldMatrix);
    worldMatrix = mm.Multiply(worldMatrix, transMatrix);

    // Loop Thru All Faces
    const triangles = [];
    for (let faceIndex = 0; faceIndex < model.mesh.length; faceIndex++) {
      const face = model.mesh[faceIndex];
      if (face.length > 3) {
        throw new Error(
          "Non-Triangle Detected, All Faces Must Be Triangles: " + face
        );
      }

      // 3 Vertice Positions Of Triangle
      let pos1 = face[0].verticePos;
      let pos2 = face[1].verticePos;
      let pos3 = face[2].verticePos;
      let tex1 = face[0].texturePos;
      let tex2 = face[1].texturePos;
      let tex3 = face[2].texturePos;

      //Position Triangle Based On World Matrix
      pos1 = mvm.Multiply(worldMatrix, pos1);
      pos2 = mvm.Multiply(worldMatrix, pos2);
      pos3 = mvm.Multiply(worldMatrix, pos3);

      //Calculate Normal
      const line1 = vm.Subtract(pos2, pos1);
      const line2 = vm.Subtract(pos3, pos1);
      const normal = vm.Normalize(vm.CrossProduct(line1, line2));

      const camRay = vm.Subtract(pos1, rd.vCamera);
      if (vm.DotProduct(normal, camRay) < 0) {
        // Illumination
        const lightDir = vm.Normalize(vm.Vector3D(0, 0, -1));
        const lighting = vm.DotProduct(normal, lightDir) * 255;
        let faceColor = `rgb(${lighting},${lighting},${lighting})`;

        //Convert World Space 2 View Space
        pos1 = mvm.Multiply(viewMatrix, pos1);
        pos2 = mvm.Multiply(viewMatrix, pos2);
        pos3 = mvm.Multiply(viewMatrix, pos3);

        // Clip Viewed Triangle Against Near Plane
        // Could Form 2 More Triangles
        const triangle = { pos1, pos2, pos3, tex1, tex2, tex3, faceColor };
        const demoTri = {
          pos1: vm.Vector3D(0, 0, 0),
          pos2: vm.Vector3D(0, 0, 0),
          pos3: vm.Vector3D(0, 0, 0),
          tex1: vm.Vector2D(0, 0),
          tex2: vm.Vector2D(0, 0),
          tex3: vm.Vector2D(0, 0),
          faceColor: `rgb(1,1,1)`,
        };
        const clipped = [{ ...demoTri }, { ...demoTri }];
        const clippedTrianglesCount = vm.Triangle_ClipAgainstPlane(
          vm.Vector3D(0, 0, 0.1),
          vm.Vector3D(0, 0, 1),
          triangle,
          clipped[0],
          clipped[1]
        );

        for (let i = 0; i < clippedTrianglesCount; i++) {
          //Project Triangles From 3D --> 2D
          const tri = clipped[i];
          pos1 = mvm.Multiply(projMatrix, tri.pos1);
          pos2 = mvm.Multiply(projMatrix, tri.pos2);
          pos3 = mvm.Multiply(projMatrix, tri.pos3);
          tex1 = { ...tri.tex1 };
          tex2 = { ...tri.tex2 };
          tex3 = { ...tri.tex3 };
          faceColor = tri.faceColor;

          tex1.x = tex1.x / pos1.w;
          tex2.x = tex2.x / pos2.w;
          tex3.x = tex3.x / pos3.w;

          tex1.y = tex1.y / pos1.w;
          tex2.y = tex2.y / pos2.w;
          tex3.y = tex3.y / pos3.w;

          tex1.w = 1 / pos1.w;
          tex2.w = 1 / pos2.w;
          tex3.w = 1 / pos3.w;

          //Scale Into View
          pos1 = vm.Divide(pos1, pos1.w);
          pos2 = vm.Divide(pos2, pos2.w);
          pos3 = vm.Divide(pos3, pos3.w);

          // XY are inverted, putting them back
          pos1.x *= -1;
          pos1.y *= -1;
          pos2.x *= -1;
          pos2.y *= -1;
          pos3.x *= -1;
          pos3.y *= -1;

          //Offset Vertices Into Visible Normalized Space
          const offset = vm.Vector3D(1, 1, 0);
          pos1 = vm.Add(pos1, offset);
          pos2 = vm.Add(pos2, offset);
          pos3 = vm.Add(pos3, offset);
          pos1.x *= 0.5 * cd.width;
          pos1.y *= 0.5 * cd.height;
          pos2.x *= 0.5 * cd.width;
          pos2.y *= 0.5 * cd.height;
          pos3.x *= 0.5 * cd.width;
          pos3.y *= 0.5 * cd.height;

          triangles.push({ pos1, pos2, pos3, tex1, tex2, tex3, faceColor });
        }
      }
    }

    triangles.sort((a, b) => {
      const aAvgZ = (a.pos1.z + a.pos2.z + a.pos3.z) / 3;
      const bAvgZ = (b.pos1.z + b.pos2.z + b.pos3.z) / 3;
      return bAvgZ - aAvgZ;
    });

    for (let triIndex = 0; triIndex < triangles.length; triIndex++) {
      const tri = triangles[triIndex];
      const listTris = [];
      listTris.push(tri);
      let newTris = 1;

      for (let p = 0; p < 4; p++) {
        let trisToAdd = 0;

        const demoTri = {
          pos1: vm.Vector3D(0, 0, 0),
          pos2: vm.Vector3D(0, 0, 0),
          pos3: vm.Vector3D(0, 0, 0),
          tex1: vm.Vector2D(0, 0),
          tex2: vm.Vector2D(0, 0),
          tex3: vm.Vector2D(0, 0),
          faceColor: `rgb(1,1,1)`,
        };

        while (newTris > 0) {
          const clipped = [{ ...demoTri }, { ...demoTri }];
          const testTri = listTris.shift();
          newTris--;
          switch (p) {
            case 0:
              trisToAdd = vm.Triangle_ClipAgainstPlane(
                vm.Vector3D(0, 0, 0),
                vm.Vector3D(0, 1, 0),
                testTri,
                clipped[0],
                clipped[1]
              );
              break;
            case 1:
              trisToAdd = vm.Triangle_ClipAgainstPlane(
                vm.Vector3D(0, cd.height - 1, 0),
                vm.Vector3D(0, -1, 0),
                testTri,
                clipped[0],
                clipped[1]
              );
              break;
            case 2:
              trisToAdd = vm.Triangle_ClipAgainstPlane(
                vm.Vector3D(0, 0, 0),
                vm.Vector3D(1, 0, 0),
                testTri,
                clipped[0],
                clipped[1]
              );
              break;
            case 3:
              trisToAdd = vm.Triangle_ClipAgainstPlane(
                vm.Vector3D(cd.width - 1, 0, 0),
                vm.Vector3D(-1, 0, 0),
                testTri,
                clipped[0],
                clipped[1]
              );
              break;
            default:
              break;
          }

          for (let i = 0; i < trisToAdd; i++) {
            listTris.push(clipped[i]);
          }
        }
        newTris = listTris.length;
      }

      for (let i = 0; i < listTris.length; i++) {
        const tri = listTris[i];
        const fillTriangle = (ctx, pos1, pos2, pos3, color) => {
          ctx.fillStyle = color; // Fill Color
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.lineTo(pos3.x, pos3.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = color; // Wireframe Color
          ctx.stroke();
        };
        const wireframeTri = (ctx, pos1, pos2, pos3, color) => {
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.lineTo(pos3.x, pos3.y);
          ctx.closePath();
          ctx.strokeStyle = color; // Wireframe Color
          ctx.stroke();
        };
        // fillTriangle(cd.ctx, tri.pos1, tri.pos2, tri.pos3, tri.faceColor);
        wireframeTri(cd.ctx, tri.pos1, tri.pos2, tri.pos3, "black");

        // this.texturedTriangle(
        //   tri.pos1.x,
        //   tri.pos1.y,
        //   tri.tex1.x,
        //   tri.tex1.y,
        //   tri.tex1.w,
        //   tri.pos2.x,
        //   tri.pos2.y,
        //   tri.tex2.x,
        //   tri.tex2.y,
        //   tri.tex2.w,
        //   tri.pos3.x,
        //   tri.pos3.y,
        //   tri.tex3.x,
        //   tri.tex3.y,
        //   tri.tex3.w
        // );

        this.texturedTriangle(tri);
      }
    }

    // fTheta += 0.1;
    setTimeout(() => {
      this.rotateModelAnim(model, fTheta);
    }, 25);
  };

  texturedTriangle = (triangle) => {
    const tri = { ...triangle };
    if (
      !isNaN(tri.pos1.x) &&
      !isNaN(tri.pos1.y) &&
      !isNaN(tri.pos2.x) &&
      !isNaN(tri.pos2.y) &&
      !isNaN(tri.pos3.x) &&
      !isNaN(tri.pos3.y) &&
      !isNaN(tri.tex1.x) &&
      !isNaN(tri.tex1.y) &&
      !isNaN(tri.tex1.w) &&
      !isNaN(tri.tex2.x) &&
      !isNaN(tri.tex2.y) &&
      !isNaN(tri.tex2.w) &&
      !isNaN(tri.tex3.x) &&
      !isNaN(tri.tex3.y) &&
      !isNaN(tri.tex3.w)
    ) {
      const p = [tri.pos1, tri.pos2, tri.pos3];
      const t = [tri.tex1, tri.tex2, tri.tex3];

      const swap = (i1, i2, indexable) => {
        const i1Copy = indexable[i1[0]][i1[1]];
        indexable[parseInt(i1[0])][i1[1]] = indexable[i2[0]][i2[1]];
        indexable[parseInt(i2[0])][i2[1]] = i1Copy;
      };

      if (p[1].y < p[0].y) {
        swap("0x", "1x", p);
        swap("0y", "1y", p);
        swap("0x", "1x", t);
        swap("0y", "1y", t);
        swap("0w", "1w", t);
      }

      if (p[2].y < p[0].y) {
        swap("0x", "2x", p);
        swap("0y", "2y", p);
        swap("0x", "2x", t);
        swap("0y", "2y", t);
        swap("0w", "2w", t);
      }

      if (p[2].y < p[1].y) {
        swap("1x", "2x", p);
        swap("1y", "2y", p);
        swap("1x", "2x", t);
        swap("1y", "2y", t);
        swap("1w", "2w", t);
      }

      const dp = [
        {
          x: p[1].x - p[0].x,
          y: p[1].y - p[0].y,
        },
        {
          x: p[2].x - p[0].x,
          y: p[2].y - p[0].y,
        },
      ];

      const dt = [
        {
          x: t[1].x - t[0].x,
          y: t[1].y - t[0].y,
          w: t[1].w - t[0].w,
        },
        {
          x: t[2].x - t[0].x,
          y: t[2].y - t[0].y,
          w: t[2].w - t[0].w,
        },
      ];

      let tex = { x: 0, y: 0, w: 0 };

      const steps = {
        ax: dp[0].y ? dp[0].x / Math.abs(dp[0].y) : 0,
        bx: dp[1].y ? dp[1].x / Math.abs(dp[1].y) : 0,

        x1: dp[0].y ? dt[0].x / Math.abs(dp[0].y) : 0,
        y1: dp[0].y ? dt[0].y / Math.abs(dp[0].y) : 0,
        w1: dp[0].y ? dt[0].w / Math.abs(dp[0].y) : 0,

        x2: dp[1].y ? dt[1].x / Math.abs(dp[1].y) : 0,
        y2: dp[1].y ? dt[1].y / Math.abs(dp[1].y) : 0,
        w2: dp[1].y ? dt[1].w / Math.abs(dp[1].y) : 0,
      };

      if (dp[0].y) {
        for (let i = p[0].y; i <= p[1].y; i++) {
          const swap2 = (i1, i2, indexable) => {
            const i1Copy = indexable[i1];
            indexable[i1] = indexable[i2];
            indexable[i2] = i1Copy;
          };

          const o = {
            ax: p[0].x + (i - p[0].y) * steps.ax,
            bx: p[0].x + (i - p[0].y) * steps.bx,

            sx: (t[0].x = (i - p[0].y) * steps.x1),
            sy: (t[0].y = (i - p[0].y) * steps.y1),
            sw: (t[0].w = (i - p[0].y) * steps.w1),

            ex: (t[0].x = (i - p[0].y) * steps.x2),
            ey: (t[0].y = (i - p[0].y) * steps.y2),
            ew: (t[0].w = (i - p[0].y) * steps.w2),
          };
          debugger;

          if (o.ax > o.bx) {
            swap2("ax", "bx", o);
            swap2("sx", "ex", o);
            swap2("sy", "ey", o);
            swap2("sw", "ew", o);
          }

          tex.x = o.sx;
          tex.y = o.sy;
          tex.w = o.sw;

          let tStep = 1 / (o.bx - o.ax);
          let _t = 0;

          for (let j = o.ax; j < o.bx; j++) {
            tex.x = (1 - _t) * o.sx + _t * o.ex;
            tex.y = (1 - _t) * o.sy + _t * o.ey;
            tex.w = (1 - _t) * o.sw + _t * o.ew;

            const color = this.getPixelColor(
              this.textureData,
              Math.floor(tex.x / tex.w),
              Math.floor(tex.y / tex.w)
            );

            this.canvasData.ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${color.a})`;
            this.canvasData.ctx.fillRect(j, i, 1, 1);

            _t += tStep;
          }
        }
      }

      dp[0].x = p[2].x - p[1].x;
      dp[0].y = p[2].y - p[1].y;

      dt[0].x = t[2].x - t[1].x;
      dt[0].y = t[2].y - t[1].y;
      dt[0].w = t[2].w - t[1].w;

      if (dp[0].y) {
        steps.ax = dp[0].x / Math.abs(dp[0].y);
      }
      if (dp[1].y) {
        steps.bx = dp[1].x / Math.abs(dp[1].y);
      }

      steps.x1 = 0;
      steps.y1 = 0;
      if (dp[0].y) {
        steps.x1 = dt[0].x / Math.abs(dp[0].y);
      }
      if (dp[0].y) {
        steps.y1 = dt[0].y / Math.abs(dp[0].y);
      }
      if (dp[0].y) {
        steps.w1 = dt[0].w / Math.abs(dp[0].y);
      }

      if (dp[0].y) {
        for (let i = p[1].y; i <= p[2].y; i++) {
          const swap2 = (i1, i2, indexable) => {
            const i1Copy = indexable[i1];
            indexable[i1] = indexable[i2];
            indexable[i2] = i1Copy;
          };

          const o = {
            ax: p[1].x + (i - p[1].y) * steps.ax,
            bx: p[0].x + (i - p[0].y) * steps.bx,

            sx: (t[1].x = (i - p[1].y) * steps.x1),
            sy: (t[1].y = (i - p[1].y) * steps.y1),
            sw: (t[1].w = (i - p[1].y) * steps.w1),

            ex: (t[0].x = (i - p[0].y) * steps.x2),
            ey: (t[0].y = (i - p[0].y) * steps.y2),
            ew: (t[0].w = (i - p[0].y) * steps.w2),
          };

          if (o.ax > o.bx) {
            swap2("ax", "bx", o);
            swap2("sx", "ex", o);
            swap2("sy", "ey", o);
            swap2("sw", "ew", o);
          }

          tex.x = o.sx;
          tex.y = o.sy;
          tex.w = o.sw;

          const tStep = 1 / (o.bx - o.ax);
          let _t = 0;
          for (let j = o.ax; j < o.bx; j++) {
            tex.x = (1 - _t) * o.sx + _t * o.ex;
            tex.y = (1 - _t) * o.sy + _t * o.ey;
            tex.w = (1 - _t) * o.sw + _t * o.ew;

            const color = this.getPixelColor(
              this.textureData,
              Math.floor(tex.x / tex.w),
              Math.floor(tex.y / tex.w)
            );

            this.canvasData.ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${color.a})`;
            this.canvasData.ctx.fillRect(j, i, 1, 1);

            _t += tStep;
          }
        }
      }
    } else {
      debugger;
      throw new Error(
        "Missing Props From Triangle In texturedTriangle Function"
      );
    }
  };

  getPixelColor = (imageData, x, y) => {
    const color = { r: 1, g: 1, b: 1, a: 1 };

    var index = (y * imageData.width + x) * 4;
    color.r = imageData.data[index];
    color.g = imageData.data[index + 1];
    color.b = imageData.data[index + 2];
    color.a = imageData.data[index + 3];

    return color;
  };

  handleKeyPress = (e) => {
    const cam = this.renderData.vCamera;
    if (e.key === "w") {
      cam.y += 0.1;
    }
    if (e.key === "a") {
      cam.x += 0.1;
    }
    if (e.key === "s") {
      cam.y -= 0.1;
    }
    if (e.key === "d") {
      cam.x -= 0.1;
    }

    const rd = this.renderData;
    const vm = new VectorMaths();

    if (e.key === "ArrowUp") {
      rd.vCamera = vm.Add(rd.vCamera, vm.Multiply(rd.vLookDir, 0.1));
    }
    if (e.key === "ArrowDown") {
      rd.vCamera = vm.Subtract(rd.vCamera, vm.Multiply(rd.vLookDir, 0.1));
    }
    if (e.key === "ArrowLeft") {
      rd.fYaw -= 0.1;
    }
    if (e.key === "ArrowRight") {
      rd.fYaw += 0.1;
    }
  };

  render() {
    return (
      <div onKeyDown={this.handleKeyPress} tabIndex="0">
        <canvas ref={this.canvasRef}></canvas>
      </div>
    );
  }
}

export default Render3D;
