# Template Utilities

FBL also provides few handy utility functions (JavaScript) you can use inside the template. They all assigned to '$' variable, so you can use them like this:

```yaml
value: <%- $.escape({}) %>
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

```bash
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