# Sequence Action Handler - "shareParameters" option

`shareParameters` allow to share parameters across child actions instead of creating cloned version to split branches. 

Usage example:

```yaml
# set default parameters
$parameters:
    test: false

'--':
    - fn: |-
        parameters.test = true

    - ctx:
        '$.test': 
            inline: $ref:parameters.test
```

As a result of execution `ctx.test` will have `false` value, ad `--` clones parameters for each of the actions.
Meaning `fn` function that modifies the `parameters` will have no affect on `ctx`.

But, if we add `$shareParameters` metadata, things will change:

```yaml
# set default parameters
$parameters:
    test: false

'--':
  # tell action to share parameters
  shareParameters: true
  actions:
    - fn: |-
        parameters.test = true

    - ctx:
        '$.test': 
            inline: $ref:parameters.test
```

As a result of execution `ctx.test` will now have `true` value. 

**Note:** this is actually an anti-pattern: `parameters` modification is shadowed and might not be obvious. Make sure to use `shareParameters` only when necessary. 