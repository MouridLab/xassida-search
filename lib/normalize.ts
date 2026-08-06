const arabicMarks = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
export function normalizeArabic(value: string) { return value.replace(arabicMarks, "").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ـ/g,"").replace(/\s+/g," ").trim(); }
export function normalizeLatin(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’'ʿ`-]/g,"").replace(/ou/g,"u").replace(/aa/g,"a").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim(); }
export function normalizeSearch(value:string) { return /[\u0600-\u06ff]/.test(value) ? normalizeArabic(value) : normalizeLatin(value); }
