import React, { Component } from "react";
import Triangle from "../../Assets/Textured_Cube.obj";
import Texture from "../../Assets/T5.png";
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

  getPixelColor = (imageData, x, y) => {
    const color = { r: 1, g: 1, b: 1, a: 1 };
    x = Math.floor(x);
    y = Math.floor(y);

    var index = (y * imageData.width + x) * 4;
    color.r = imageData.data[index];
    color.g = imageData.data[index + 1];
    color.b = imageData.data[index + 2];
    color.a = imageData.data[index + 3];

    return color;
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

    const projMatrix = mm.Projection(75, cd.height / cd.width, 1, 1000);
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

          // tex1.x = tex1.x / pos1.w;
          // tex2.x = tex2.x / pos2.w;
          // tex3.x = tex3.x / pos3.w;

          // tex1.y = tex1.y / pos1.w;
          // tex2.y = tex2.y / pos2.w;
          // tex3.y = tex3.y / pos3.w;

          // tex1.w = 1 / pos1.w;
          // tex2.w = 1 / pos2.w;
          // tex3.w = 1 / pos3.w;

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
          if (trisToAdd > 1) {
            debugger;
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
        this.tTri(
          tri.pos1,
          tri.pos2,
          tri.pos3,
          tri.tex1,
          tri.tex2,
          tri.tex3,
          1024,
          1024
        );
        // this.texturedTriangle(tri);
      }
    }

    // fTheta += 0.1;
    setTimeout(() => {
      this.rotateModelAnim(model, fTheta);
    }, 25);
  };

  tTri = (pos1, pos2, pos3, nTex1, nTex2, nTex3, tWidth, tHeight) => {
    const p = [pos1, pos2, pos3];

    const t = [nTex1, nTex2, nTex3];
    t.forEach((pos) => {
      pos.x *= tWidth;
      pos.y *= tHeight;
    });

    const barycentric = (P, A, B, C) => {
      const sub = (v1, v2) => {
        return { x: v1.x - v2.x, y: v1.y - v2.y };
      };
      const dotProduct = (v1, v2) => {
        return v1.x * v2.x + v1.y * v2.y;
      };

      const v0 = sub(B, A);
      const v1 = sub(C, A);
      const v2 = sub(P, A);
      const d00 = dotProduct(v0, v0);
      const d01 = dotProduct(v0, v1);
      const d11 = dotProduct(v1, v1);
      const d20 = dotProduct(v2, v0);
      const d21 = dotProduct(v2, v1);
      const denom = d00 * d11 - d01 * d01;
      const v = (d11 * d20 - d01 * d21) / denom;
      const w = (d00 * d21 - d01 * d20) / denom;
      const u = 1 - v - w;

      return { x: u, y: v, w };
    };

    const cartesian = (bar, A, B, C) => {
      const mult = (v1, m) => {
        return { x: v1.x * m, y: v1.y * m };
      };
      const add = (v1, v2) => {
        return { x: v1.x + v2.x, y: v1.y + v2.y };
      };
      return add(add(mult(A, bar.x), mult(B, bar.y)), mult(C, bar.w));
    };

    const isInTri = (pos, tri1, tri2, tri3) => {
      const x = pos.x - tri1.x;
      const y = pos.y - tri1.y;
      const b = (tri2.x - tri1.x) * y - (tri2.y - tri1.y) * x > 0;

      if ((tri3.x - tri1.x) * y - (tri3.y - tri1.y) * x > 0 === b) {
        return false;
      }
      if (
        (tri3.x - tri2.x) * (pos.y - tri2.y) -
          (tri3.y - tri2.y) * (pos.x - tri2.x) >
          0 !==
        b
      ) {
        return false;
      }
      return true;
    };

    const sPos = { x: Infinity, y: Infinity };
    const ePos = { x: -Infinity, y: -Infinity };
    p.forEach((pos) => {
      if (pos.x < sPos.x) {
        sPos.x = pos.x;
      }
      if (pos.y < sPos.y) {
        sPos.y = pos.y;
      }
      if (pos.x > ePos.x) {
        ePos.x = pos.x;
      }
      if (pos.y > ePos.y) {
        ePos.y = pos.y;
      }
    });

    for (let x = sPos.x; x < ePos.x; x++) {
      for (let y = sPos.y; y < ePos.y; y++) {
        if (isInTri({ x, y }, p[0], p[1], p[2])) {
          const bar = barycentric({ x, y }, p[0], p[1], p[2]);
          const car = cartesian(bar, t[0], t[1], t[2]);
          const color = this.getPixelColor(this.textureData, car.x, car.y);
          this.canvasData.ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${color.a})`;
          this.canvasData.ctx.fillRect(x, y, 1, 1);
        }
      }
    }
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
