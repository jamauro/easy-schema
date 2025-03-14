import { check as c, Match } from 'meteor/check';
import { shape, _shaped, _rules, _extra, enforce } from '../shape.js';
import { isObject, pick, hasOperators, formatErrors } from '../utils/shared';
import { ValidationError } from 'meteor/mdg:validation-error';

/**
 * @summary Check that data matches a schema pattern.
 * If the data does not match the schema, throw a `Validation Error`.
 *
 * @param {Any} data The data to check
 * @param {Pattern} schema The schema to match `data` against
 */
export const check = (data, schema) => { // full check only happens on the server so it's not an argument here
  if (hasOperators(data)) { // check on the client doesn't validate update operators to reduce bundle size and since it shouldn't be necessary. update operators are checked on the server.
    return;
  }

  // schema passed in can be customized instead of using the one on the collection.
  // if it it's already been shaped, then we don't need to do that again but otherwise we do so that {type: } and conditions are converted properly
  const shapedSchema = isObject(schema) ? (schema[_shaped] ? (schema.$id ? pick(schema, Object.keys(data)) : schema) : shape(schema)) : schema;
  const extra = shapedSchema[_extra];
  const rules = shapedSchema[_rules];
  const errors = [];

  try {
    c(data, extra ? Match.ObjectIncluding(shapedSchema) : shapedSchema, { throwAllErrors: true });
  } catch (e) {
    Array.isArray(e) ? errors.push(...e) : errors.push(e);
  }

  try  {
    enforce(data, rules);
  } catch (e) {
    errors.push(...e)
  }

  if (errors.length) {
    throw new ValidationError(formatErrors(errors));
  }

  return;
};
