
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
