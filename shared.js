import { check as c, Match } from 'meteor/check';
import { pick, isObject, isEmpty, isEqual } from './utils';

export const Integer = Match.Integer; // Matches only signed 32-bit integers
export const Any = Match.Any;
export const Optional = (type) => Match.Maybe(type);
export const AnyOf = (...args) => Match.OneOf(...args); // Match.OneOf is equivalent to JSON Schema's AnyOf.
export const Where = ({type, ...conditions}) => Match.Where(x => validate({x, type, ...conditions})); // exported for testing only
export const allowedKeywords = ['min', 'max', 'regex', 'allow', 'unique', 'additionalProperties'];
export const isArray = a => Array.isArray(a) && (a !== Integer) && (a !== Any); // Match.Integer is technically modeled as an array so we need to make sure it's not an Integer

export const getValue = (val) => { // unwraps optional values or just returns the value
  const optional = val?.constructor?.name === 'Maybe';
  const anyOf = val?.constructor?.name === 'OneOf';

  return {
    optional,
    anyOf,
    value: (optional || anyOf) ? Object.values(val)[0] : val
  }
};

export const hasModifiers = obj => Object.keys(obj).some(k => k.includes('$'));

const validate = ({x, type, min, max, regex, allow, unique, additionalProperties}) => {
  try {
    if (isObject(type) && Object.values(type)[0]?.type) { // handles {type: {thing: String, another: Number}, min: 1, max: 2}
      for (const [k, v] of Object.entries(x)) {
        if (type[k]?.type) { // handles {type: {thing: {type: String, ...}, another: Number}, min: 1, max: 2}
          const { type: embeddedType, ...conditions } = type[k];
          validate({x: v, type: embeddedType, ...conditions})
        } else {
          const matches = Match.test(v, type[k]);
          if (!matches) {
            throw `Expected ${type[k].name.toLowerCase()}, got ${typeof v} in property ${k}`
          }
        }
      }
    } else if (type[0]?.type) { // handles shape {type: [{type: String, regex: /com$/, max: 9}], min: 1, max: 2}
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

    if (min || max) {
      const count = isAnObject(type) ? Object.keys(x).length : (type === String || isAnArray(type)) ? x.length : x;
      const descriptor = isAnObject(type) ? `properties` : type === String ? `characters` : isAnArray(type) ? `items` : '';

      const pass = (min && max) ? count >= min && count <= max : (!min && !max || (min && count >= min) || (max && count <= max));
      if (!pass) {
        throw `must be ${min ? 'at least ' + min + ' ' + descriptor : ''}${min && max ? ' and ' : ''}${max ? 'at most ' + max + ' ' + descriptor : ''}`;
      }
    }

    if (allow) {
      const pass = (isAnObject(type) || isAnArray(type)) ? allow.some(a => isEqual(a, x)) : allow.includes(x) || allow.map(a => a.toString()).includes(x.toString()); // .toString() handles Decimal case
      if (!pass) {
        throw `${JSON.stringify(x)} is not an allowed value`;
      }
    }

    if (regex) { // only for Strings
      const pass = regex.test(x);
      if (!pass) {
        throw `does not match regex ${regex}`;
      }
    }

    if (unique) { // only for Arrays
      const pass = x.length === new Set(x).size;
      if (!pass) {
        throw `items must be unique`;
      }
    }

    return true;
  } catch(error) {
    throw new Match.Error(error);
  }
};

export const shapeSchema = (obj) => {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const { value, optional, anyOf } = getValue(v);

    if (optional) {
      acc[k] = Optional(...Object.values(shapeSchema(v)))
    } else if (anyOf) {
      acc[k] = AnyOf(...Object.values(shapeSchema(value)));
    } else if (isObject(value) && value.hasOwnProperty('type')) {
      const { type, ...conditions } = value;

      if (Object.keys(conditions).some(i => !allowedKeywords.includes(i))) { // this prevents a situation where the user has a {type: } as part of their schema but did not intend to use it to create conditions
        acc[k] = value
      } else {
        if (isEmpty(conditions)) {
          acc[k] = type
        } else {
          const { value: tValue, optional: tOptional } = getValue(type);
          acc[k] = tOptional ? Optional(Where({type: tValue, ...conditions})) : Where({type, ...conditions})
        }
      }
    } else if (isArray(value)) {
      acc[k] = isArray(value[0]) ? [Where({type: value})] : [...Object.values(shapeSchema(v))] // isArray(value[0]) checks for 2d array [[]]
    } else if (isObject(value)) {
      acc[k] = shapeSchema(value);
    } else {
      acc[k] = v;
    }
    return acc;
  }, {});
};
