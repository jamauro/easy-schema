import { check as c, Match } from 'meteor/check';
import { pick, isObject, isEmpty, isEqual } from './utils';

export const REQUIRED = 'Missing key';
export const Integer = Match.Integer; // Matches only signed 32-bit integers
export const Any = Match.Any;
export const Optional = (type) => Match.Maybe(type);
export const AnyOf = (...args) => Match.OneOf(...args); // Match.OneOf is equivalent to JSON Schema's AnyOf.
export const Where = ({type, ...conditions}) => Match.Where(x => validate({x, type, ...conditions})); // exported for testing only
export const allowed = ['min', 'max', 'regex', 'allow', 'unique', 'where', 'additionalProperties'];
export const isArray = a => Array.isArray(a) && (a !== Integer) && (a !== Any); // Match.Integer is technically modeled as an array so we need to make sure it's not an Integer
export const _shaped = Symbol('_shaped');

export const getValue = v => { // unwraps optional values or just returns the value
  const { constructor: { name } } = v || {};
  const optional = name === 'Maybe';
  const anyOf = name === 'OneOf';

  return {
    optional,
    anyOf,
    value: (optional || anyOf) ? Object.values(v)[0] : v
  }
};

export const hasOperators = obj => Object.keys(obj).some(k => k.includes('$'));

const validate = ({x, type, min, max, regex, allow, unique, where, additionalProperties}) => {
  try {
    const typeValue = isObject(type) && Object.values(type)[0];
    if (typeValue && typeValue.type) { // handles {type: {thing: String, another: Number}, min: 1, max: 2} // // note: was Object.values(type)[0]?.type but optional chaining increased bundle size
      for (const [k, v] of Object.entries(x)) {
        const { type: embeddedType, ...conditions } = type[k];
        if (embeddedType) { // handles {type: {thing: {type: String, ...}, another: Number}, min: 1, max: 2}
          validate({x: v, type: embeddedType, ...conditions})
        } else {
          const matches = Match.test(v, type[k]);
          if (!matches) {
            throw `Expected ${type[k].name.toLowerCase()}, got ${typeof v} in field ${k}`
          }
        }
      }
    } else if (type[0] && type[0].type) { // handles shape {type: [{type: String, regex: /com$/, max: 9}], min: 1, max: 2} // note: was type[0]?.type but optional chaining increased bundle size
      const { type: embeddedType, ...conditions } = type[0];
      c(x, [embeddedType])
      x.forEach(value => {
        validate({x: value, type: embeddedType, ...conditions});
      });
    } else if (isArray(type) && isArray(type[0])) { // handles array of arrays shape [ [] ]
      x.forEach((value, index) => {
        if (value.type) {
          const { type: embeddedType, ...conditions } = value;
          c(x, embeddedType)
          validate({x: value, type: embeddedType, ...conditions});
        } else {
          c(value, type[0][index])
        }
      })
    } else if (additionalProperties) { // only for Objects. if additionalProperties: true, then allow additional {key: value} pairs bypass validation by removing them from x
      c(pick(x, Object.keys(type)), type);
    } else {
      c(x, type);
    }

    const isAnArray = type => isArray(type) || type === Array;
    const isAnObject = type => isObject(type) || type === Object;

    if (where) {
      try {
        where(x, {min, max, regex, allow, unique});
      } catch(error) {
        throw `w: ${error}`
      }
    }

    if (min || max) {
      const count = isAnObject(type) ? Object.keys(x).length : (type === String || isAnArray(type)) ? x.length : x;
      const term = isAnObject(type) ? `properties` : type === String ? `characters` : isAnArray(type) ? `items` : '';

      const [mn, mnErr] = Array.isArray(min) ? min : [min];
      const [mx, mxErr] = Array.isArray(max) ? max : [max];
      const minFail = mn && count < mn;

      if (minFail || (mx && count > mx)) {
        throw minFail && mnErr && `w: ${mnErr}` || mxErr && `w: ${mxErr}` || (count < 1 ? `cannot be empty` : `must be ${min ? 'at least ' + min + ' ' + term : ''}${min && mx ? ' and ' : ''}${max ? 'at most ' + mx + ' ' + term : ''}`);
      }
    }

    if (allow) {
      const alwErr = allow.some(Array.isArray) && typeof ([last] = allow.slice(-1))[0] === 'string' ? last : undefined;
      const alw = alwErr ? allow[0] : allow;

      const pass = (isAnObject(type) || isAnArray(type)) ? alw.some(a => isEqual(a, x)) : alw.includes(x) || alw.map(a => a.toString()).includes(x.toString()); // .toString() handles Decimal case
      if (!pass) {
        throw alwErr && `w: ${alwErr}` || `must have an allowed value, not ${JSON.stringify(x)}`;
      }
    }

    if (regex) {
      const [ r, rErr ] = Array.isArray(regex) ? regex : [regex];
      if (!r.test(x)) throw rErr && `w: ${rErr}` || `must match regex ${r}`;
    }

    if (unique) {
      const [ u, uErr ] = Array.isArray(unique) ? unique : [unique];
      if (new Set(x).size !== x.length) throw uErr && `w: ${uErr}` || 'items must be unique'
    }

    return true;
  } catch(error) {
    throw new Match.Error(error)
  }
};

export const _getParams = fn => {
  const match = fn.toString().match(/let\s*\{\s*([^}]*)\s*\}/);
  return match ? match[1].split(',').map(pair => pair.trim().split(':')[0]) : []
}

// extract pulls out the nested array or object given a path that's an array of keys
const extract = (obj, path) => path.reduce((acc, key, i) => (i === path.length - 1 && key === '0') ? Array.isArray(acc) ? acc : Object.values(acc) : acc[key], obj);

export const enforce = (data, rules) => {
  const matchedRules = rules.filter(({ path }) => Object.keys(data).includes(path[0]));
  for (const { path, rule } of matchedRules) {
    try {
      const ruleData = path.length === 1 ? data : extract(data, path.slice(0, -1));
      if (!((Array.isArray(ruleData) ? ruleData.every(d => rule(d)) : rule(ruleData)) || true)) { // where functions don't have to return true so we set it to true if it doesn't throw from within the where function
        throw 'failed where condition';
      }
    } catch(error) {
      throw { path: path.join('.'), message: `w: ${error}` }
    }
  };
};

/**
 * Shapes an object based on a POJO.
 *
 * @param {Object} obj - The object to be shaped.
 * @returns {Object} The shaped object that's ready to use with jam:easy-schema `check`.
 */
export const shape = obj => {
  const rules = []; // rules will stores any dependency rules that are found on embedded objects with 'where' functions that destructure a key that is not the current key

  const sculpt = (obj, currentPath = [], skip = false) => {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      const path = skip ? currentPath : [...currentPath, k]; // we don't want to add Optional or AnyOf keys – 'pattern', '0' – to the path which we use for $rules so we use skip
      const { value, optional, anyOf } = getValue(v);

      if (optional) {
        acc[k] = Optional(...Object.values(sculpt(v, path, true)));
      } else if (anyOf) {
        acc[k] = AnyOf(...Object.values(sculpt(value, path, true)));
      } else if (isObject(value) && value.hasOwnProperty('type')) {
        const { type, ...conditions } = value;
        const { where, ...restConditions } = conditions;
        const deps = typeof where === 'function' && where.length === 1 ? _getParams(where).filter(n => n !== k) : [];

        if (Object.keys(conditions).some(i => !allowed.includes(i))) {
          acc[k] = value;
        } else {
          if (isEmpty(conditions)) {
            acc[k] = type;
          } else {
            const { value: tValue, optional: tOptional } = getValue(type);
            const finalConditions = deps.length ? restConditions : conditions;
            acc[k] = tOptional ? Optional(Where({ type: tValue, ...finalConditions })) : Where({ type, ...finalConditions });
          }
        }

        if (deps.length) {
          rules.push({
            path,
            rule: where,
            deps
          });
        }
      } else if (isArray(value)) {
        acc[k] = isArray(value[0]) ? [Where({ type: value })] : [...Object.values(sculpt(v, path))];
      } else if (isObject(value)) {
        acc[k] = sculpt(value, path);
      } else {
        acc[k] = v;
      }
      return acc;
    }, {});
  };

  const result = sculpt(obj);
  rules.length && (result.$rules = rules);
  Object.defineProperty(result, _shaped, {value: true});
  return result;
};
