'use strict';

const joi = require('@hapi/joi');
const { find, get, set, merge } = require('lodash');

const patterns = {
	alphanum: '^[a-zA-Z0-9]*$',
	alphanumLower: '^[a-z0-9]*$',
	alphanumUpper: '^[A-Z0-9]*$',
};

function meta (schema, key) {
	const flattened = Object.assign.apply(null, [ {} ].concat(schema.$_terms.metas));

	return get(flattened, key);
}

function refDef (type, name) {
	return { $ref: '#/components/' + type + '/' + name };
}

function getMinMax (schema, suffix = 'Length') {
	const swagger = {};
	for (let i = 0; i < schema._rules.length; i++) {
		const test = schema._rules[i];
		if (test.name === 'min') {
			swagger[`min${suffix}`] = test.args.limit;
		}

		if (test.name === 'max') {
			swagger[`max${suffix}`] = test.args.limit;
		}

		if (test.name === 'length') {
			swagger[`min${suffix}`] = test.args.limit;
			swagger[`max${suffix}`] = test.args.limit;
		}
	}
	return swagger;
}

function getCaseSuffix (schema) {
	const caseRule = find(schema._rules, { name: 'case' });
	if (caseRule && caseRule.args.direction === 'lower') {
		return 'Lower';
	} else if (caseRule && caseRule.args.direction === 'upper') {
		return 'Upper';
	}
	return '';
}

const parseAsType = {
	number: (schema) => {
		const swagger = {};

		if (find(schema._rules, { name: 'integer' })) {
			swagger.type = 'integer';
		} else {
			swagger.type = 'number';
			if (find(schema._rules, { name: 'precision' })) {
				swagger.format = 'double';
			} else {
				swagger.format = 'float';
			}
		}

		const sign = find(schema._rules, { name: 'sign' });
		if (sign) {
			if (sign.args.sign === 'positive') {
				swagger.minimum = 1;
			} else if (sign.args.sign === 'negative') {
				swagger.maximum = -1;
			}
		}

		const min = find(schema._rules, { name: 'min' });
		if (min) {
			swagger.minimum = min.args.limit;
		}

		const max = find(schema._rules, { name: 'max' });
		if (max) {
			swagger.maximum = max.args.limit;
		}

		if (schema._valids) {
			const valids = schema._valids.values().filter((s) => typeof s === 'number');
			if (get(schema, '_flags.only') && valids.length) {
				swagger.enum = valids;
			}
		}

		return swagger;
	},
	string: (schema) => {
		const swagger = { type: 'string' };

		if (find(schema._rules, { name: 'alphanum' })) {
			const strict = get(schema, '_preferences.convert') === false;
			swagger.pattern = patterns[`alphanum${strict ? getCaseSuffix(schema) : ''}`];
		}

		if (find(schema._rules, { name: 'token' })) {
			swagger.pattern = pattern[`alphanum${getCaseSuffix(schema)}`];
		}

		if (find(schema._rules, { name: 'email' })) {
			swagger.format = 'email';
			if (swagger.pattern) delete swagger.pattern;
		}

		if (find(schema._rules, { name: 'isoDate' })) {
			swagger.format = 'date-time';
			if (swagger.pattern) delete swagger.pattern;
		}

		const pattern = find(schema._rules, { name: 'pattern' });
		if (pattern) {
			swagger.pattern = pattern.args.regex.toString().slice(1, -1);
		}

		Object.assign(swagger, getMinMax(schema));

		if (schema._valids) {
			const valids = schema._valids.values().filter((s) => typeof s === 'string');
			if (get(schema, '_flags.only') && valids.length) {
				swagger.enum = valids;
			}
		}

		return swagger;
	},
	binary: (schema) => {
		const swagger = { type: 'string', format: 'binary' };

		if (get(schema, '_flags.encoding') === 'base64') {
			swagger.format = 'byte';
		}

		Object.assign(swagger, getMinMax(schema));

		return swagger;
	},
	date: (/* schema */) => ({ type: 'string', format: 'date-time' }),
	boolean: (/* schema */) => ({ type: 'boolean' }),
	alternatives: (schema, existingComponents, newComponentsByRef) => {
		const index = meta(schema, 'swaggerIndex') || 0;

		const matches = get(schema, [ '$_terms', 'matches' ]);
		const firstItem = get(matches, [ 0 ]);

		let itemsSchema;
		if (firstItem.ref) {
			if (schema._baseType && !firstItem.otherwise) {
				itemsSchema = index ? firstItem.then : schema._baseType;
			} else {
				itemsSchema = index ? firstItem.otherwise : firstItem.then;
			}
		} else if (index) {
			itemsSchema = get(matches, [ index, 'schema' ]);
		} else {
			itemsSchema = firstItem.schema;
		}

		const items = exports(itemsSchema, merge({}, existingComponents || {}, newComponentsByRef || {}));
		if (get(itemsSchema, '_flags.presence') === 'required') {
			items.swagger.__required = true;
		}

		merge(newComponentsByRef, items.components || {});

		return items.swagger;
	},
	array: (schema, existingComponents, newComponentsByRef) => {
		const index = meta(schema, 'swaggerIndex') || 0;
		const itemsSchema = get(schema, [ '$_terms', 'items', index ]);

		if (!itemsSchema) throw Error('Array schema does not define an items schema at index ' + index);

		const items = exports(itemsSchema, merge({}, existingComponents || {}, newComponentsByRef || {}));

		merge(newComponentsByRef, items.components || {});

		const swagger = { type: 'array' };

		Object.assign(swagger, getMinMax(schema, 'Items'));

		if (find(schema._rules, { name: 'unique' })) {
			swagger.uniqueItems = true;
		}

		swagger.items = items.swagger;
		return swagger;
	},
	object: (schema, existingComponents, newComponentsByRef) => {

		const requireds = [];
		const properties = {};

		const combinedComponents = merge({}, existingComponents || {}, newComponentsByRef || {});

		const children = get(schema, '$_terms.keys') || [];
		children.forEach((child) => {
			const key = child.key;
			const prop = exports(child.schema, combinedComponents);
			if (!prop.swagger) { // swagger is falsy if joi.forbidden()
				return;
			}

			merge(newComponentsByRef, prop.components || {});
			merge(combinedComponents, prop.components || {});

			properties[key] = prop.swagger;

			if (get(child, 'schema._flags.presence') === 'required' || prop.swagger.__required) {
				requireds.push(key);
				delete prop.swagger.__required;
			}
		});

		const swagger = { type: 'object' };
		if (requireds.length) {
			swagger.required = requireds;
		}
		swagger.properties = properties;

		if (get(schema, '_flags.unknown') !== true) {
			swagger.additionalProperties = false;
		}

		return swagger;
	},
	any: (schema) => {
		const swagger = {};
		// convert property to file upload, if indicated by meta property
		if (meta(schema, 'swaggerType') === 'file') {
			swagger.type = 'file';
			swagger.in = 'formData';
		}
		return swagger;
	},
};

module.exports = exports = function parse (schema, existingComponents) {
	// inspect(schema);

	if (!schema) throw new Error('No schema was passed.');

	if (typeof schema === 'object' && !joi.isSchema(schema)) {
		schema = joi.object().keys(schema);
	}

	if (!schema.type || !schema.$_root) throw new TypeError('Passed schema does not appear to be a joi schema.');

	const flattenMeta = Object.assign.apply(null, [ {} ].concat(schema.$_terms.metas));

	const override = flattenMeta.swagger;
	if (override && flattenMeta.swaggerOverride) {
		return { swagger: override, components: {} };
	}

	const metaDefName = flattenMeta.className;
	const metaDefType = flattenMeta.classTarget || 'schemas';

	// if the schema has a definition class name, and that
	// definition is already defined, just use that definition
	if (metaDefName && get(existingComponents, [ metaDefType, metaDefName ])) {
		return { swagger: refDef(metaDefType, metaDefName) };
	}

	// TODO: test forbidden
	if (get(schema, '_flags.presence') === 'forbidden') {
		return false;
	}

	const type = meta(schema, 'baseType') || schema.type;

	if (!parseAsType[type]) {
		throw new TypeError(`${type} is not a recognized Joi type.`);
	}

	const components = {};
	const swagger = parseAsType[type](schema, existingComponents, components);

	if (!swagger) return { swagger, components };

	if (schema._valids && schema._valids.has(null)) {
		swagger.nullable = true;
	}

	const description = get(schema, '_flags.description');
	if (description) {
		swagger.description = description;
	}

	if (schema.$_terms.examples) {
		if (schema.$_terms.examples.length === 1) {
			swagger.example = schema.$_terms.examples[0];
		} else {
			swagger.examples = schema.$_terms.examples;
		}
	}

	const label = get(schema, '_flags.label');
	if (label) {
		swagger.title = label;
	}

	const defaultValue = get(schema, '_flags.default');
	if (defaultValue && typeof defaultValue !== 'function') {
		swagger.default = defaultValue;
	}

	if (metaDefName) {
		set(components, [ metaDefType, metaDefName ], swagger);
		return { swagger: refDef(metaDefType, metaDefName), components };
	}

	if (override) {
		Object.assign(swagger, override);
	}

	return { swagger, components };
};

// const inspectU = require('util').inspect;
// function inspect (value) {
// 		console.error(inspectU(value, { colors: true, depth: 10 }));
// }
