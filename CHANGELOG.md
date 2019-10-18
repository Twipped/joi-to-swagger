3.3.0 / 2019-10-18
==================

  * add support to handle custom types via joi.extend (thanks to @qbikez)

3.2.0 / 2019-07-04
==================

  * Use lodash instead of lodash subpackages (thanks to @sabdullahpear)
  * Add Typescript typings (thanks to @Mairu)
  * Fix joi .example() for joi >= 14.x (thanks to @lucasconstantino and @DragFAQ)
  * Add file support (thanks to @qwang1113)

3.1.0 / 2018-12-06
==================

  * Fix for crash when an object property is forbidden, which now works for any data type. (thank you @david-unergie)
  * Ignore a `default()` value when it is a function. (thank you @mmed)
  * Added support for `joi.example()` (thank you @Siilwyn)

3.0.0 / 2018-06-19
==================

  * BREAKING CHANGE: Now only supports node 8.9+ and Joi 13.x
  * BREAKING CHANGE: J2S now outputs a `components` property instead of `definitions`. This contains sub-properties for schemas, properties, etc. By default, any component defined with a `className` meta value will be put into `schemas`. This can be overridden with the `classTarget` meta value.

2.1.0 / 2018-06-19
==================

  * `.label()` values are now parsed into the `title` attribute. (Thank you @jimcatts)

2.0.0 / 2018-04-18
==================

  * BREAKING CHANGE: J2S now outputs for OpenAPI v3 / Swagger 3 specification.
    * Definitions are now targeted for `#/components/schemas/` (Thank you @pato1)
    * Nullable values now output the `nullable: true` attribute instead of passing the non-standard type array. (Thank you @pato1)
    * Regular expressions passed for matching on lower case and uppercase strings now omit opening and closing slashes. (Thank you @h2non)

1.2.0 / 2017-11-06
==================

  * Added support for joi.forbidden() (Thank you @cjnqt)


1.1.1 / 2017-11-01
==================

  * Fixed an undefined function error when an object definition lacked keys (Thank you @zcstarr)
  * Added support for joi.when() (Thank you @buglavere)
