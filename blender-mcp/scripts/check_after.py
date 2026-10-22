# Run: blender.exe -b <after.blend> --python check_after.py -- <out.json>
# Writes facts about the saved scene; the pass/fail rules are applied later.
import bpy, sys, json

out = sys.argv[sys.argv.index("--") + 1]
sc = bpy.context.scene

def colors(o):
    cs = []
    for slot in getattr(o, "material_slots", []):
        m = slot.material
        if not m: continue
        c = list(m.diffuse_color[:3])
        if m.use_nodes and m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    c = list(n.inputs["Base Color"].default_value[:3])
        cs.append([round(v, 3) for v in c])
    return cs

objs = {o.name: {"type": o.type, "colors": colors(o), "anim": bool(o.animation_data and o.animation_data.action),
                 "constraints": [c.type for c in o.constraints], "parent": o.parent.name if o.parent else None,
                 "faces": len(o.data.polygons) if o.type == "MESH" else 0} for o in sc.objects}
facts = {
    "n_objects": len(sc.objects),
    "objects": objs if len(sc.objects) <= 80 else {k: v for k, v in objs.items() if v["anim"] or v["type"] == "CAMERA" or k.lower().startswith(("chair", "table", "car", "track", "circuit"))},
    "camera": sc.camera.name if sc.camera else None,
    "camera_anim": bool(sc.camera and (sc.camera.animation_data or sc.camera.constraints or sc.camera.parent)),
    "frame_start": sc.frame_start, "frame_end": sc.frame_end, "fps": sc.render.fps,
    "engine": sc.render.engine, "res": [sc.render.resolution_x, sc.render.resolution_y],
    "animated_objects": [o.name for o in sc.objects if o.animation_data and (o.animation_data.action or o.animation_data.drivers)] +
                        [o.name for o in sc.objects if any(c.type == "FOLLOW_PATH" for c in o.constraints)],
}
json.dump(facts, open(out, "w"), indent=1)
