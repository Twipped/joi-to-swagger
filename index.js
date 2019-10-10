'use strict';

var joi = require('joi');
var { find, get, set, merge } = require('lodash');

var patterns = {
	alphanum: '^[a-zA-Z0-9]*$',
	alphanumLower: '^[a-z0-9]*$',
	alphanumUpper: '^[A-Z0-9]*$',
};

var isJoi = function (joiObj) {
	return !!((joiObj && joiObj.isJoi));
};

var hasJoiMeta = function (joiObj) {
	return !!((isJoi(joiObj) && Array.isArray(joiObj._meta)));
};

var getJoiMetaProperty = function (joiObj, propertyName) {

	// get headers added using meta function
	if (isJoi(joiObj) && hasJoiMeta(joiObj)) {

		var joiMeta = joiObj._meta;
		let i = joiMeta.length;
		while (i--) {
			if (joiMeta[i][propertyName]) {
				return joiMeta[i][propertyName];
			}
		}
	}
	return undefined;
};

module.exports = exports = function parse (schema, existingComponents) {
	// inspect(schema);

	if (!schema) throw new Error('No schema was passed.');

	if (typeof schema === 'object' && !schema.isJoi) {
		schema = joi.object().keys(schema);
	}

	if (!schema.isJoi) throw new TypeError('Passed schema does not appear to be a joi schema.');

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

	const type = meta(schema, 'baseType') || schema._type;

	if (parseAsType[type]) {
		swagger = parseAsType[type](schema, existingComponents, components);
	} else {
		throw new TypeError(`${type} is not a recognized Joi type.`);
	}

	if (!swagger) return { swagger, components };

	if (schema._valids && schema._valids.has(null)) {
		swagger.nullable = true;
	}

	if (schema._description) {
		swagger.description = schema._description;
	}

	if (schema._examples.length) {
		if (schema._examples.length === 1) {
			swagger.example = extractExampleValue(schema._examples[0]);
		} else {
			swagger.examples = schema._examples.map(extractExampleValue);
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
		var strict = get(schema, '_settings.convert') === false;

		if (find(schema._tests, { name: 'alphanum' })) {
			if (strict && find(schema._tests, { name: 'lowercase' })) {
				swagger.pattern = patterns.alphanumLower;
			} else if (strict && find(schema._tests, { name: 'uppercase' })) {
				swagger.pattern = patterns.alphanumUpper;
			} else {
				swagger.pattern = patterns.alphanum;
			}
		}

		if (find(schema._tests, { name: 'token' })) {
			if (find(schema._tests, { name: 'lowercase' })) {
				swagger.pattern = patterns.alphanumLower;
			} else if (find(schema._tests, { name: 'uppercase' })) {
				swagger.pattern = patterns.alphanumUpper;
			} else {
				swagger.pattern = patterns.alphanum;
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
			swagger.pattern = pattern.arg.pattern.toString().slice(1, -1);
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
	date: (/* schema */) => ({ type: 'string', format: 'date-time' }),
	boolean: (/* schema */) => ({ type: 'boolean' }),
	alternatives: (schema, existingComponents, newComponentsByRef) => {
		var index = meta(schema, 'swaggerIndex') || 0;

		var matches = get(schema, [ '_inner', 'matches' ]);
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
		var itemsSchema = get(schema, [ '_inner', 'items', index ]);

		if (!itemsSchema) throw Error('Array schema does not define an items schema at index ' + index);

		var items = exports(itemsSchema, merge({}, existingComponents || {}, newComponentsByRef || {}));

		merge(newComponentsByRef, items.components || {});

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
	object: (schema, existingComponents, newComponentsByRef) => {

		var requireds = [];
		var properties = {};

		var combinedComponents = merge({}, existingComponents || {}, newComponentsByRef || {});

		var children = get(schema, '_inner.children') || [];
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

		if (get(schema, '_flags.allowUnknown') === false) {
			swagger.additionalProperties = false;
		}

		return swagger;
	},
	any: (schema) => {
		var swagger = {};
		// convert property to file upload, if indicated by meta property
		if (getJoiMetaProperty(schema, 'swaggerType') === 'file') {
			swagger.type = 'file';
			swagger.in = 'formData';
		}
		if (schema._description) {
			swagger.description = schema._description;
		}
		return swagger;
	},
};

function meta (schema, key) {
	var flattened = Object.assign.apply(null, [ {} ].concat(schema._meta));

	return get(flattened, key);
}

function refDef (type, name) {
	return { $ref: '#/components/' + type + '/' + name };
}

function extractExampleValue (example) {
	return joi.version < '14' ? example : example.value;
}

// var inspectU = require('util').inspect;
// function inspect (value) {
// 		console.error(inspectU(value, { colors: true, depth: 10 }));
// }
