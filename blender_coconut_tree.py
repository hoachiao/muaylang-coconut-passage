"""
椰子樹 Blender 自動建模腳本 v2
修正：
  - 樹幹改用 bmesh 直接建管狀體，不再依賴 bevel curve（避免長度失控）
  - 棕櫚葉頂點直接以世界座標計算，不依賴 location/rotation transform
  - 椰子用 transform_apply 後再 join，確保幾何體在世界座標

使用方式：Blender > Scripting 頁籤 > 貼上 > Run Script
"""

import bpy
import bmesh
import math
import random

random.seed(42)

# ── 清空場景 ──────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for blk in list(bpy.data.meshes):    bpy.data.meshes.remove(blk)
for blk in list(bpy.data.curves):    bpy.data.curves.remove(blk)
for blk in list(bpy.data.materials): bpy.data.materials.remove(blk)


# ── 材質 ─────────────────────────────────────────────────
def make_mat(name, rgb, roughness=0.88):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat

bark_mat    = make_mat("Bark",    (0.32, 0.19, 0.08), 0.96)
leaf_mat    = make_mat("Leaf",    (0.13, 0.43, 0.10), 0.88)
coconut_mat = make_mat("Coconut", (0.15, 0.09, 0.04), 0.86)


# ── 常數 ─────────────────────────────────────────────────
# 樹幹路徑：(x, y=0, z高度, 半徑)，Blender Z-up
TRUNK_PATH = [
    (0.00, 0.0, 0.00, 0.42),
    (0.35, 0.0, 2.00, 0.39),
    (0.80, 0.0, 4.00, 0.36),
    (1.25, 0.0, 6.00, 0.31),
    (1.80, 0.0, 8.00, 0.26),   # ← 樹冠頂
]
CROWN = (TRUNK_PATH[-1][0], TRUNK_PATH[-1][1], TRUNK_PATH[-1][2])
RADIAL_SEGS = 16


# ── 樹幹：直接用 bmesh 建管狀體 ───────────────────────────
def build_trunk():
    bm = bmesh.new()
    rings = []

    for cx, cy, cz, r in TRUNK_PATH:
        ring = []
        for j in range(RADIAL_SEGS):
            a = (j / RADIAL_SEGS) * math.pi * 2
            ring.append(bm.verts.new((cx + r * math.cos(a),
                                      cy + r * math.sin(a),
                                      cz)))
        rings.append(ring)

    # 側面 faces
    for i in range(len(rings) - 1):
        for j in range(RADIAL_SEGS):
            jn = (j + 1) % RADIAL_SEGS
            bm.faces.new([rings[i][j], rings[i][jn],
                          rings[i+1][jn], rings[i+1][j]])

    # 底蓋
    bc = bm.verts.new((0.0, 0.0, -0.05))
    for j in range(RADIAL_SEGS):
        bm.faces.new([bc, rings[0][(j+1) % RADIAL_SEGS], rings[0][j]])

    # 頂蓋
    cx, cy, cz, _ = TRUNK_PATH[-1]
    tc = bm.verts.new((cx, cy, cz))
    for j in range(RADIAL_SEGS):
        bm.faces.new([tc, rings[-1][j], rings[-1][(j+1) % RADIAL_SEGS]])

    bm.normal_update()
    mesh = bpy.data.meshes.new("TrunkMesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(bark_mat)

    obj = bpy.data.objects.new("TrunkMesh", mesh)
    bpy.context.collection.objects.link(obj)
    return obj

trunk_obj = build_trunk()


# ── 棕櫚葉：頂點直接以世界座標計算 ──────────────────────
def build_frond_worldspace(idx, total):
    """
    直接算出世界座標，完全不需要 transform_apply。
    frond 從 CROWN 往外延伸，同時下垂。
    """
    bm = bmesh.new()

    length    = 3.4 + random.uniform(-0.3, 0.5)
    half_w    = 0.50 + random.uniform(-0.08, 0.10)
    segments  = 10
    max_droop = math.radians(random.uniform(28, 48))   # 葉尖最大下垂角

    # 這片葉子的方向（繞 Z 軸）
    base_angle = (idx / total) * math.pi * 2 + random.uniform(-0.18, 0.18)
    # 徑向方向（水平）
    out_x = math.cos(base_angle)
    out_y = math.sin(base_angle)
    # 葉寬方向（垂直於 out 和 Z）
    right_x = -math.sin(base_angle)
    right_y =  math.cos(base_angle)

    cx, cy, cz = CROWN
    prev_l = prev_c = prev_r = None

    for s in range(segments + 1):
        t = s / segments
        droop = max_droop * t          # 越靠末端越往下

        horiz = t * length * math.cos(droop)   # 水平延伸
        vert  = t * length * math.sin(droop)   # 垂直下垂

        # 脊椎點
        px = cx + out_x * horiz
        py = cy + out_y * horiz
        pz = cz - vert              # 往下

        # 葉寬
        w = half_w * math.sin(math.pi * t) * max(0.0, 1.0 - t * 0.35)
        if t < 0.08:
            w *= t / 0.08

        c = bm.verts.new((px, py, pz))
        l = bm.verts.new((px + right_x * w, py + right_y * w, pz))
        r = bm.verts.new((px - right_x * w, py - right_y * w, pz))

        if prev_c is not None:
            bm.faces.new([prev_l, l, c, prev_c])
            bm.faces.new([prev_c, c, r, prev_r])

        prev_l, prev_c, prev_r = l, c, r

    bm.normal_update()
    mesh = bpy.data.meshes.new(f"FrondMesh_{idx}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(leaf_mat)

    obj = bpy.data.objects.new(f"Frond_{idx}", mesh)
    bpy.context.collection.objects.link(obj)
    # ★ 幾何體已在世界座標，物件 transform 保持 identity
    return obj


FROND_COUNT = 14
frond_objs = [build_frond_worldspace(i, FROND_COUNT) for i in range(FROND_COUNT)]

# Join 葉子
bpy.ops.object.select_all(action='DESELECT')
for fo in frond_objs:
    fo.select_set(True)
bpy.context.view_layer.objects.active = frond_objs[0]
bpy.ops.object.join()
leaves_obj = bpy.context.active_object
leaves_obj.name = "LeavesMesh"


# ── 椰子 ─────────────────────────────────────────────────
COCO_COUNT = 7
coco_objs = []
cx, cy, cz = CROWN

for i in range(COCO_COUNT):
    angle = (i / COCO_COUNT) * math.pi * 2 + 0.4
    r = 0.50 + random.uniform(-0.08, 0.12)
    x = cx + math.cos(angle) * r
    y = cy + math.sin(angle) * r
    z = cz - 0.50 + random.uniform(-0.15, 0.15)

    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.21, segments=12, ring_count=8, location=(x, y, z)
    )
    coco = bpy.context.active_object
    coco.name = f"Coconut_{i}"
    coco.data.materials.append(coconut_mat)

    # ★ Apply location → 頂點進入世界座標
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = coco
    coco.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    coco_objs.append(coco)

# Join 椰子
bpy.ops.object.select_all(action='DESELECT')
for co in coco_objs:
    co.select_set(True)
bpy.context.view_layer.objects.active = coco_objs[0]
bpy.ops.object.join()
coconuts_obj = bpy.context.active_object
coconuts_obj.name = "CoconutsMesh"


# ── 匯出 GLB ─────────────────────────────────────────────
EXPORT_PATH = "/Users/ho47/Desktop/muaylang-coconut-passage/public/coconut_tree.glb"

bpy.ops.object.select_all(action='DESELECT')
for name in ("TrunkMesh", "LeavesMesh", "CoconutsMesh"):
    obj = bpy.data.objects.get(name)
    if obj:
        obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=EXPORT_PATH,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_materials='EXPORT',
    export_yup=True,
    export_normals=True,
    export_draco_mesh_compression_enable=False,
)

print(f"✅ 匯出完成：{EXPORT_PATH}")
