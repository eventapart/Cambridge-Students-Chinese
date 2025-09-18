import json
import math
import os

input_file = "idioms.json"
output_dir = "dictionaries"
os.makedirs(output_dir, exist_ok=True)

with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

total = len(data)
parts = 10  # 拆分成10个文件，可按需调整
per_part = math.ceil(total / parts)

for i in range(parts):
    part_data = data[i*per_part : (i+1)*per_part]
    out_file = os.path.join(output_dir, f"idioms_part{i+1}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(part_data, f, ensure_ascii=False, indent=2)
    print(f"生成 {out_file} ({len(part_data)} 条)")
