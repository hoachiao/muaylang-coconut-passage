"""
泰國傳統木船 Blender 建模腳本（เรือหัวโทง 風格）
使用方式：Blender > Scripting > 貼上 > Run Script
匯出：/Users/ho47/Desktop/muaylang-coconut-passage/public/boat.glb

座標設計：
  Blender Y 軸 = 船長方向
  +Y = 船頭（bow），出口後對應 Three.js -Z（朝向海岸）
  -Y = 船尾（stern），對應 Three.js +Z（朝向鏡頭）
  X   = 船寬（左右）
  Z   = 高度（上下）
"""

import bpy
import bmesh
import math

# ── 清空場景 ──────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for b in list(bpy.data.meshes):    bpy.data.meshes.remove(b)
for b in list(bpy.data.materials): bpy.data.materials.remove(b)
for b in list(bpy.data.curves):    bpy.data.curves.remove(b)


# ── 材質 ─────────────────────────────────────────────────
def make_mat(name, rgb, roughness=0.90):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value  = roughness
    bsdf.inputs["Metallic"].default_value   = 0.0
    return mat

wood_mat  = make_mat("BoatWood",   (0.40, 0.24, 0.09), 0.93)
dark_mat  = make_mat("DarkWood",   (0.22, 0.12, 0.04), 0.95)
paint_mat = make_mat("BoatPaint",  (0.10, 0.22, 0.48), 0.72)  # 泰國傳統深藍


# ── 參數 ─────────────────────────────────────────────────
LENGTH    = 9.0    # 船長
MAX_W     = 1.75   # 最大船寬
HULL_D    = 0.75   # 船身深度
BOW_RISE  = 1.10   # 船頭上揚高度（泰式誇張上翹）
STERN_RISE= 0.45   # 船尾上揚
SEGS      = 32     # 縱向分段數


def bow_stern_rise(t):
    """t=0 船尾（stern），t=1 船頭（bow）"""
    bow   = BOW_RISE   * max(0.0, (t - 0.72) * 3.5) ** 1.6
    stern = STERN_RISE * max(0.0, (0.28 - t) * 3.5) ** 1.4
    return bow + stern

def half_width(t):
    """船寬剖面：兩端窄、中段寬"""
    return (MAX_W / 2) * math.sin(t * math.pi) ** 0.55

def hull_depth(t):
    """船身深度"""
    return HULL_D * math.sin(t * math.pi) ** 0.38


# ── 船殼 hull ────────────────────────────────────────────
bm_hull = bmesh.new()

# 每截面：keel（龍骨底）、port gunwale（左舷）、starboard gunwale（右舷）
rings = []
for i in range(SEGS + 1):
    t  = i / SEGS                           # 0=stern, 1=bow
    y  = (t - 0.5) * LENGTH                 # Blender Y 軸（出口後 → Three.js -Z）
    r  = bow_stern_rise(t)
    w  = half_width(t)
    d  = hull_depth(t)

    z_keel    = r - d      # 龍骨 Z 高度
    z_gunwale = r          # 舷緣 Z 高度

    vk = bm_hull.verts.new((0,    y, z_keel))
    vl = bm_hull.verts.new((-w,   y, z_gunwale))
    vr = bm_hull.verts.new(( w,   y, z_gunwale))
    rings.append((vk, vl, vr))

# 側板 faces
for i in range(SEGS):
    k0, l0, r0 = rings[i]
    k1, l1, r1 = rings[i + 1]
    bm_hull.faces.new([k0, l0, l1, k1])   # 左舷
    bm_hull.faces.new([k0, k1, r1, r0])   # 右舷

# 艙底板（簡化成幾條橫梁 + 底面）
floor_rings = []
for i in range(0, SEGS + 1, 4):
    t = i / SEGS
    if 0.12 < t < 0.88:
        y  = (t - 0.5) * LENGTH
        w  = half_width(t) * 0.82
        r  = bow_stern_rise(t)
        d  = hull_depth(t)
        z  = r - d * 0.15      # 艙底略高於龍骨
        vl = bm_hull.verts.new((-w, y, z))
        vr = bm_hull.verts.new(( w, y, z))
        floor_rings.append((vl, vr))

for i in range(len(floor_rings) - 1):
    fl, fr = floor_rings[i]
    nl, nr = floor_rings[i + 1]
    bm_hull.faces.new([fl, fr, nr, nl])

# 舷緣橫板（加強視覺厚度）
for i in range(0, SEGS + 1, 3):
    t = i / SEGS
    if 0.08 < t < 0.92:
        _, vl, vr = rings[i]
        y  = (t - 0.5) * LENGTH
        w  = half_width(t)
        r  = bow_stern_rise(t)
        vl2 = bm_hull.verts.new((-w, y, r + 0.06))
        vr2 = bm_hull.verts.new(( w, y, r + 0.06))
        bm_hull.faces.new([vl, vl2, vr2, vr])

bm_hull.normal_update()
hull_mesh = bpy.data.meshes.new("BoatHull")
bm_hull.to_mesh(hull_mesh)
bm_hull.free()
hull_mesh.materials.append(wood_mat)

hull_obj = bpy.data.objects.new("BoatMesh", hull_mesh)
bpy.context.collection.objects.link(hull_obj)


# ── 船頭裝飾木柱（泰式） ──────────────────────────────────
def add_bow_post():
    bm = bmesh.new()
    # 細長立柱從船頭頂部往上延伸
    bow_y  = LENGTH / 2 - 0.1
    bow_r  = bow_stern_rise(1.0)
    base_z = bow_r
    top_z  = bow_r + 1.6

    post_pts = [
        (0,      bow_y - 0.05, base_z),
        (0,      bow_y + 0.05, base_z + 0.4),
        (0.04,   bow_y + 0.15, base_z + 0.9),
        (0.08,   bow_y + 0.18, base_z + 1.3),
        (0.02,   bow_y + 0.12, top_z),
    ]
    prev = None
    for pt in post_pts:
        v = bm.verts.new(pt)
        if prev:
            # 圍繞 Y 軸建細管（簡化為四角柱）
            pass  # handled via solidify modifier approach below
        prev = v

    # 簡化：用一個細圓柱代替
    bm.free()

    # 用 primitive cylinder
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.055,
        depth=1.5,
        vertices=8,
        location=(0, bow_y, base_z + 0.75),
    )
    post = bpy.context.active_object
    post.name = "BowPost"
    # 稍微往後傾
    post.rotation_euler = (math.radians(12), 0, 0)
    post.data.materials.append(dark_mat)

    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = post
    post.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return post

bow_post = add_bow_post()


# ── 划槳 oar（放在船身一側） ─────────────────────────────
def add_oar():
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.03,
        depth=3.5,
        vertices=6,
        location=(MAX_W / 2 + 0.2, -0.5, bow_stern_rise(0.4) + 0.3),
    )
    oar = bpy.context.active_object
    oar.name = "Oar"
    oar.rotation_euler = (math.radians(-20), 0, math.radians(30))
    oar.data.materials.append(dark_mat)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = oar
    oar.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return oar

oar = add_oar()


# ── 合併所有部件 ──────────────────────────────────────────
bpy.ops.object.select_all(action='DESELECT')
for obj in [hull_obj, bow_post, oar]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = hull_obj
bpy.ops.object.join()
boat_final = bpy.context.active_object
boat_final.name = "BoatMesh"


# ── 匯出 GLB ─────────────────────────────────────────────
EXPORT_PATH = "/Users/ho47/Desktop/muaylang-coconut-passage/public/boat.glb"

bpy.ops.object.select_all(action='DESELECT')
boat_final.select_set(True)

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

print(f"✅ 小船匯出完成：{EXPORT_PATH}")
print("之後在 Scene.jsx 加入：<BoatModel position={[0, -1, 18]} />")
