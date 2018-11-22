# Flow Templates

The most advanced feature of FBL is support of EJS templates inside the definitions.

The best way to understand who it works is to review following example in details:

```yaml
version: 1.0.0

pipeline:
  '--': 
  - ctx:  
      local:
        # use local template to pass local_var from "ctx"
        inline: <%- ctx.local_var %>

  # global template processing of array "arr"
  <$ ctx.arr.forEach(i => { $>
  - ctx:
      test_<$- i $>:
        # mix of global and local templates 
        inline: <%- ctx.test + <$- i $> %>
  <$ }); $>
```

As you see in comments there are mentions of "global" and "local" templates.

## Local Templates

Default EJS Delimiter: %

Local templates are processed upon actual execution of a step. This allows to use up-to-date information in shared context that may be modified by previously executed steps.

However, the limitation to that is the template can not be used to generate YAML definition itself. You can bypass that limitation by using [Template Action Handler](plugins/flow.md#action-handler-template) or global handler.

**Pros:**

* Allows to use up-to-date information from shared context

**Cons:**

* Can not be used to self generate YAML definition 

## Global Templates

Default EJS Delimiter: $

Global templates are processed upon flow file loading. As a result they can be used to self generate YAML definition and that is actually the main usecase for them. However, as template processed at loading time shared context snapshot is used at that point.

**Pros:**

* Allows to self generate YAML definition.

**Cons:**

* Can not access up-to-date information from shared context, but only the one available upon file load time.

Note: if you're using [attached flow action handler](plugins/flow.md#action-handler-attached-flow) that used global template - template will be resolved upon loading that file, e.g. when attached flow action gets executed \(not upon main flow loading\), causing template to use shared context snapshot available at that time \(that might be modified by any previous action in main flow\).

## Template Utilities

FBL also provides few handy utility functions you can use inside the template. They all assigned to '$' variable, etc:

```yaml
value: <%- $.escape({}) %>
```

### Escape

```javascript
// If "something" is number or boolean it will be returned without modifications
// If "something" is string and starts with YAML special or reserved character ([] {} > | * & ! % # ` @ ,) it will be wrapped into double quotes.
// if string already contains double quotes they will be escaped
// For any other type "something" will be converted into JSON.    
$.escape(something);
```

Note: JSON is also a valid YAML, so you may want to use it to quickly construct your definitions inside the templates.

### File System

```javascript
// get absolute path
$.fs.getAbsolutePath(path);

// read text file
$.fs.read.text(path);

// read file into base64 encoded string
$.fs.read.base64(path);
```

### UUID

```javascript
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

```javascript
// generate sha256 hash encoded as HEX
$.hash('test');

// generate hash for custom algorithm encoded as HEX
$.hash('test', 'md5');

// generate hash for custom algorithm as Base64
$.hash('test', 'md5', 'base64');
```

