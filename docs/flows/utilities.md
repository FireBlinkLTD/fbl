# Template Utilities

FBL also provides few handy utility functions (JavaScript) you can use inside the template. They all assigned to '\$' variable, so you can use them like this:

```yaml
value: <%- $.hash(ctx.string_field) %>
```

Template utilities just like action handlers are part of plugins. Some plugins may add their own handy functions.

## Default Functions

### File System

All the default action handlers are treating paths as relative to the directory where flow file is located. However in rare
cases 3rd party plugins may not handle this right, to bypass that limitation just use following function to convert path:

```js
// get absolute path
$.fs.getAbsolutePath(path);
```

You may also want to create a relative path based on the directory from where `fbl` command was executed (might be handy for packaged flows):

```js
// get absolute path relative to the working directory of fbl command execution
$.fs.getAbsolutePath(path, cwd);
```

There are also 2 utility functions to read the file. Note: both are not recommended to use, as they block the flow for the time they read the file.
In other words they are blocking entire process and any other actions that are running in parallel will wait till this functions will be resolved.

```js
// read text file
$.fs.read.text(path);

// read file into base64 encoded string
$.fs.read.base64(path);
```

### UUID Generation

Both UUID v4 and v5 are supported.

```js
// generate UUID (v4)
$.UUID.v4();

// generate UUID (v5) for given DNS namespace
$.UUID.v5.DNS('fireblink.com');

// generate UUID (v5) for given URL namespace
$.UUID.v5.URL('http://fireblink.com');

// generate UUID (v5) for custom namespace (should be UUID)
$.UUID.v5.custom('seed', $.UUID.v4());
```

### Hash

Generate hash (as string) for given string.

```js
// generate sha256 hash encoded as HEX
$.hash('test');

// generate hash for custom algorithm encoded as HEX
$.hash('test', 'md5');

// generate hash for custom algorithm as Base64
$.hash('test', 'md5', 'base64');
```

### Assign To

Assign value to context.

```js
// Assing 'value' string to ctx.test field
$.assignTo('$.ctx.test', 'value');

// Assign 'value' to both ctx.c1 and secrets.s2 fields
$.assignTo(
  {
    ctx: '$.c1',
    secrets: '$.s2',
  },
  'value',
);
```

**Note:** first parameter is using same syntax as [common assignTo syntax](../plugins/common.md#assign-to).

### Push To

Assign value to context.

```js
// Push 'value' string to ctx.test field
$.pushTo('$.ctx.test', 'value');

// Push 'value' to both ctx.c1 and secrets.s2 fields
$.pushTo(
  {
    ctx: '$.c1',
    secrets: '$.s2',
  },
  'value',
);
```

**Note:** first parameter is using same syntax as [common assignTo syntax](../plugins/common.md#push-to).

### Assign To / Push To - JSON Schema generation

It might be handy to use `$.assignTo()`/`$.pushTo()` in pair with `$.assignToSchema()`/`$.pushToSchema()` function inside virtual. To generate action like virtual.

```js
$.assignToSchema();
$.pushToSchema();
```

**Virtual Example:**

```yaml
pipeline:
  virtual:
    id: 'ftpo'
    # define parameters schema with generates assignTo and pushTo properties
    parametersSchema:
      type: object
      properties:
        assignTo: <$- JSON.stringify($.assignToSchema()) $>
        pushTo: <$- JSON.stringify($.pushToSchema()) $>
    action:
      fn: |-
        $.assignTo(parameters.assignTo, 'some value');
        $.pushTo(parameters.pushTo, 'some value');
```

### Include another template

Include another file as a template inside the flow.

```js
await $.include('relative/path.ejs');
await $.include('relative/path.ejs', {
  extraParameter: 'value',
});
```

**Example:**

Write to file based on the template that includes another file.

```yaml
pipeline:
  '->':
    path: /tmp/test.txt
    contentFromFile: /tmp/template.ejs
```

_/tmp/template.ejs:_

```
Include: <%- await $.include('fixture.ejs') %>
```

_/tmp/fixture.ejs:_

```
<%- ctx.test %>
```
