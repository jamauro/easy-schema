import { config, configure } from './lib/config/server';
import { has, shape, Any, ID, ObjectID, Optional, Integer, AnyOf, REQUIRED, _getParams } from './lib/shape';
import { pick } from './lib/utils/shared';
import { check } from './lib/check/server';
import './lib/attach/server';
import './lib/mongo/server';

const EasySchema = Object.freeze({ config, configure, REQUIRED });
export { check, pick, has, shape, Any, ID, ObjectID, Optional, Integer, AnyOf, _getParams, EasySchema };
