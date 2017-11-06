'use strict';

var joi = require('joi');
var find = require('lodash.find');
var get = require('lodash.get');

module.exports = exports = function parse (schema, existingDefinitions) {
	// inspect(schema);

	if (!schema) throw new Error('No schema was passed.');

	if (typeof schema === 'object' && !schema.isJoi) {
		schema = joi.object().keys(schema);
	}

	if (!schema.isJoi) throw new TypeError('Passed schema does not appear to be a joi schema.');

	var override = meta(schema, 'swagger');
	if (override && meta(schema, 'swaggerOverride')) {
		return { swagger: override, definitions: {} };
	}

	var metaDefName = meta(schema, 'className');

	// if the schema has a definition class name, and that
	// definition is already defined, just use that definition
	if (metaDefName && existingDefinitions && existingDefinitions[metaDefName]) {
		return { swagger: refDef(metaDefName) };
	}

	var swagger;
	var definitions = {};

	if (parseAsType[schema._type]) {
		swagger = parseAsType[schema._type](schema, existingDefinitions, definitions);
	} else {
		throw new TypeError(`${schema._type} is not a recognized Joi type.`);
	}

	if (schema._valids && schema._valids.has(null)) {
		swagger.type = [ swagger.type, 'null' ];
	}

	if (schema._description) {
		swagger.description = schema._description;
	}

	var defaultValue = get(schema, '_flags.default');
	if (defaultValue) {
		swagger.default = defaultValue;
	}

	if (metaDefName) {
		definitions[metaDefName] = swagger;
		return { swagger: refDef(metaDefName), definitions };
	}

	if (override) {
		Object.assign(swagger, override);
	}

	if (get(schema, '_flags.presence') === 'forbidden') {
		return false;
	}

	return { swagger, definitions };
};

var parseAsType = {
	number: (schema) => {
		var swagger = {};

		if (find(schema._tests, { name: 'integer' })) {
			swagger.type = 'integer';
		} else {
			swagger.type = 'number';
			if (find(schema._tests, { name: 'precision' })) {
				swagger.format = 'double';
			} else {
				swagger.format = 'float';
			}
		}

		if (find(schema._tests, { name: 'positive' })) {
			swagger.minimum = 1;
		}

		if (find(schema._tests, { name: 'negative' })) {
			swagger.maximum = -1;
		}

		var min = find(schema._tests, { name: 'min' });
		if (min) {
			swagger.minimum = min.arg;
		}

		var max = find(schema._tests, { name: 'max' });
		if (max) {
			swagger.maximum = max.arg;
		}

		var valids = schema._valids.values().filter((s) => typeof s === 'number');
		if (get(schema, '_flags.allowOnly') && valids.length) {
			swagger.enum = valids;
		}

		return swagger;
	},
	string: (schema) => {
		var swagger = { type: 'string' };

		if (get(schema, '_flags.presence') === 'forbidden') {
			return false;
		}

		var strict = get(schema, '_settings.convert') === false;

		if (find(schema._tests, { name: 'alphanum' })) {
			if (strict && find(schema._tests, { name: 'lowercase' })) {
				swagger.pattern = '/^[a-z0-9]*$/';
			} else if (strict && find(schema._tests, { name: 'uppercase' })) {
				swagger.pattern = '/^[A-Z0-9]*$/';
			} else {
				swagger.pattern = '/^[a-zA-Z0-9]*$/';
			}
		}

		if (find(schema._tests, { name: 'token' })) {
			if (find(schema._tests, { name: 'lowercase' })) {
				swagger.pattern = '/^[a-z0-9_]*$/';
			} else if (find(schema._tests, { name: 'uppercase' })) {
				swagger.pattern = '/^[A-Z0-9_]*$/';
			} else {
				swagger.pattern = '/^[a-zA-Z0-9_]*$/';
			}
		}

		if (find(schema._tests, { name: 'email' })) {
			swagger.format = 'email';
			if (swagger.pattern) delete swagger.pattern;
		}

		if (find(schema._tests, { name: 'isoDate' })) {
			swagger.format = 'date-time';
			if (swagger.pattern) delete swagger.pattern;
		}

		var pattern = find(schema._tests, { name: 'regex' });
		if (pattern) {
			swagger.pattern = pattern.arg.pattern.toString();
		}

		for (let i = 0; i < schema._tests.length; i++) {
			const test = schema._tests[i];
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

		var valids = schema._valids.values().filter((s) => typeof s === 'string');
		if (get(schema, '_flags.allowOnly') && valids.length) {
			swagger.enum = valids;
		}

		return swagger;
	},
	binary: (schema) => {
		var swagger = { type: 'string', format: 'binary' };

		if (get(schema, '_flags.presence') === 'forbidden') {
			return false;
		}

		if (get(schema, '_flags.encoding') === 'base64') {
			swagger.format = 'byte';
		}

		for (let i = 0; i < schema._tests.length; i++) {
			const test = schema._tests[i];
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
	date: (schema) => {

		if (get(schema, '_flags.presence') === 'forbidden') {
			return false;
		}
		return { type: 'string', format: 'date-time' };
	},
	boolean: (schema) => {

		if (get(schema, '_flags.presence') === 'forbidden') {
			return false;
		}
		return { type: 'boolean' };
	},
	alternatives: (schema, existingDefinitions, newDefinitionsByRef) => {
		var index = meta(schema, 'swaggerIndex') || 0;

		var matches = get(schema, [ '_inner', 'matches' ]);
		var firstItem = get(matches, [ 0 ]);

		var itemsSchema;
		if (firstItem.ref) {
			itemsSchema = index ? firstItem.otherwise : firstItem.then;
		} else if (index) {
			itemsSchema = get(matches, [ index, 'schema' ]);
		} else {
			itemsSchema = firstItem.schema;
		}

		var items = exports(itemsSchema, Object.assign({}, existingDefinitions || {}, newDefinitionsByRef || {}));
		if (get(itemsSchema, '_flags.presence') === 'required') {
			items.swagger.__required = true;
		}

		Object.assign(newDefinitionsByRef, items.definitions || {});

		return items.swagger;
	},
	array: (schema, existingDefinitions, newDefinitionsByRef) => {
		var index = meta(schema, 'swaggerIndex') || 0;
		var itemsSchema = get(schema, [ '_inner', 'items', index ]);

		if (!itemsSchema) throw Error('Array schema does not define an items schema at index ' + index);

		if (get(itemsSchema, '_flags.presence') === 'forbidden') {
			return false;
		}

		var items = exports(itemsSchema, Object.assign({}, existingDefinitions || {}, newDefinitionsByRef || {}));

		Object.assign(newDefinitionsByRef, items.definitions || {});

		var swagger = { type: 'array' };

		for (let i = 0; i < schema._tests.length; i++) {
			const test = schema._tests[i];
			if (test.name === 'min') {
				swagger.minItems = test.arg;
			}

			if (test.name === 'max') {
				swagger.maxItems = test.arg;
			}

			if (test.name === 'length') {
				swagger.minItems = test.arg;
				swagger.maxItems = test.arg;
			}
		}

		if (find(schema._tests, { name: 'unique' })) {
			swagger.uniqueItems = true;
		}

		swagger.items = items.swagger;
		return swagger;
	},
	object: (schema, existingDefinitions, newDefinitionsByRef) => {

		var requireds = [];
		var properties = {};

		var combinedDefinitions = Object.assign({}, existingDefinitions || {}, newDefinitionsByRef || {});

		var children = get(schema, '_inner.children') || [];
		children.forEach((child) => {
			var key = child.key;
			var prop = exports(child.schema, combinedDefinitions);
			if (!prop.swagger) { // swagger is falsy if joi.forbidden()
				return;
			}

			Object.assign(newDefinitionsByRef, prop.definitions || {});
			Object.assign(combinedDefinitions, prop.definitions || {});

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

		if (get(schema, '_flags.allowUnknown') === false) {
			swagger.additionalProperties = false;
		}

		return swagger;
	},
};

function meta (schema, key) {
	var flattened = Object.assign.apply(null, [ {} ].concat(schema._meta));

	return get(flattened, key);
}

function refDef (name) {
	return { $ref: '#/definitions/' + name };
}

// var inspectU = require('util').inspect;
// function inspect (value) {
// 		console.error(inspectU(value, { colors: true, depth: 10 }));
// }
