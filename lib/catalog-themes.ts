export function normalizeTheme(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/[\p{Z}\s]+/gu, " ")
    .trim()
    .toLocaleLowerCase("fr");
}

export function uniqueThemeOptions(values: string[]) {
  const unique = new Map<string, string>();
  values.forEach((value) => {
    const normalized = normalizeTheme(value);
    if (normalized && !unique.has(normalized)) {
      unique.set(normalized, value.replace(/[\p{Cc}\p{Cf}]/gu, "").trim());
    }
  });
  return [...unique.entries()].sort((left, right) =>
    left[1].localeCompare(right[1], "fr", { sensitivity: "base" }),
  );
}
