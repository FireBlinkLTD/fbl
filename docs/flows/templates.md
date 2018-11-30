# Flow Templates

The most advanced feature of FBL is support of EJS templates inside the definitions.

The best way to understand how it works is to review following example in details:

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

Local templates are processed upon actual execution of a step. 
This allows to use up-to-date information in shared context that may be modified by previously executed steps.

However, the limitation to that is the template can not be used to generate YAML definition itself.  You can bypass that limitation by using
[Template Action Handler](../plugins/flow.md#action-handler-template) or global handler.

**Pros:**
- Allows to use up-to-date information from shared context

**Cons:**
- Can not be used to self generate YAML definition 

## Global Templates

Default EJS Delimiter: $

Global templates are processed upon flow file loading. As a result they can be used to self generate YAML definition and that is actually the main
usecase for them. However, as template processed at loading time shared context snapshot is used at that point.

**Pros:**
- Allows to self generate YAML definition.

**Cons:**
- Can not access up-to-date information from shared context, but only the one available upon file load time.

Note: if you're using [attached flow action handler](../plugins/flow.md#action-handler-attached-flow) that used global template - 
template will be resolved upon loading that file, e.g. when attached flow action gets executed (not upon main flow loading),
causing template to use shared context snapshot available at that time (that might be modified by any previous action in main flow).

## Passing values by reference

In most cases passing values between actions with EJS template might be an overkill. Especially for complex structures (objects, array).

To avoid unnecessary overhead FBL allows to pass value directly by reference.

```yaml
# pass ctx.field value by reference
field: $ref:ctx.field
```

Reference syntax:
- reference should always start with `$ref:`
- following by `ctx`, `secrets`, `entities` or `parameters`
- following by relative path starting with dot

E.g.

Let's say your context have a following state:

```yaml
ctx: 
  l1:
    l2: 'value'
```

To pass `l2` value by reference you need to use: `$ref:ctx.l1.l2` 

**Note:** FBL does not support referencing nested array elements with paths, only nested object fields.

E.g:

```yaml
ctx: 
  l1:
    - l2: 'value'
```

You can't provide a path to reference `l2` field, but only `l1`, as `l1` is pointing to array. 

## Escaped vs Raw output

EJS template allows to output expression either in raw \(`<%-`\) or escaped variants \(`<%=`\).

FBL overrides default EJS XML escape function with own one to prevent assign strings that may start with special chars: 
{, }, \[, \], |, -, \>, @
  
This helps to prevent issue when unquoted scalar will get generated that may start with special chars and as a result break YAML parsing.