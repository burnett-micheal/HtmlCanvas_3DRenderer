const objFile2String = async (model) => {
    let objString = new Promise((resolve) => {
      fetch(model)
        .then((response) => {
          return response.blob();
        })
        .then((blob) => {
          var reader = new FileReader();
          reader.readAsText(blob);
          reader.onload = function () {
            resolve(reader.result);
          };
          reader.onerror = function (error) {
            console.log("Error: ", error);
          };
        })
        .catch((err) => console.log(err));
    });
    return objString;
  };

const modelString2Object = (modelString) => {
    /*
    Source: https://en.wikipedia.org/wiki/Wavefront_.obj_file

    # = Comment
    v = Vertice Coordinate
    vt = Vertex Texture Coordinate
    vn = Vertex Normal Indices
    usemtl = use material
    mtllib = Material Library
    o = object name
    g = group name
    s = smooth shading
    f = polygon face element
    */

    const modelEnum = Object.freeze({
      o: "objectName",
      g: "groupName",
      usemtl: "useMaterial",
      mtllib: "materialLibrary",
      s: "smoothShading",
      "#": "comments",
      v: "verticePositions",
      vt: "texturePositions",
      vn: "normalIndices",
      f: "faceElements",
    });

    const model = {
      objectName: "",
      groupName: "",
      useMaterial: "",
      materialLibrary: "",
      smoothShading: "",
      comments: [],
      mesh: [],
    };

    const verticesData = {
      verticePositions: [],
      texturePositions: [],
      normalIndices: [],
      faceElements: [],
    };

    const lines = modelString.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].split(/ (.+)/);
      const id = line[0];
      const content = line[1];
      if (id) {
        if (["#", "v", "vt", "vn", "f"].includes(id)) {
          if (["vt", "vn", "v", "f"].includes(id)) {
            if ("f" === id) {
              verticesData[modelEnum[id]].push(content);
            } else {
              const posArr = content.split(" ");
              const pos = {
                x: parseFloat(posArr[0]),
                y: parseFloat(posArr[1]),
              };
              if (id !== "vt") {
                pos.z = parseFloat(posArr[2]);
              }
              verticesData[modelEnum[id]].push(pos);
            }
          } else {
            model[modelEnum[id]].push(content);
          }
        } else {
          model[modelEnum[id]] = content;
        }
      }
    }

    for (
      let facesIndex = 0;
      facesIndex < verticesData.faceElements.length;
      facesIndex++
    ) {
      const faceData = [];
      const vertices = verticesData.faceElements[facesIndex].split(" ");
      for (let vertIndex = 0; vertIndex < vertices.length; vertIndex++) {
        const vert = vertices[vertIndex].split("/");
        const vertPosIndex = vert[0] - 1;
        const textPosIndex = vert[1] - 1;
        const normIndex = vert[2] - 1;
        const verticeData = {
          verticePos: {...verticesData.verticePositions[vertPosIndex], w: 1},
          texturePos: {...verticesData.texturePositions[textPosIndex], w: 1},
          normalIndice: verticesData.normalIndices[normIndex],
        };
        faceData.push(verticeData);
      }
      model.mesh.push(faceData);
    }

    return model;
  };

const objFile2Object = async (objFile) => {
    const modelString = await objFile2String(objFile);
    const model = modelString2Object(modelString);
    return model;
}

export default objFile2Object;