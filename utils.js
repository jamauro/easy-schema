// returns a subset of the object, "obj", based on an array of keys passed in
export const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (obj[key]) result[key] = obj[key];
  }
  return result;
};

export const isObject = o => o && o.constructor === Object;
export const isEmpty = obj => [Object, Array].includes((obj || {}).constructor) && !Object.entries((obj || {})).length;

export const capitalize = str => str[0].toUpperCase() + (str.toLowerCase()).slice(1);

// Deep equal comparison for objects and arrays. Can also be used for strings, numbers, etc.
export const isEqual = (first, second) => {
  if (first === second) return true;
  if (typeof first !== typeof second) return false;

  if (typeof first === 'object') {
    if (Array.isArray(first)) {
      return (
        Array.isArray(second) &&
        first.length === second.length &&
        first.every((item, index) => isEqual(item, second[index]))
      );
    }

    const keys = Object.keys(first);
    if (keys.length !== Object.keys(second).length) return false;
    return keys.every(key => isEqual(first[key], second[key]));
  }

  return false;
};
