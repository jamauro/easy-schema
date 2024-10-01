import { config, configure } from './lib/config/client';
import { has, shape, Any, ID, ObjectID, Optional, Integer, AnyOf, REQUIRED, _getParams } from './lib/shape';
import { pick } from './lib/utils/shared';
import { check } from './lib/check/client';
import './lib/attach/client';

const load = async () => await import('./lib/mongo/client');
load().catch(e => console.error(e))

const EasySchema = Object.freeze({ config, configure, REQUIRED });
export { check, pick, has, shape, Any, ID, ObjectID, Optional, Integer, AnyOf, _getParams, EasySchema };
