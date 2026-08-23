import { storageGet, storageSet } from './localStore';

export function loadCatalog(key, fallback = []) {
  const list = storageGet(key, fallback);
  return Array.isArray(list) ? list : fallback;
}

export function addCatalogItem(key, item) {
  const next = [...loadCatalog(key), item].filter(
    (entry, idx, arr) => arr.findIndex((x) => String(x.value) === String(entry.value)) === idx
  );
  storageSet(key, next);
  return next;
}

export function optionize(list, valueKey, labelKey) {
  return (list || [])
    .map((item) => ({
      value: String(item[valueKey] ?? item.value ?? item),
      label: String(item[labelKey] ?? item.label ?? item.nome ?? item.nome_fantasia ?? item),
    }))
    .filter((o) => o.value && o.label);
}
