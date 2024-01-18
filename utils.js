import { _shaped } from './shared.js';

/**
 * Creates a new object composed of the specified keys and their corresponding values from the given object.
 *
 * @param {Object} obj - The source object from which to pick keys.
 * @param {string[]} keys - An array of keys to pick from the source object.
 * @returns {Object} - A new object containing only the specified keys and their values.
 */
export const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (obj[key]) result[key] = obj[key];
  }

  obj[_shaped] && Object.defineProperty(result, _shaped, { value: obj[_shaped] });
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
