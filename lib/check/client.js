import { check as c, Match } from 'meteor/check';
import { shape, meta, enforce } from '../shape.js';
import { isObject, pick, hasOperators, formatErrors } from '../utils/shared';
import { ValidationError } from 'meteor/mdg:validation-error';

/**
 * @summary Check that data matches a schema pattern.
 * If the data does not match the schema, throw a `Validation Error`.
 *
 * @param {Any} data The data to check
 * @param {Pattern} schema The schema to match `data` against
 */
export const check = (data, schema) => {
  if (hasOperators(data)) { // check on the client doesn't validate update operators to reduce bundle size and since it shouldn't be necessary. update operators are checked on the server.
    return;
  }

  // schema passed in can be customized instead of using the one on the collection.
  // if it it's already been shaped, then we don't need to do that again but otherwise we do so that {type: } and conditions are converted properly
  const { name, shaped } = schema[meta] || {};
  const shapedSchema = !isObject(schema) ? schema : shaped ? (name ? pick(schema, Object.keys(data)) : schema) : shape(schema);
  const { extra, rules } = shapedSchema[meta] || {};
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
