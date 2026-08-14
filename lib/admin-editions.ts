export type SortableAdminEdition = {
  title: string | null;
  language: string;
  khassidas: { title: string };
};

const frenchCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

export function sortAdminEditions<T extends SortableAdminEdition>(editions: T[]) {
  return [...editions].sort((left, right) => {
    const workOrder = frenchCollator.compare(left.khassidas.title, right.khassidas.title);
    if (workOrder !== 0) return workOrder;
    const editionOrder = frenchCollator.compare(left.title || "", right.title || "");
    if (editionOrder !== 0) return editionOrder;
    return frenchCollator.compare(left.language, right.language);
  });
}
