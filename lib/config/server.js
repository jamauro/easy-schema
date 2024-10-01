import { check as c, Match } from 'meteor/check';
import { isEmpty } from '../utils/shared';

export const config = {
  base: {},
  autoCheck: true,
  autoAttachJSONSchema: true,
  validationAction: 'error',
  validationLevel: 'strict',
  additionalBsonTypes: {} // allows user to set additional key, value pairs in typeMap
};

export const typeMap = {
  String: 'string',
  ID: 'string',
  ObjectID: 'objectId',
  Number: 'double', // double for mongo, number for jsonschema
  Boolean: 'bool', // bool for mongo, boolean for jsonschema
  Date: 'date',
  Object: 'object',
  Array: 'array',
  ['__integer__']: 'int', // int for mongo, integer for jsonschema,
  Decimal: 'decimal', // only avaiable when using the mongo-decimal package
  // BigInt: 'long' // untested, commenting out for now. also the team that works on the mongo node driver is working on some things around this so let's wait to see what they do. https://jira.mongodb.org/browse/NODE-3126
};

/**
 * Configures the settings for EasySchema.
 *
 * @param {{
 *   base: (Object|undefined),
 *   autoCheck: (boolean|undefined),
 *   autoAttachJSONSchema: (boolean|undefined),
 *   validationAction: (string|undefined),
 *   validationLevel: (string|undefined),
 *   additionalBsonTypes: (Object|undefined)
 * }} options - Configuration options.
 *
 * @returns {Object} - The updated configuration object.
 */
export const configure = options => {
  c(options, {
    base: Match.Maybe(Object),
    autoCheck: Match.Maybe(Boolean),
    autoAttachJSONSchema: Match.Maybe(Boolean),
    validationAction: Match.Maybe(String),
    validationLevel: Match.Maybe(String),
    additionalBsonTypes: Match.Maybe(Object)
  });

  if (!isEmpty(options.additionalBsonTypes)) {
    Object.assign(typeMap, options.additionalBsonTypes)
  }

  return Object.assign(config, options);
}
