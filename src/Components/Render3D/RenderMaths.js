class VectorMaths {
    Vector2D = (x, y) => {
        return ({x, y});
    }

    Vector3D = (x, y, z) => {
        return ({x, y, z, w: 1});
    }

    Add = (v1, v2) => {
        return (this.Vector3D(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z));
    }

    Subtract = (v1, v2) => {
        
        return (this.Vector3D(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z));
    }

    Multiply = (v1, mult) => {
        return (this.Vector3D(v1.x * mult, v1.y * mult, v1.z * mult));
    }

    Divide = (v1, div) => {
        return (this.Vector3D(v1.x / div, v1.y / div, v1.z / div));
    }

    DotProduct = (v1, v2) => {
        return (v1.x*v2.x + v1.y*v2.y + v1.z*v2.z);
    }

    Length = (v1) => {
        return Math.sqrt(this.DotProduct(v1,v1));
    }

    Normalize = (v1) => {
        const l = this.Length(v1);
        return (this.Vector3D(v1.x / l, v1.y/l, v1.z/l));
    }

    CrossProduct = (v1, v2) => {
        const v3 = this.Vector3D(0,0,0);
        v3.x = v1.y * v2.z - v1.z * v2.y;
        v3.y = v1.z * v2.x - v1.x * v2.z;
        v3.z = v1.x * v2.y - v1.y * v2.x;
        return v3;
    }

    Average = (arrOfVectors) => {
        let total = this.Vector3D(0,0,0);
        for(let i = 0; i < arrOfVectors.length; i++){
            total = this.Add(total, arrOfVectors[i]);
        }
        return this.Divide(total, arrOfVectors.length);
    }

    Distance = (v1, v2) => {
        return (Math.pow(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2) + Math.pow(v2.z - v1.z, 2), 0.5));
    }

    LineIntersectPlane = (planePos, planeNormal, lineStart, lineEnd, tObj) => {
        planeNormal = this.Normalize(planeNormal);
        const plane_d = -this.DotProduct(planeNormal, planePos);
        const startDp = this.DotProduct(lineStart, planeNormal);
        const endDp = this.DotProduct(lineEnd, planeNormal);
        const t = (-plane_d - startDp) / (endDp - startDp);
        tObj.t = t;
        const lineStartToEnd = this.Subtract(lineEnd, lineStart);
        const lineToIntersect = this.Multiply(lineStartToEnd, t);
        const result = this.Add(lineStart, lineToIntersect);
        return result;
    }

    Triangle_ClipAgainstPlane = (planePos, planeNormal, inTri, outTri1, outTri2) => {
        planeNormal = this.Normalize(planeNormal);

        // Return signed shortest distance from point to plane, plane normal must be normalised
        const dist = (p) => {
            const n = this.Normalize(p); // Why Do We Need This?
            return (planeNormal.x * p.x + planeNormal.y * p.y + planeNormal.z * p.z - this.DotProduct(planeNormal, planePos));
        };

        // Create two temporary storage arrays to classify points either side of plane
		// If distance sign is positive, point lies on "inside" of plane
        const insidePoints = [];
        const outsidePoints = [];
        const insideTex = [];
        const outsideTex = [];

        // Get signed distance of each point in triangle to plane
		const d0 = dist(inTri.pos1);
		const d1 = dist(inTri.pos2);
		const d2 = dist(inTri.pos3);

        if (d0 >= 0) { insidePoints.push(inTri.pos1); insideTex.push(inTri.tex1); }
		else { outsidePoints.push(inTri.pos1); outsideTex.push(inTri.tex1); }
        if (d1 >= 0) { insidePoints.push(inTri.pos2); insideTex.push(inTri.tex2); }
		else { outsidePoints.push(inTri.pos2); outsideTex.push(inTri.tex2); }
        if (d2 >= 0) { insidePoints.push(inTri.pos3); insideTex.push(inTri.tex3); }
		else { outsidePoints.push(inTri.pos3); outsideTex.push(inTri.tex3); }

        if(insidePoints.length === 0){
            //All points outside plane, clip whole triangle
            //It ceases to exist
            return 0;
        }

        if(insidePoints.length === 3){
            outTri1.pos1 = inTri.pos1;
            outTri1.pos2 = inTri.pos2;
            outTri1.pos3 = inTri.pos3;
            outTri1.tex1 = inTri.tex1;
            outTri1.tex2 = inTri.tex2;
            outTri1.tex3 = inTri.tex3;
            outTri1.faceColor = inTri.faceColor;
            return 1;
        }

        if(insidePoints.length === 1 && outsidePoints.length === 2){
            // Triangle should be clipped. As two points lie outside
			// the plane, the triangle simply becomes a smaller triangle

			// Copy appearance info to new triangle --- Color And Shading
            outTri1.faceColor = inTri.faceColor; // Clip faceColor 1

			// The inside point is valid, so keep that...
			outTri1.pos1 = insidePoints[0];
            outTri1.tex1 = insideTex[0];

			// but the two new points are at the locations where the 
			// original sides of the triangle (lines) intersect with the plane
            let t = {t: 1};
			outTri1.pos2 = this.LineIntersectPlane(planePos, planeNormal, insidePoints[0], outsidePoints[0], t);
            t = t.t;
            outTri1.tex2.x = t*(outsideTex[0].x - insideTex[0].x) + insideTex[0].x;
            outTri1.tex2.y = t*(outsideTex[0].y - insideTex[0].y) + insideTex[0].y;
            outTri1.tex2.w = t*(outsideTex[0].w - insideTex[0].w) + insideTex[0].w;

            t = {t: 1};
			outTri1.pos3 = this.LineIntersectPlane(planePos, planeNormal, insidePoints[0], outsidePoints[1], t);
            t = t.t;
            outTri1.tex3.x = t*(outsideTex[1].x - insideTex[0].x) + insideTex[0].x;
            outTri1.tex3.y = t*(outsideTex[1].y - insideTex[0].y) + insideTex[0].y;
            outTri1.tex3.w = t*(outsideTex[1].w - insideTex[0].w) + insideTex[0].w;

			return 1; // Return the newly formed single triangle
        }

        if(insidePoints.length === 2 && outsidePoints.length === 1){
            // Triangle should be clipped. As two points lie inside the plane,
			// the clipped triangle becomes a "quad". Fortunately, we can
			// represent a quad with two new triangles

			// Copy appearance info to new triangles --- Color And Shading
            outTri1.faceColor = inTri.faceColor; // Clip faceColor 1
            outTri2.faceColor = inTri.faceColor; // Clip faceColor 2

			// The first triangle consists of the two inside points and a new
			// point determined by the location where one side of the triangle
			// intersects with the plane
			outTri1.pos1 = insidePoints[0];
			outTri1.pos2 = insidePoints[1];
            outTri1.tex1 = insideTex[0];
            outTri1.tex2 = insideTex[1];

            let t = {t: 1};
			outTri1.pos3 = this.LineIntersectPlane(planePos, planeNormal, insidePoints[0], outsidePoints[0], t);
            t = t.t;
            outTri1.tex3.x = t*(outsideTex[0].x - insideTex[0].x) + insideTex[0].x;
            outTri1.tex3.y = t*(outsideTex[0].y - insideTex[0].y) + insideTex[0].y;
            outTri1.tex3.w = t*(outsideTex[0].w - insideTex[0].w) + insideTex[0].w;

			// The second triangle is composed of one of the inside points, a
			// new point determined by the intersection of the other side of the 
			// triangle and the plane, and the newly created point above
			outTri2.pos1 = insidePoints[1];
            outTri2.tex1 = insideTex[1];
			outTri2.pos2 = outTri1.pos3;
            outTri2.tex2 = outTri1.tex3;
            
            t = {t: 1};
			outTri2.pos3 = this.LineIntersectPlane(planePos, planeNormal, insidePoints[1], outsidePoints[0], t);
            t = t.t;
            outTri2.tex3.x = t*(outsideTex[0].x - insideTex[1].x) + insideTex[1].x;
            outTri2.tex3.y = t*(outsideTex[0].y - insideTex[1].y) + insideTex[1].y;
            outTri2.tex3.w = t*(outsideTex[0].w - insideTex[1].w) + insideTex[1].w;
            debugger;

			return 2; // Return two newly formed triangles which form a quad
        }
    }
};

class MatrixMaths {
    Identity = () => {
        return (
            [
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1]
            ]);
    }

    RotationX = (AngleRad) => {
        return (
            [
                [1, 0, 0, 0],
                [0, Math.cos(AngleRad), Math.sin(AngleRad), 0],
                [0, -Math.sin(AngleRad), Math.cos(AngleRad), 0],
                [0, 0, 0, 1]
            ]
        );
    }
    
    RotationY = (AngleRad) => {
        return (
            [
                [Math.cos(AngleRad), 0, Math.sin(AngleRad), 0],
                [0, 1, 0, 0],
                [-Math.sin(AngleRad), 0, Math.cos(AngleRad), 0],
                [0, 0, 0, 1]
            ]
        );
    }
    
    RotationZ = (AngleRad) => {
        return (
            [
                [Math.cos(AngleRad), Math.sin(AngleRad), 0, 0],
                [-Math.sin(AngleRad), Math.cos(AngleRad), 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1]
            ]
        );
    }

    Translate = (x, y, z) => {
        return (
            [
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [x, y, z, 1]
            ]
        );
    }

    Projection = (fovDegrees, aspectRatio, fNear, fFar, ) => {
        const fFovRad = 1 / Math.tan(((fovDegrees * 0.5) / 180) * 3.14159);
        return [
          [aspectRatio * fFovRad, 0, 0, 0],
          [0, fFovRad, 0, 0],
          [0, 0, fFar / (fFar - fNear), 1],
          [0, 0, (-fFar * fNear) / (fFar - fNear), 0],
        ];
    }

    Multiply = (matrixA, matrixB) => {
        const a = {
          columns: matrixA.length,
          rows: matrixA[0].length,
        };
        const b = {
          columns: matrixB.length,
          rows: matrixB[0].length,
        };
    
        const productMatrix = [];
        for (let aColumn = 0; aColumn < a.columns; aColumn++) {
          const columnResult = [];
          for (let bRow = 0; bRow < b.rows; bRow++) {
            let rowResult = 0;
            for (let aRow = 0; aRow < a.rows; aRow++) {
              const _a = matrixA[aColumn][aRow];
              const _b = matrixB[aRow][bRow];
              rowResult += _a * _b;
            }
            columnResult.push(rowResult);
          }
          productMatrix.push(columnResult);
        }
    
        return productMatrix;
      };

      //Only for Rotation/Translation Matrices
      QuickInverse = (matrix) => {
        const m = matrix;
        return (
        [
            [m[0][0], m[1][0], m[2][0], 0],
            [m[0][1], m[1][1], m[2][1], 0],
            [m[0][2], m[1][2], m[2][2], 0],    
            [
                -(m[3][0] * m[0][0] + m[3][1] * m[0][1] + m[3][2] * m[0][2]), 
                -(m[3][0] * m[1][0] + m[3][1] * m[1][1] + m[3][2] * m[1][2]), 
                -(m[3][0] * m[2][0] + m[3][1] * m[2][1] + m[3][2] * m[2][2]), 
                1
            ]
        ]);
      }
};

class MatrixVectorMaths {
    Multiply = (m, v) => {
        const result = {x: 0, y: 0, z: 0, w: 0};
        result.x = v.x * m[0][0] + v.y * m[1][0] + v.z * m[2][0] + v.w * m[3][0];
        result.y = v.x * m[0][1] + v.y * m[1][1] + v.z * m[2][1] + v.w * m[3][1];
        result.z = v.x * m[0][2] + v.y * m[1][2] + v.z * m[2][2] + v.w * m[3][2];
        result.w = v.x * m[0][3] + v.y * m[1][3] + v.z * m[2][3] + v.w * m[3][3];
        return result;
    }

    Matrix_PointAt = (pos, target, up) => {
        const vm = new VectorMaths();
        
        // New Forward Direction
        const newForward = vm.Normalize(vm.Subtract(target, pos));

        // New Up Direction
        const a = vm.Multiply(newForward, vm.DotProduct(up, newForward));
        const newUp = vm.Normalize(vm.Subtract(up, a));

        // New Right Direction
        const newRight = vm.CrossProduct(newUp, newForward);

        return([
            [newRight.x, newRight.y, newRight.z, 0],
            [newUp.x, newUp.y, newUp.z, 0],
            [newForward.x, newForward.y, newForward.z, 0],
            [pos.x, pos.y, pos.z, 1]
        ]);
    }
}


export {VectorMaths, MatrixMaths, MatrixVectorMaths};