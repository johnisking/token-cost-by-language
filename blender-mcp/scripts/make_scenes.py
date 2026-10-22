# Run: blender.exe -b --factory-startup --python make_scenes.py -- <outdir>
# Builds three deterministic test scenes with no third-party assets.
import bpy, sys, os, math, random

out = sys.argv[sys.argv.index("--") + 1]
random.seed(42)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    ids = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    s.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in ids else "BLENDER_EEVEE"
    s.render.resolution_x, s.render.resolution_y = 1280, 720
    return s

def mat(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1)
    m.diffuse_color = (*rgb, 1)
    return m

def box(name, loc, size, m=None):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object
    o.name = name; o.data.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if m: o.data.materials.append(m)
    return o

def join(name, parts):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.active_object; o.name = name; o.data.name = name
    return o

def camera_light(cam_loc, target=(0, 0, 0.5)):
    bpy.ops.object.camera_add(location=cam_loc)
    cam = bpy.context.active_object; cam.name = "Camera"
    d = [target[i] - cam_loc[i] for i in range(3)]
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    bpy.context.scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(4, -4, 8)); bpy.context.active_object.name = "Sun"

# ---- S: a small room, 12 objects ----
s = reset()
wood, grey, wall = mat("Wood", (0.45, 0.28, 0.15)), mat("ChairGrey", (0.5, 0.5, 0.5)), mat("Wall", (0.85, 0.83, 0.78))
box("Floor", (0, 0, -0.05), (8, 8, 0.1), mat("FloorTiles", (0.3, 0.3, 0.32)))
box("Wall Back", (0, 4, 1.5), (8, 0.1, 3), wall)
top = box("Table", (0, 0, 0.75), (1.6, 0.9, 0.06), wood)
legs = [box("leg", (x, y, 0.36), (0.07, 0.07, 0.72), wood) for x in (-0.72, 0.72) for y in (-0.38, 0.38)]
join("Table", [top] + legs)
for i, (x, y, rz) in enumerate([(0, -0.85, 0), (0, 0.85, math.pi), (-1.15, 0, -math.pi / 2), (1.15, 0, math.pi / 2)], 1):
    seat = box("seat", (0, 0, 0.45), (0.45, 0.45, 0.05), grey)
    back = box("back", (0, -0.2, 0.75), (0.45, 0.05, 0.55), grey)
    cl = [box("l", (a, b, 0.21), (0.05, 0.05, 0.42), grey) for a in (-0.19, 0.19) for b in (-0.19, 0.19)]
    c = join(f"Chair {i}", [seat, back] + cl)
    c.location = (x, y, 0); c.rotation_euler = (0, 0, rz)
box("Sofa", (-2.6, 2.8, 0.4), (2.2, 0.9, 0.8), mat("Fabric", (0.2, 0.3, 0.5)))
box("Shelf", (2.8, 3.6, 1.0), (1.4, 0.4, 2.0), wood)
box("Rug", (0, 0, 0.005), (3.2, 2.4, 0.01), mat("Rug", (0.6, 0.2, 0.2)))
bpy.ops.object.light_add(type="POINT", location=(0, 0, 2.6)); bpy.context.active_object.name = "Ceiling Lamp"
camera_light((5.5, -5.5, 3.2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "scene_S.blend"))
print("S objects", len(bpy.data.objects))

# ---- L: a city block, about 600 objects, plus one dense mesh ----
s = reset()
box("Ground", (0, 0, -0.05), (200, 200, 0.1), mat("Asphalt", (0.12, 0.12, 0.13)))
bmat = [mat(f"Facade {k}", c) for k, c in enumerate([(0.7, 0.7, 0.72), (0.55, 0.45, 0.4), (0.4, 0.5, 0.6), (0.8, 0.75, 0.6)])]
base = box("Building", (0, 0, 0.5), (1, 1, 1))
meshes = []
for k, m in enumerate(bmat):
    me = base.data.copy(); me.name = f"BuildingMesh {k}"; me.materials.clear(); me.materials.append(m); meshes.append(me)
bpy.data.objects.remove(base)
for gx in range(24):
    for gy in range(24):
        o = bpy.data.objects.new(f"Building {gx:02d}-{gy:02d}", random.choice(meshes))
        w, d, h = random.uniform(4, 7), random.uniform(4, 7), random.uniform(6, 60)
        o.location = (gx * 8 - 92, gy * 8 - 92, 0); o.scale = (w, d, h)
        bpy.context.collection.objects.link(o)
bpy.ops.mesh.primitive_uv_sphere_add(segments=160, ring_count=120, radius=3, location=(0, 0, 70))
big = bpy.context.active_object; big.name = "BigMesh"; big.data.name = "BigMesh"
camera_light((120, -120, 90), target=(0, 0, 10))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "scene_L.blend"))
print("L objects", len(bpy.data.objects), "BigMesh verts", len(big.data.vertices))

# ---- E: empty scene (camera and light only) for build tasks ----
s = reset()
camera_light((7, -7, 5))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "scene_E.blend"))
print("E objects", len(bpy.data.objects))
