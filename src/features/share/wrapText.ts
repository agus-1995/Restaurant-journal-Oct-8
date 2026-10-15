/**
 * Greedy word-wrap using a caller-supplied width function (canvas `measureText` in the app,
 * a fake in tests). Overflowing text is cut with an ellipsis on the last allowed line.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  let index = 0

  for (; index < words.length; index += 1) {
    const word = words[index] ?? ''
    const candidate = current === '' ? word : `${current} ${word}`
    if (measure(candidate) <= maxWidth || current === '') {
      current = candidate
    } else {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && current !== '') lines.push(current)

  const truncated = index < words.length || lines.length > maxLines
  const result = lines.slice(0, maxLines)
  if (truncated && result.length > 0) {
    result[result.length - 1] = `${result[result.length - 1] ?? ''}…`
  }
  // Any line still too wide (one very long word, or the appended ellipsis) is shortened to fit.
  return result.map((line) => {
    let fitted = line
    while (fitted.length > 1 && measure(fitted) > maxWidth) {
      fitted = `${fitted.replace(/…$/, '').slice(0, -1).trimEnd()}…`
    }
    return fitted
  })
}
