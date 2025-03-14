import { _shaped } from '../shape.js';

export const isObject = o => o && o.constructor === Object;
export const isEmpty = obj => [Object, Array].includes((obj || {}).constructor) && !Object.entries((obj || {})).length;
export const capitalize = str => str[0].toUpperCase() + (str.toLowerCase()).slice(1);
export const hasOperators = obj => Object.keys(obj || {}).some(k => k.includes('$'));

// extract pulls out the nested array or object given a path that's an array of keys
export const extract = (obj, path) => path.reduce((acc, key, i) => (i === path.length - 1 && key === '0') ? Array.isArray(acc) ? acc : Object.values(acc) : acc?.[key], obj);

/**
 * Creates a new object composed of the specified keys and their corresponding values from the given object.
 *
 * @param {Object} obj - The source object from which to pick keys.
 * @param {string[]} keys - An array of keys to pick from the source object.
 * @returns {Object} - A new object containing only the specified keys and their values.
 */
export const pick = (obj, keys) => {
  const shaped = obj[_shaped];

  const result = {};
  for (const key of keys) {
    if (obj[key]) result[key] = obj[key];
  }

  if (shaped) Object.defineProperty(result, _shaped, { value: shaped });
  return result;
};

export const formatErrors = errors => errors.map(({ path, message: m }) => {
  const type = m.includes('Missing key') ? 'required' : m.includes('Expected') ? 'type' : 'condition';
  const matches = type === 'type' && (m.match(/Expected (.+), got (.+) in/) || m.match(/Expected (.+) in/));
  const errorMessage = type === 'required' ? 'is required' : matches ? `must be a ${matches[1]}${matches[2] ? `, not ${matches[2]}` : ''}` : m.replace(/\b(Match error:|w:|in field\s\S*)/g, '').trim();
  const splitPath = path.split('.');
  const name = type === 'required' ? m.split("'")[1] : splitPath.pop();
  const message = (name && (type !== 'condition' || !m.includes('w:'))) ? `${capitalize(name.replace(/([A-Z])/g, ' $1'))} ${errorMessage}` : capitalize(errorMessage);

  return { name, type, message, ...(splitPath.length > 1 && { path }) };
});

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
