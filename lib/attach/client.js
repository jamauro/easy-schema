import { Mongo } from 'meteor/mongo';
import { config } from '../config/client';
import { shape } from '../shape.js';
import './both';

/**
 * @summary Attach a schema to a collection
 *
 * @param {Object} schema The schema to attach
 */
Mongo.Collection.prototype.attachSchema = function(schema) {
  this.schema = shape({...schema, ...config.base}, { name: `${this._name}` });
  return this;
};
