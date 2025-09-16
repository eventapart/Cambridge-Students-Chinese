import json
import re
import sys
from pathlib import Path

# 判断是否以中文句号或引号结尾（不补句号）
def should_add_period(text):
    text = text.strip()
    if not text:
        return False
    # 已有句号、问号、感叹号、省略号、引号等标点结尾
    if re.search(r'[。！？…”"]$', text):
        return False
    return True

# 为文本添加句号（如果需要）
def add_period_if_needed(text):
    if should_add_period(text):
        return text + '。'
    return text

# 修复单个成语条目的文本字段
def fix_idiom_entry(entry):
    # 修复 definition
    if 'definition' in entry and isinstance(entry['definition'], str):
        entry['definition'] = add_period_if_needed(entry['definition'])

    # 修复 usage
    if 'usage' in entry and isinstance(entry['usage'], str):
        entry['usage'] = add_period_if_needed(entry['usage'])

    # 修复 source.text
    if 'source' in entry and isinstance(entry['source'], dict):
        if 'text' in entry['source'] and isinstance(entry['source']['text'], str):
            entry['source']['text'] = add_period_if_needed(entry['source']['text'])

    # 修复 example.text
    if 'example' in entry and isinstance(entry['example'], dict):
        if 'text' in entry['example'] and isinstance(entry['example']['text'], str):
            entry['example']['text'] = add_period_if_needed(entry['example']['text'])

    # 修复 story 数组中的每一项
    if 'story' in entry and isinstance(entry['story'], list):
        entry['story'] = [
            add_period_if_needed(item) if isinstance(item, str) else item
            for item in entry['story']
        ]

    return entry

# 主函数
def main(input_file, output_file=None):
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"错误：文件 {input_file} 不存在。")
        sys.exit(1)

    # 读取 JSON
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"读取 JSON 文件失败：{e}")
        sys.exit(1)

    if not isinstance(data, list):
        print("警告：JSON 数据应为数组格式。")
        sys.exit(1)

    # 遍历并修复每条成语
    fixed_data = [fix_idiom_entry(entry) for entry in data]

    # 决定输出文件
    if output_file is None:
        output_file = input_path.with_name(input_path.stem + '_fixed' + input_path.suffix)

    # 写回文件
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(fixed_data, f, ensure_ascii=False, indent=2, separators=(',', ': '))
        print(f"✅ 修复完成！已保存到：{output_file}")
    except Exception as e:
        print(f"写入文件失败：{e}")
        sys.exit(1)

# 命令行入口
if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description="修复 JSON 中 definition、source.text、example.text、usage、story 的句尾句号"
    )
    parser.add_argument('input', help="输入的 JSON 文件路径")
    parser.add_argument('-o', '--output', help="输出文件路径（可选）")

    args = parser.parse_args()

    main(args.input, args.output)