import { parseMeshBuffer, isMeshFile } from "./meshParser";

const encoder = new TextEncoder();

function toBuffer(text: string): ArrayBuffer {
  return encoder.encode(text).buffer;
}

test("isMeshFile accepts stl, obj, ply", () => {
  expect(isMeshFile("scan.stl")).toBe(true);
  expect(isMeshFile("scan.obj")).toBe(true);
  expect(isMeshFile("scan.ply")).toBe(true);
  expect(isMeshFile("photo.jpg")).toBe(false);
  expect(isMeshFile("data.csv")).toBe(false);
});

test("parses an OBJ file with triangle faces", () => {
  const obj = `
# Simple cube face
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0

f 1 2 3
f 1 3 4
`;
  const mesh = parseMeshBuffer(toBuffer(obj), "test.obj");
  expect(mesh.name).toBe("test.obj");
  expect(mesh.triangles.length).toBe(2);
  expect(mesh.vertexCount).toBe(6); // 2 triangles * 3 verts
  expect(mesh.bounds.width).toBeCloseTo(1, 2);
});

test("parses OBJ with quad faces (fan triangulation)", () => {
  const obj = `
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0

f 1 2 3 4
`;
  const mesh = parseMeshBuffer(toBuffer(obj), "quad.obj");
  expect(mesh.triangles.length).toBe(2); // quad split into 2 triangles
});

test("parses OBJ with v/vt/vn face format", () => {
  const obj = `
v 0 0 0
v 1 0 0
v 0 1 1
vn 0 0 1
vt 0 0

f 1/1/1 2/1/1 3/1/1
`;
  const mesh = parseMeshBuffer(toBuffer(obj), "textured.obj");
  expect(mesh.triangles.length).toBe(1);
});

test("parses an ASCII PLY file", () => {
  const ply = `ply
format ascii 1.0
element vertex 4
property float x
property float y
property float z
element face 2
property list uchar int vertex_indices
end_header
0 0 0
10 0 0
10 5 0
0 5 0
3 0 1 2
3 0 2 3
`;
  const mesh = parseMeshBuffer(toBuffer(ply), "test.ply");
  expect(mesh.name).toBe("test.ply");
  expect(mesh.triangles.length).toBe(2);
  expect(mesh.bounds.width).toBeCloseTo(10, 2);
  expect(mesh.bounds.depth).toBeCloseTo(5, 2);
});

test("routes STL files to the STL parser", () => {
  const stl = `solid test
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid test`;
  const mesh = parseMeshBuffer(toBuffer(stl), "arch.stl");
  expect(mesh.triangles.length).toBe(1);
});

test("throws on unsupported format", () => {
  expect(() => parseMeshBuffer(toBuffer("data"), "file.xyz")).toThrow("Unsupported 3D file format");
});

test("throws on empty OBJ", () => {
  expect(() => parseMeshBuffer(toBuffer("# empty"), "empty.obj")).toThrow("No faces found");
});
