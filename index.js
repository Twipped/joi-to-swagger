'use strict';

var joi = require('@hapi/joi');
var { find, get, set, merge } = require('lodash');

var patterns = {
	alphanum: '^[a-zA-Z0-9]*$',
	alphanumLower: '^[a-z0-9]*$',
	alphanumUpper: '^[A-Z0-9]*$',
	token: '^[a-zA-Z0-9_]*$',
	tokenLower: '^[a-z0-9_]*$',
	tokenUpper: '^[A-Z0-9_]*$',
};

var isJoi = function (joiObj) {
	return !!joiObj && joi.isSchema(joiObj);
};

module.exports = exports = function parse (schema, existingComponents) {
	// inspect(schema);

	if (!schema) throw new Error('No schema was passed.');

	if (typeof schema === 'object' && !isJoi(schema)) {
		schema = joi.object().keys(schema);
	}

	if (!isJoi(schema)) throw new TypeError('Passed schema does not appear to be a joi schema.');

	var override = meta(schema, 'swagger');
	if (override && meta(schema, 'swaggerOverride')) {
		return { swagger: override, components: {} };
	}

	var metaDefName = meta(schema, 'className');
	var metaDefType = meta(schema, 'classTarget') || 'schemas';

	// if the schema has a definition class name, and that
	// definition is already defined, just use that definition
	if (metaDefName && get(existingComponents, [ metaDefType, metaDefName ])) {
		return { swagger: refDef(metaDefType, metaDefName) };
	}

	if (get(schema, '_flags.presence') === 'forbidden') {
		return false;
	}

	var swagger;
	var components = {};

	const type = meta(schema, 'baseType') || schema.type;

	if (parseAsType[type]) {
		swagger = parseAsType[type](schema, existingComponents, components);
	} else {
		throw new TypeError(`${type} is not a recognized Joi type.`);
	}

	if (!swagger) return { swagger, components };

	if (schema._valids && schema._valids.has(null)) {
		swagger.nullable = true;
	}

	if (schema._flags.description) {
		swagger.description = schema._flags.description;
	}

	var examples = get(schema, [ '$_terms', 'examples' ]);
	if (examples && examples.length) {
		if (examples.length === 1) {
			swagger.example = examples[0];
		} else {
			swagger.examples = examples;
		}
	}

	var label = get(schema, '_flags.label');
	if (label) {
		swagger.title = label;
	}

	var defaultValue = get(schema, '_flags.default');
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

var parseAsType = {
	number: (schema) => {
		var swagger = {};

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

		if (find(schema._rules, { name: 'sign', args: { sign: 'positive' } })) {
			swagger.minimum = 1;
		}

		if (find(schema._rules, { name: 'sign', args: { sign: 'negative' }  })) {
			swagger.maximum = -1;
		}

		var min = find(schema._rules, { name: 'min' });
		if (min) {
			swagger.minimum = min.args.limit;
		}

		var max = find(schema._rules, { name: 'max' });
		if (max) {
			swagger.maximum = max.args.limit;
		}

		var valids = schema._valids ? schema._valids.values().filter((s) => typeof s === 'number') : [];
		if (get(schema, '_flags.only') && valids.length) {
			swagger.enum = valids;
		}

		return swagger;
	},
	string: (schema) => {
		var swagger = { type: 'string' };
		var strict = get(schema, '_preferences.convert') === false;

		if (find(schema._rules, { name: 'alphanum' })) {
			if (strict && find(schema._rules, { name: 'case', args: { direction: 'lower' } })) {
				swagger.pattern = patterns.alphanumLower;
			} else if (strict && find(schema._rules, { name: 'case', args: { direction: 'upper' } })) {
				swagger.pattern = patterns.alphanumUpper;
			} else {
				swagger.pattern = patterns.alphanum;
			}
		} else if (find(schema._rules, { name: 'token' })) {
			if (strict && find(schema._rules, { name: 'case', args: { direction: 'lower' } })) {
				swagger.pattern = patterns.tokenLower;
			} else if (strict && find(schema._rules, { name: 'case', args: { direction: 'upper' } })) {
				swagger.pattern = patterns.tokenUpper;
			} else {
				swagger.pattern = patterns.token;
			}
		} else if (find(schema._rules, { name: 'case' })) {
			if (find(schema._rules, { name: 'case', args: { direction: 'lower' } })) {
				swagger.pattern = patterns.alphanumLower;
			} else if (find(schema._rules, { name: 'case', args: { direction: 'upper' } })) {
				swagger.pattern = patterns.alphanumUpper;
			} else {
				swagger.pattern = patterns.alphanum;
			}
		}

		if (find(schema._rules, { name: 'email' })) {
			swagger.format = 'email';
			if (swagger.pattern) delete swagger.pattern;
		}

		if (find(schema._rules, { name: 'isoDate' })) {
			swagger.format = 'date-time';
			if (swagger.pattern) delete swagger.pattern;
		}

		var pattern = find(schema._rules, { name: 'pattern' });
		if (pattern) {
			swagger.pattern = pattern.args.regex.toString().slice(1, -1);
		}

		for (let i = 0; i < schema._rules.length; i++) {
			const test = schema._rules[i];
			if (test.name === 'min') {
				swagger.minLength = test.args.limit;
			}

			if (test.name === 'max') {
				swagger.maxLength = test.args.limit;
			}

			if (test.name === 'length') {
				swagger.minLength = test.args.limit;
				swagger.maxLength = test.args.limit;
			}
		}

		var valids = schema._valids ? schema._valids.values().filter((s) => typeof s === 'string') : [];
		if (get(schema, '_flags.only') && valids.length) {
			swagger.enum = valids;
		}

		return swagger;
	},
	binary: (schema) => {
		var swagger = { type: 'string', format: 'binary' };

		if (get(schema, '_flags.encoding') === 'base64') {
			swagger.format = 'byte';
		}

		for (let i = 0; i < schema._rules.length; i++) {
			const test = schema._rules[i];
			if (test.name === 'min') {
				swagger.minLength = test.arg;
			}

			if (test.name === 'max') {
				swagger.maxLength = test.arg;
			}

			if (test.name === 'length') {
				swagger.minLength = test.arg;
				swagger.maxLength = test.arg;
			}
		}

		return swagger;
	},
	date: (/* schema */) => ({ type: 'string', format: 'date-time' }),
	boolean: (/* schema */) => ({ type: 'boolean' }),
	alternatives: (schema, existingComponents, newComponentsByRef) => {
		var index = meta(schema, 'swaggerIndex') || 0;

		var matches = get(schema, [ '$_terms', 'matches' ]);
		var firstItem = get(matches, [ 0 ]);

		var itemsSchema;
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

		var items = exports(itemsSchema, merge({}, existingComponents || {}, newComponentsByRef || {}));
		if (get(itemsSchema, '_flags.presence') === 'required') {
			items.swagger.__required = true;
		}

		merge(newComponentsByRef, items.components || {});

		return items.swagger;
	},
	array: (schema, existingComponents, newComponentsByRef) => {
		var index = meta(schema, 'swaggerIndex') || 0;
		var itemsSchema = get(schema, [ '$_terms', 'items', index ]);

		if (!itemsSchema) throw Error('Array schema does not define an items schema at index ' + index);

		var items = exports(itemsSchema, merge({}, existingComponents || {}, newComponentsByRef || {}));

		merge(newComponentsByRef, items.components || {});

		var swagger = { type: 'array' };

		for (let i = 0; i < schema._rules.length; i++) {
			const test = schema._rules[i];
			if (test.name === 'min') {
				swagger.minItems = test.args.limit;
			}

			if (test.name === 'max') {
				swagger.maxItems = test.args.limit;
			}

			if (test.name === 'length') {
				swagger.minItems = test.args.limit;
				swagger.maxItems = test.args.limit;
			}
		}

		if (find(schema._rules, { name: 'unique' })) {
			swagger.uniqueItems = true;
		}

		swagger.items = items.swagger;
		return swagger;
	},
	object: (schema, existingComponents, newComponentsByRef) => {

		var requireds = [];
		var properties = {};

		var combinedComponents = merge({}, existingComponents || {}, newComponentsByRef || {});

		var children = get(schema, '$_terms.keys') || [];
		children.forEach((child) => {
			var key = child.key;
			var prop = exports(child.schema, combinedComponents);
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

		var swagger = { type: 'object' };
		if (requireds.length) {
			swagger.required = requireds;
		}
		swagger.properties = properties;

		if (get(schema, '_flags.unknown') !== true) {
			swagger.additionalProperties = false;
		}

		return swagger;
	},
	any: (schema, existingComponents, newComponentsByRef) => {
		var swagger = {};
		// convert property to file upload, if indicated by meta property
		if (meta(schema, 'swaggerType') === 'file') {
			swagger.type = 'file';
			swagger.in = 'formData';
		}
		if (schema._flags.description) {
			swagger.description = schema._flags.description;
		}

		var whens = get(schema, [ '$_terms', 'whens' ]);

		if (whens && whens.length) {
			var index = meta(schema, 'swaggerIndex') || 0;
			var firstItem = get(whens, [ 0 ]);

			var itemsSchema;
			if (firstItem.ref) {
				if (schema._baseType && !firstItem.otherwise) {
					itemsSchema = index ? firstItem.then : schema._baseType;
				} else {
					itemsSchema = index ? firstItem.otherwise : firstItem.then;
				}
			} else if (index) {
				itemsSchema = get(whens, [ index, 'schema' ]);
			} else {
				itemsSchema = firstItem.schema;
			}

			var items = exports(itemsSchema, merge({}, existingComponents || {}, newComponentsByRef || {}));
			if (get(itemsSchema, '_flags.presence') === 'required') {
				items.swagger.__required = true;
			}

			merge(newComponentsByRef, items.components || {});

			return items.swagger;
		}
		return swagger;
	},
};

function meta (schema, key) {
	var flattened = Object.assign.apply(null, [ {} ].concat(get(schema, [ '$_terms', 'metas' ])));

	return get(flattened, key);
}

function refDef (type, name) {
	return { $ref: '#/components/' + type + '/' + name };
}

// var inspectU = require('util').inspect;
// function inspect (value) {
// 		console.error(inspectU(value, { colors: true, depth: 10 }));
// }
