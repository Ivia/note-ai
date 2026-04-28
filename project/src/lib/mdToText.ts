/**
 * 将 Markdown 转为小红书可直接粘贴的纯文本：
 * - 去掉 ## 标题符号，文字保留
 * - 去掉 **加粗** 符号，文字保留
 * - 去掉 *斜体* 符号，文字保留
 * - 列表 - / * / 数字. 的 - 换成 ·（数字序号保留）
 * - 代码块降级为纯文本
 * - 保留空行结构
 */
export function mdToText(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      // 代码块标记直接去掉
      if (/^```/.test(line)) return ''
      // ## 标题：去掉 # 前缀
      line = line.replace(/^#{1,6}\s+/, '')
      // 无序列表 - / * 开头：换成 ·
      line = line.replace(/^(\s*)[-*]\s+/, '$1· ')
      // 行内 **加粗** 和 *斜体*
      line = line.replace(/\*\*(.+?)\*\*/g, '$1')
      line = line.replace(/\*(.+?)\*/g, '$1')
      // 行内代码
      line = line.replace(/`(.+?)`/g, '$1')
      return line
    })
    .join('\n')
    // 连续超过 2 个空行合并为 2 个
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
