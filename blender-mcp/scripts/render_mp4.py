# Run: blender.exe -b --factory-startup after.blend --python render_mp4.py -- <out_prefix>
import bpy, sys
out = sys.argv[sys.argv.index("--") + 1]
s = bpy.context.scene
r = s.render
r.resolution_percentage = 100
im = r.image_settings
try:
    im.media_type = "VIDEO"
except Exception:
    pass
im.file_format = "FFMPEG"
r.ffmpeg.format = "MPEG4"
r.ffmpeg.codec = "H264"
r.ffmpeg.constant_rate_factor = "HIGH"
r.filepath = out
bpy.ops.render.render(animation=True)
print("RENDERED", s.frame_start, s.frame_end, r.engine)
